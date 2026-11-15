# 学生规划文档需求

规格名：`student-planner`。

工作流：先需求，再设计，再任务。准备日期：2026-11-09。

本文用 EARS 写下可检验的行为。每条验收标准都保留英文 EARS 句式，并附中文说明。阶段 1 只实现其中一部分；未实现项在 `tasks.md` 保持未勾选。

系统名称：StudySpec 共享核心，加上消费该核心的「作业救援」和「复习计划」。

## 需求 1：一份可往返的计划文档

作为学生，我希望作业和复习使用同一种 JSON 文档，这样两份应用可以交换同一份计划而不丢失事项。

### 验收标准

1. WHEN a planner document is parsed, THE SYSTEM SHALL accept only schemaVersion `1.0.0` and kind `homework` or `exam-review`.

   当解析计划文档时，系统应只接受 schemaVersion `1.0.0`，以及 kind 为 `homework` 或 `exam-review`。

2. WHEN a document is valid, THE SYSTEM SHALL preserve every item identity, title, estimated minutes, deadline, and priority through parse and serialize.

   当文档有效时，系统应在解析和序列化之后保留每个事项的标识、标题、预计分钟、截止日期和优先级。

3. WHEN the kind is `homework`, THE SYSTEM SHALL require a non-empty course on every item.

   当 kind 为 `homework` 时，系统应要求每个事项都有非空课程名。

4. WHEN the kind is `exam-review`, THE SYSTEM SHALL require a non-empty subject and topic on every item.

   当 kind 为 `exam-review` 时，系统应要求每个事项都有非空科目和主题。

5. WHEN the same valid document is serialized twice, THE SYSTEM SHALL produce the same JSON text, including key order and indentation.

   当同一份有效文档被序列化两次时，系统应产生完全相同的 JSON 文本，包括字段顺序和缩进。

6. WHERE an optional field is absent, THE SYSTEM SHALL omit that key from the serialized JSON instead of writing null.

   在可选字段不存在时，系统应在序列化结果中省略该键，而不是写入 null。

## 需求 2：输入必须先被校验

作为学生，我希望坏掉或过大的 JSON 被拒绝，这样导入不会破坏当前计划。

### 验收标准

1. WHEN the input is not valid JSON, THE SYSTEM SHALL return a failure and no document.

   当输入不是合法 JSON 时，系统应返回失败，并且不返回文档。

2. IF the input exceeds the documented character limit, THEN THE SYSTEM SHALL reject it before use.

   若输入超过文档规定的字符上限，则系统应在使用前拒绝它。

3. IF the root is not a JSON object, or an object contains an unknown field, THEN THE SYSTEM SHALL reject the document and name the path.

   若根节点不是 JSON 对象，或对象含有未知字段，则系统应拒绝该文档并指出路径。

4. IF any object key is `__proto__`, `prototype`, or `constructor`, THEN THE SYSTEM SHALL reject the document.

   若任何对象键是 `__proto__`、`prototype` 或 `constructor`，则系统应拒绝该文档。

5. WHEN dates, integers, identifiers, or text fields violate the documented limits, THE SYSTEM SHALL reject them with a stable error code and a human-readable message.

   当日期、整数、标识或文本超出文档规定的限制时，系统应拒绝它们，并给出稳定错误码和可读说明。

6. WHEN validation succeeds, THE SYSTEM SHALL return a newly built document rather than the original input object.

   当校验成功时，系统应返回新建的文档，而不是原来的输入对象。

## 需求 3：排期确定且不丢工作

作为学生，我希望同样的计划永远排出同样的日程，并且超出容量的工作仍然看得见。

### 验收标准

1. WHEN a valid document is scheduled, THE SYSTEM SHALL place minutes only on dates inside the document horizon and on or before that item's deadline.

   当对有效文档排期时，系统应只把分钟排在文档窗口之内、且不晚于该事项截止日期的日期上。

2. WHEN a date is listed in unavailableDates, THE SYSTEM SHALL give that date zero capacity.

   当某个日期列在 unavailableDates 中时，系统应把该日容量设为 0。

3. WHEN two runs schedule the same document, THE SYSTEM SHALL return the same days, blocks, and unscheduled entries without reading the clock or generating random values.

   当两次运行对同一文档排期时，系统应返回相同的日期、工作块和未排入项，并且不读取时钟、不生成随机值。

4. IF an item cannot be fully placed, THEN THE SYSTEM SHALL keep the remainder in `unscheduled` with the item id, scheduled minutes, unscheduled minutes, and a reason code.

   若某个事项不能完全排入，则系统应把剩余部分放进 `unscheduled`，并带上事项标识、已排分钟、未排分钟和原因代码。

5. WHEN scheduling finishes, THE SYSTEM SHALL account for every estimated minute exactly once, either inside a day block or inside an unscheduled remainder.

   当排期结束时，系统应让每一分钟预计工时恰好出现一次：要么在某一天的工作块里，要么在未排入的剩余里。

