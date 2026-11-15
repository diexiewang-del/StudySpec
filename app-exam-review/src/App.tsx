import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  buildSchedule,
  parseStudySpecJson,
  unscheduledReasonLabel,
  validateStudySpec,
  weekdayLabel,
  type StudySpecDocument,
  type ValidationIssue,
} from "@studyspec/core";
import examSample from "@studyspec/core/fixtures/exam-review.sample.json";

interface Draft {
  subject: string;
  topic: string;
  title: string;
  deadline: string;
  minutes: string;
  priority: string;
}

const emptyDraft: Draft = {
  subject: "",
  topic: "",
  title: "",
  deadline: "",
  minutes: "",
  priority: "1",
};

function readSample(raw: unknown): { document: StudySpecDocument | null; errors: ValidationIssue[] } {
  const parsed = parseStudySpecJson(JSON.stringify(raw));
  if (!parsed.ok) return { document: null, errors: parsed.errors };
  return { document: parsed.document, errors: [] };
}

export default function App() {
  const formId = useId();
  const [loaded] = useState(() => readSample(examSample));
  const [doc, setDoc] = useState<StudySpecDocument | null>(loaded.document);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [serial, setSerial] = useState(1);
  const [status, setStatus] = useState("当前显示的是示例数据，只存在于这次打开的页面里。");

  if (!doc) {
    return (
      <main className="page">
        <h1>示例数据没有通过校验</h1>
        <ul>
          {loaded.errors.map((entry) => (
            <li key={`${entry.path}-${entry.code}`}>
              {entry.path}：{entry.message}
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const outcome = buildSchedule(doc);
  const itemIndex = doc.items.length;

  function messagesFor(field: string): string[] {
    return errors
      .filter((entry) => entry.path === `items[${itemIndex}].${field}`)
      .map((entry) => entry.message);
  }

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!doc) return;
    const minutes = /^\d+$/.test(draft.minutes.trim()) ? Number(draft.minutes.trim()) : Number.NaN;
    const priority = /^\d+$/.test(draft.priority.trim()) ? Number(draft.priority.trim()) : Number.NaN;
    const next: StudySpecDocument = {
      ...doc,
      items: [
        ...doc.items,
        {
          id: `rev-added-${serial}`,
          title: draft.title,
          estimatedMinutes: minutes,
          deadline: draft.deadline,
          priority,
          subject: draft.subject,
          topic: draft.topic,
        },
      ],
    };
    const validated = validateStudySpec(next);
    if (!validated.ok) {
      setErrors(validated.errors);
      setStatus("没有加入。请按提示修改。上一份复习计划还在。");
      return;
    }
    setDoc(validated.document);
    setSerial((current) => current + 1);
    setDraft(emptyDraft);
    setErrors([]);
    setStatus("已加入这次页面状态。浏览器里还没有保存。");
  }

  function restoreSample() {
    const again = readSample(examSample);
    if (!again.document) return;
    setDoc(again.document);
    setDraft(emptyDraft);
    setSerial(1);
    setErrors([]);
    setStatus("已恢复示例数据。刷新页面也会回到这份示例，因为保存还没有实现。");
  }

  return (
    <div className="page">
      <a className="skip" href="#main">
        跳到内容
      </a>
      <header className="top">
        <div>
          <p className="eyebrow">StudySpec · 复习计划</p>
          <h1>复习计划</h1>
          <p className="lede">
            按考试日期把每个主题排进还能复习的日子。排不完的分钟留在「未排入」，方便决定是减少内容还是增加时间。
          </p>
        </div>
        <p className="version">
          文档版本 {doc.schemaVersion}
          <br />
          类型 {doc.kind}
          <br />
          共享核心排期
        </p>
      </header>

      {doc.meta.sample ? (
        <p className="banner" role="status">
          {doc.meta.sampleLabel}。锚点日期 {doc.meta.anchorDate} 写在样例里，页面不读取电脑时钟。
        </p>
      ) : null}

      <main id="main">
        <h2>{doc.meta.title}</h2>
        <p className="quiet">
          复习窗口 {doc.horizon.start} 至 {doc.horizon.end}。每天最多 {doc.capacity.minutesPerDay} 分钟。
          {doc.capacity.unavailableDates.length > 0
            ? `不可用日期：${doc.capacity.unavailableDates.join("、")}。`
            : "没有不可用日期。"}
          日期按 YYYY-MM-DD 原样显示。
        </p>

        {outcome.ok ? (
          <>
            <dl className="stats">
              <div>
                <dt>主题</dt>
                <dd>{doc.items.length}</dd>
              </div>
              <div>
                <dt>预计分钟</dt>
                <dd>{outcome.schedule.totalEstimatedMinutes}</dd>
              </div>
              <div>
                <dt>已排入</dt>
                <dd>{outcome.schedule.totalScheduledMinutes}</dd>
              </div>
              <div>
                <dt>未排入</dt>
                <dd>{outcome.schedule.totalUnscheduledMinutes}</dd>
              </div>
            </dl>

            <section className="unscheduled" aria-labelledby="unsched-heading">
              <h2 id="unsched-heading">未排入</h2>
              {outcome.schedule.unscheduled.length === 0 ? (
                <p>这次排期没有未排入的复习。</p>
              ) : (
                <ul>
                  {outcome.schedule.unscheduled.map((entry) => (
                    <li key={entry.itemId}>
                      <strong>{entry.title}</strong>
                      <span>
                        还剩 {entry.unscheduledMinutes} 分钟没有位置，已经排入 {entry.scheduledMinutes} 分钟。
                        {unscheduledReasonLabel(entry.reason)}。
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="topic-heading">
              <h2 id="topic-heading">主题</h2>
              <ol className="topics">
                {doc.items.map((item) => (
                  <li key={item.id}>
                    <div>
                      <h3>{item.topic ?? item.title}</h3>
                      <p>
                        {item.subject} · 日程标题「{item.title}」
                      </p>
                    </div>
                    <p>
                      考试或截止 {item.deadline} {weekdayLabel(item.deadline)}
                      <br />
                      {item.estimatedMinutes} 分钟 · 优先级 {item.priority}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="days-heading">
              <h2 id="days-heading">每日复习块</h2>
              <div className="days">
                {outcome.schedule.days.map((day) => (
                  <article key={day.date}>
                    <h3>
                      {day.date}
                      <span>{weekdayLabel(day.date)}</span>
                    </h3>
                    <p>
                      容量 {day.capacityMinutes} 分钟
                      <br />
                      已排 {day.assignedMinutes} 分钟
                    </p>
                    {day.blocks.length === 0 ? (
                      <p className="quiet">这一天没有排入</p>
                    ) : (
                      <ul>
                        {day.blocks.map((block) => (
                          <li key={`${day.date}-${block.itemId}`}>
                            {block.title} · {block.minutes} 分钟
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <form onSubmit={onSubmit} noValidate>
              <h2>添加一个复习主题</h2>
              <p>新主题只留在这次页面状态里。刷新或恢复示例都会丢掉它。</p>
              {errors.length > 0 ? (
                <div role="alert">
                  <p>还有没通过校验的内容。</p>
                  <ul>
                    {errors.map((entry) => (
                      <li key={`${entry.path}-${entry.code}`}>
                        {entry.path}：{entry.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="fields">
                <Field id={`${formId}-subject`} label="科目" error={messagesFor("subject")[0]}>
                  <input
                    id={`${formId}-subject`}
                    value={draft.subject}
                    onChange={(event) => updateDraft("subject", event.target.value)}
                    autoComplete="off"
                    aria-invalid={messagesFor("subject").length > 0}
                  />
                </Field>
                <Field id={`${formId}-topic`} label="主题" error={messagesFor("topic")[0]}>
                  <input
                    id={`${formId}-topic`}
                    value={draft.topic}
                    onChange={(event) => updateDraft("topic", event.target.value)}
                    autoComplete="off"
                    aria-invalid={messagesFor("topic").length > 0}
                  />
                </Field>
                <Field id={`${formId}-title`} label="日程标题" error={messagesFor("title")[0]}>
                  <input
                    id={`${formId}-title`}
                    value={draft.title}
                    onChange={(event) => updateDraft("title", event.target.value)}
                    autoComplete="off"
                    aria-invalid={messagesFor("title").length > 0}
                  />
                </Field>
                <Field id={`${formId}-deadline`} label="考试日期" error={messagesFor("deadline")[0]}>
                  <input
                    id={`${formId}-deadline`}
                    type="date"
                    value={draft.deadline}
                    onChange={(event) => updateDraft("deadline", event.target.value)}
                    aria-invalid={messagesFor("deadline").length > 0}
                  />
                </Field>
                <Field id={`${formId}-minutes`} label="预计分钟" error={messagesFor("estimatedMinutes")[0]}>
                  <input
                    id={`${formId}-minutes`}
                    inputMode="numeric"
                    value={draft.minutes}
                    onChange={(event) => updateDraft("minutes", event.target.value)}
                    aria-invalid={messagesFor("estimatedMinutes").length > 0}
                  />
                </Field>
                <Field id={`${formId}-priority`} label="优先级" error={messagesFor("priority")[0]}>
                  <select
                    id={`${formId}-priority`}
                    value={draft.priority}
                    onChange={(event) => updateDraft("priority", event.target.value)}
                  >
                    <option value="1">1，最先排</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </Field>
              </div>
              <div className="actions">
                <button type="submit">加入页面</button>
                <button type="button" className="secondary" onClick={restoreSample}>
                  恢复示例数据
                </button>
              </div>
            </form>
          </>
        ) : (
          <div role="alert">
            <p>这份计划没有排期。</p>
            <ul>
              {outcome.errors.map((entry) => (
                <li key={`${entry.path}-${entry.code}`}>
                  {entry.path}：{entry.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="status" role="status">
          {status}
        </p>
        <section className="scope" aria-labelledby="scope-heading">
          <h2 id="scope-heading">这个页面现在做了什么</h2>
          <ul>
            <li>示例 JSON 先经过共享的 parseStudySpecJson，日程来自 buildSchedule。</li>
            <li>添加主题只会改变本次页面状态，并通过同一套校验。</li>
          </ul>
          <h3>还没做</h3>
          <ul>
            <li>浏览器本地存储</li>
            <li>JSON 文件导入和导出</li>
            <li>修改、删除和调整每天的容量</li>
            <li>按章节继续拆分主题</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
