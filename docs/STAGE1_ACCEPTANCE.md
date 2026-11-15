# 阶段 1 验收记录

记录时间：2026-11-09T16:12:07Z。

本文件只写这次准备里实际跑过的命令和看到的结果。没有补写未发生的测试、指标或 Kiro 使用记录。

环境：Node.js `v22.23.4`，npm `10.9.9`。命令在仓库根目录执行，除非另行注明。

## 范围

这一阶段交付的是规格、共享核心和两个能构建的中文界面壳。

已经核对：

- 共享类型、JSON 校验、规范序列化、确定性排期和示例夹具
- 16 个 `node:test` 用例
- 两个应用的类型检查和生产构建
- 两个构建页面上的示例标记、未排入工作和表单状态

没有做，也不要算作完成：

- 浏览器本地存储的真实读写
- JSON 文件导入导出按钮
- 修改、删除、调整每日容量、子任务拆分
- 公开 GitHub、部署、报名、演示视频、博客、X、Devpost、Crew 或 Kiro 实际执行

## 命令与结果

### 1. 安装依赖

```text
npm install
```

结果：退出码 0。`added 31 packages, and audited 35 packages`。`found 0 vulnerabilities`。生成了根目录 `package-lock.json`。没有运行会改写依赖树的额外审计。

### 2. 共享核心测试

第一次在 `template/` 目录直接运行：

```text
node --test src/dates.test.ts src/validate.test.ts src/schedule.test.ts src/storage.test.ts src/source-guards.test.ts
```

结果：退出码 0。`# tests 16`，`# pass 16`，`# fail 0`，`duration_ms 197.582438`。

之后从根目录再跑：

```text
npm test
```

结果：退出码 0。同样 16 项通过，`duration_ms 187.994622`。覆盖示例夹具、危险 JSON、往返序列化、手算排期、分钟守恒、未实现存储，以及生产源码不含 `Date.now`、随机数和浏览器存储调用。

### 3. 类型检查与构建

第一次：

```text
npm test && npm run typecheck && npm run build
```

测试通过后，类型检查失败，退出码 1。`app-homework` 的 `tsc -b` 报告：

```text
src/App.tsx(70,11): error TS2322: Type '{ schemaVersion?: "1.0.0" | undefined; ... items: PlannerItem[]; }' is not assignable to type 'StudySpecDocument'.
src/App.tsx(73,12): error TS18047: 'doc' is possibly 'null'.
```

这是表单回调里对可能为空的计划做了展开。修复是在两个应用的提交函数开头加上 `if (!doc) return;`。这是这次构建失败后的一次修复，没有改排期规则。

修复后：

```text
npm run typecheck && npm run build
```

结果：退出码 0。

- `@studyspec/core`：`tsc -p tsconfig.json --noEmit` 通过
- `@studyspec/app-homework`：`tsc -b` 通过，随后 Vite `v8.3.7` 构建成功。`dist/index.html` 0.64 kB，CSS 3.28 kB，JS 239.56 kB
- `@studyspec/app-exam-review`：`tsc -b` 通过，Vite 构建成功。`dist/index.html` 0.63 kB，CSS 3.42 kB，JS 239.44 kB

构建没有启动文件监视。

### 4. 页面核对

用根脚本启动两个预览服务器，没有使用开发监视模式：

```text
npm run preview:homework
npm run preview:exam
```

2026-11-09T16:12:07Z 再次请求时，`http://127.0.0.1:43123/` 与 `http://127.0.0.1:43124/` 都返回 HTTP 200。验收结论不依赖这两个进程一直留着。

Headless Chrome 打开构建页面后，初始文本里确认：

- 作业救援包含「示例数据 · 非真实作业」，以及「数据结构实验报告」和「未排入 60 分钟」
- 复习计划包含「示例数据 · 非真实考试安排」，以及「不定积分」和「还剩 110 分钟」

桌面与 390 像素宽的整页截图已保存。窄屏截图里，示例横幅、统计、未排入列表和表单按单列排列。

随后在同一浏览器里操作页面：

- 作业救援空表单提交后，页面保留原有 3 条示例，并显示「不能为空。」「必须是整数。」和非法日期说明。
- 填入课程「离散数学」、标题「图论作业」、截止日期 `2026-11-08`、45 分钟后，页面变为 4 条、预计 525 分钟、已排入 420 分钟、未排入 105 分钟。新作业出现在未排入中，原因是「截止日期早于计划窗口」。原来的实验报告仍在。
- 点击「恢复示例数据」后，状态变为「已恢复示例数据」，「图论作业」消失，实验报告仍在。
- 复习计划空表单提交后，显示科目、主题、标题、日期和分钟的校验错误，原有主题还在。
- 填入科目「大学物理」、主题和日程标题「动量守恒」、考试日期 `2026-11-13`、40 分钟后，主题列表出现该条，状态为「已加入这次页面状态」。

这些操作只改变当次页面内存。没有读写浏览器存储。

## 仍未实现

`createUnimplementedLocalStore()` 对读取和保存都返回 `not-implemented`。页面上写了这一点。导入和导出函数可以被测试调用，两个应用都还没有文件按钮。`tasks.md` 第 10 到 20 项保持未勾选。

## Kiro 与发布

`.kiro/` 已写入仓库，没有放进 `.gitignore`。其中的 hook 按 2026-11-09 读到的 kiro.dev 文档写成 `version: "v1"`，并且 `enabled` 为 `false`。没有在 Kiro 或 Crew 中加载或运行。因此不能把它当成使用证据。

没有创建公开 GitHub 仓库，没有部署，没有打开 pull request，没有提交比赛材料。`SUBMITTED.md` 全部未勾选。
