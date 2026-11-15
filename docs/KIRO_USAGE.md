# Kiro 与 Crew 的使用情况

准备日期：2026-11-09。

## 结论

没有 Kiro 或 Kiro Crew 的实际使用证据。

这次骨架是 Cursor 云端准备流程写成的。它不能当作 Kiro 已经参与设计、写代码或跑过任务的证明。仓库里也没有 Kiro 使用日志、Crew 对话、配额消耗或账号登录记录。这些材料不能事后编造。

Google 登录 Kiro、创建 Crew，都还停在计划，没有执行。

## 已经放进仓库的 `.kiro` 材料

这些文件是给以后可能使用的 Kiro 准备的规格，不是 Kiro 生成或执行的产物：

- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/specs/student-planner/requirements.md`
- `.kiro/specs/student-planner/design.md`
- `.kiro/specs/student-planner/tasks.md`
- `.kiro/hooks/local-typecheck-after-core-save.json`
- `.kiro/hooks/README.md`

`tasks.md` 里勾选的项目，只表示阶段 1 的代码和测试已经做完相应骨架。勾选不是 Kiro 自动更新的任务状态。

## Hook

2026-11-09 对照了两份公开文档：

- <https://kiro.dev/docs/hooks/>
- <https://kiro.dev/docs/ide/whats-new-v1/hooks/>

候选文件使用文档中的 `version: "v1"`、`trigger: "PostFileSave"` 和 `enabled: false`。`enabled: false` 在文档里的意思是跳过该 hook，不删除文件。

命令是 `npm run typecheck`。它只做本地类型检查，不推送、不部署、不发布、不访问网络。

这份 JSON 没有在 Kiro IDE 或 Kiro CLI 中打开、加载或运行。文档格式已经对照过；Kiro 是否接受该文件，仍然待验证。不要把它写成已经生效的自动化。

## 以后如果真的使用

只有在本人打开 Kiro、用自己的账号执行任务之后，才能补充使用记录。记录应包含真实日期、执行了哪一条任务，以及 `tasks.md` 的实际变化。在那之前，保持本文件的结论不变。

Social 渠道计划使用 X。账号、发帖和法律姓名都还没有，不能提前写成已经完成。
