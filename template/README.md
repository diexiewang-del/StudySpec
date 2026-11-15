# @studyspec/core

作业救援和复习计划共用的 TypeScript 核心。应用通过 workspace 包名引用这里的源码。

## 公开入口

| 导出 | 作用 | 阶段 1 |
| --- | --- | --- |
| `parseStudySpecJson` | 导入接口。校验 JSON 字符串，失败时返回错误，不产生文档。 | 已实现，没有文件选择界面 |
| `validateStudySpec` | 校验未知对象并返回新建文档。 | 已实现 |
| `serializeStudySpec` | 导出接口。成功时返回规范 JSON 文本。 | 已实现，没有下载界面 |
| `buildSchedule` | 按窗口、容量和截止日期排期。排不完的分钟在 `unscheduled`。 | 已实现 |
| `createUnimplementedLocalStore` | 计划中的浏览器存储接口。 | 固定返回 `not-implemented` |
| `PLANNED_STORAGE_KEYS` | 以后作业和复习要使用的不同键名。 | 只是常量，没有读写 |

类型以 `src/types.ts` 为准。示例 JSON 在 `fixtures/`。

排期不调用当前时间、时区偏移或随机数。日期是 `YYYY-MM-DD` 字符串。
