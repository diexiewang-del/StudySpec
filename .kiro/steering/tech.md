# StudySpec 技术约定

准备日期：2026-11-09。

## 技术栈

- React 与 TypeScript，用 Vite 构建两个独立应用。
- 共享核心是 workspace 包 `@studyspec/core`，应用直接引用它的 TypeScript 源码。
- 测试使用 Node 自带的 `node:test`，不另加测试框架。
- 计划中的 MVP 使用浏览器本地存储和 JSON 导入导出。阶段 1 只定义接口并明确返回「尚未实现」，不读写浏览器存储。

## 确定性

- 日历日期是字符串 `YYYY-MM-DD`。
- 日期加减只使用 `Date.UTC` 和 UTC 的年月日字段，用来判断公历是否真实存在。
- 禁止在核心和两个应用里使用 `Date.now`、`getTimezoneOffset`、`Math.random`、`crypto.randomUUID` 或性能时钟来决定结果。
- 排序的平局规则写在数据里：先按截止日期升序，再按优先级数字升序（1 先排），再按 `id` 的 UTF-16 码元升序。
- 计划窗口来自文档的 `horizon`，不从电脑当前日期推导。

## 输入安全

- 先限制 JSON 字符数，再 `JSON.parse`。
- 拒绝 BOM、非对象根节点、未知字段，以及名为 `__proto__`、`prototype`、`constructor` 的字段。
- 解析结果是逐项复制出来的新对象，不把输入对象交给界面继续持有。
- 字符串去掉首尾空白；标题不允许控制字符；备注只额外允许换行。
- 数字必须是有限整数，并且落在规格写明的范围内。

## 容量

- `capacity.minutesPerDay` 是每一天的上限。
- `unavailableDates` 当天容量为 0。
- 事项只能排在窗口内、且不晚于自己的截止日期的日子。
- 排不下的分钟数必须出现在结果的 `unscheduled` 里，并带稳定的原因代码。

## 工程命令

在仓库根目录：

- `npm test`：共享核心的单元测试。
- `npm run typecheck`：核心和两个应用的类型检查。
- `npm run build`：类型检查后构建两个应用。
- `npm run dev:homework` 与 `npm run dev:exam`：本地预览。阶段 1 的验收不依赖开发服务器一直开着。

## 依赖边界

- 不增加认证、数据库、统计、生成式 SDK 或付费服务。
- 不把密钥、`.env` 或 MCP 凭据放进仓库。
- `.kiro/` 必须进入版本库，不能写进 `.gitignore`。