6. IF the deadline is earlier than the horizon start, THEN THE SYSTEM SHALL leave the whole item unscheduled with reason `deadline-before-horizon`.

   若截止日期早于窗口开始日，则系统应把整个事项留在未排入中，原因是 `deadline-before-horizon`。

7. IF the horizon has no open day before the deadline, THEN THE SYSTEM SHALL leave the item unscheduled with reason `no-available-day`.

   若截止日期前的窗口里没有可排入的日子，则系统应把事项留在未排入中，原因是 `no-available-day`。

8. IF some minutes fit and some do not, THEN THE SYSTEM SHALL schedule the fitting minutes and mark the rest `insufficient-capacity`.

   若只有一部分分钟排得下，则系统应排入能排下的分钟，并将其余部分标为 `insufficient-capacity`。

## 需求 4：示例数据必须被标明

作为学生，我希望一眼看出哪些是示例，避免把样例当成自己的作业或考试。

### 验收标准

1. WHEN a document is marked sample, THE SYSTEM SHALL require a non-empty sampleLabel.

   当文档被标为示例时，系统应要求非空的 sampleLabel。

2. WHEN an application renders a sample document, THE SYSTEM SHALL show that sampleLabel in the page.

   当应用渲染示例文档时，系统应在页面上显示该 sampleLabel。

3. WHERE the document includes anchorDate, THE SYSTEM SHALL treat it as stored data and SHALL NOT replace it with the computer's current date.

   在文档包含 anchorDate 时，系统应把它当作已存储的数据，不得用电脑当前日期替换它。

## 需求 5：两个应用都消费同一核心

作为学生，我希望作业救援和复习计划是两个独立页面，但排期规则一致。

### 验收标准

1. WHEN the homework application shows its sample, THE SYSTEM SHALL validate that sample with the shared parser and schedule it with the shared scheduler.

   当作业应用展示示例时，系统应使用共享解析器校验该示例，并用共享排期器排期。

2. WHEN the exam-review application shows its sample, THE SYSTEM SHALL use the same parser and scheduler as the homework application.

   当复习应用展示示例时，系统应使用与作业应用相同的解析器和排期器。

3. WHEN a person adds an item through either form, THE SYSTEM SHALL validate the new document before replacing the visible plan.

   当使用者在任一表单添加事项时，系统应先校验新文档，再替换当前可见计划。

4. IF the form input is invalid, THEN THE SYSTEM SHALL keep the previous plan and show the validation messages.

   若表单输入无效，则系统应保留上一份计划，并显示校验说明。

5. WHEN the page is refreshed in stage 1, THE SYSTEM SHALL return to the labelled sample because saving is not implemented.

   在阶段 1 刷新页面时，系统应回到带标记的示例，因为保存尚未实现。

## 需求 6：以后的本地存储和导入导出

作为学生，我希望计划能留在自己的浏览器里，并且存储失败时能看懂原因。此需求在阶段 1 尚未实现，现在只约束以后的行为。

### 验收标准

1. WHEN local saving is implemented, THE SYSTEM SHALL write only a validated document under a documented key that is different for homework and exam review.

   当实现本地保存时，系统应只写入已校验的文档，并且作业和复习使用文档中写明的不同键名。

2. IF the browser throws a quota error while saving, THEN THE SYSTEM SHALL keep the current plan and report `quota-exceeded`.

   若保存时浏览器抛出容量错误，则系统应保留当前计划，并报告 `quota-exceeded`。

3. IF the browser denies storage access, THEN THE SYSTEM SHALL keep the current plan and report `security-error`.

   若浏览器拒绝存储访问，则系统应保留当前计划，并报告 `security-error`。

4. IF stored text is corrupt or fails validation, THEN THE SYSTEM SHALL ignore it as the working plan and report `corrupt-json` or `invalid-document`.

   若已存文本损坏或校验失败，则系统应不把它当作当前计划，并报告 `corrupt-json` 或 `invalid-document`。

5. IF storage fails for any reason, THEN THE SYSTEM SHALL NOT leave the page blank with an uncaught exception.

   若存储因任何原因失败，则系统不得因未捕获异常而变成空白页。

6. WHEN import is implemented, THE SYSTEM SHALL send the selected file text through the same parser used by the sample fixtures.

   当实现导入时，系统应把所选文件文本送进与示例数据相同的解析器。

7. WHEN export is implemented, THE SYSTEM SHALL download the canonical JSON produced by the shared serializer.

   当实现导出时，系统应下载共享序列化器产生的规范 JSON。

## 需求 7：阶段 1 不做的事

作为维护者，我希望规格明确写出边界，避免把骨架说成完整产品。

### 验收标准

1. IF a behavior is listed as future work, THEN THE SYSTEM SHALL document it as incomplete instead of simulating success.

   若某项行为被列为后续工作，则系统应把它写成尚未完成，而不是模拟成功。

2. THE SYSTEM SHALL NOT call a generative model, a paid API, a backend, or an analytics service to create a plan.

   系统不得调用生成式模型、付费 API、后端或统计服务来生成计划。

3. THE SYSTEM SHALL NOT deploy or publish the private preparation draft as a contest submission.

   系统不得把这份私人准备草稿部署或发布成比赛提交。
