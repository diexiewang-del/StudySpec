# Hook 候选

`local-typecheck-after-core-save.json` 是按 2026-11-09 从 kiro.dev 公开文档读到的 v1 结构写下的候选文件。

- 文档页面：`https://kiro.dev/docs/hooks/` 与 `https://kiro.dev/docs/ide/whats-new-v1/hooks/`。
- `version` 为 `v1`，`trigger` 使用文档表格中的 `PostFileSave`。
- `enabled` 为 `false`。按同一页的字段说明，这表示跳过该 hook，不会自动执行。
- 命令是仓库根目录的 `npm run typecheck`。它只做本地类型检查，不推送、不部署、不发布、不访问网络。
- 这次准备没有打开 Kiro，也没有加载或运行该文件。Kiro 是否接受这份 JSON，仍然待验证。
- 它不是 Kiro 或 Crew 的使用记录。
