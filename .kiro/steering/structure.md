# StudySpec 目录约定

准备日期：2026-11-09。

```text
.kiro/                         规格与导向。不是 Kiro 已经执行过的证据。
  steering/                    产品、技术、目录约定
  specs/student-planner/       需求、设计、任务
  hooks/                       禁用的 hook 候选。未在 Kiro 中运行
template/                      唯一的共享核心
  fixtures/                    两个应用共用的示例 JSON
  src/                         类型、校验、序列化、排期、未实现的存储接口
app-homework/                  作业救援。独立的 Vite 应用
app-exam-review/               复习计划。独立的 Vite 应用
docs/                          使用证据说明和阶段验收
```

## 依赖方向

- `app-homework` 和 `app-exam-review` 只能通过 `@studyspec/core` 使用共享逻辑。
- 两个应用不互相导入组件、样式或页面状态。
- `template` 不导入任何一个应用。
- 示例 JSON 放在 `template/fixtures/`。应用把文件内容交给 `parseStudySpecJson`，不信任未经校验的对象。

## 数据与界面

- 共享文档的 TypeScript 类型以 `template/src/types.ts` 为准。
- 计划中的两把浏览器存储键名写在 `template/src/storage.ts`，阶段 1 不使用它们。
- 作业界面展示课程字段。复习界面展示科目和主题。排期算法不理解这两个业务词，只使用共用的分钟、截止日期和优先级。

## 不要提前放进来的东西

- 不建后端目录。
- 不建部署配置。GitHub Pages 尚未授权。
- 不把 `node_modules/`、`dist/`、缓存、`.env` 或密钥交出去。
- 不忽略 `.kiro/`。
