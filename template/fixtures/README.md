# 示例数据

这两个 JSON 文件是共享夹具，不是某位学生的真实计划。

- `homework.sample.json`：作业救援使用。`sampleLabel` 为「示例数据 · 非真实作业」。
- `exam-review.sample.json`：复习计划使用。`sampleLabel` 为「示例数据 · 非真实考试安排」。

`meta.anchorDate` 固定写成 `2026-11-09`，用来标明这份样例的计划锚点。排期不读取电脑时钟，也不把锚点当成“今天”去推算。

两份文件都故意包含排不进每日容量的分钟。应用必须把这些分钟显示在「未排入」里。

应用应把文件文本交给 `parseStudySpecJson`，不要直接信任导入对象的类型。
