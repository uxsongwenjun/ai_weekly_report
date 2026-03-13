# OpenClaw CLI 操作标准和规范

## 1. 适用范围

本文档适用于当前项目 `ai-weekly-report` 中由 OpenClaw 触发或调用的 CLI 工具，覆盖以下脚本：

- `node tools/check-status.js`
- `node tools/generate-week.js`
- `node tools/collect-rss.js`
- `node tools/collect-github.js`
- `node tools/collect-skillsmp.js`
- `node tools/process-data.js`
- `node tools/publish-week.js`
- `node tools/update-item.js`

目标是统一 OpenClaw 在手动执行、定时执行、补录修复、状态排查时的调用方式、输出标准和操作边界。

## 2. 总体原则

### 2.1 执行原则

1. 所有命令必须在项目根目录执行。
2. 默认优先使用已有脚本，不允许绕过 CLI 直接手改数据库，除非属于“数据源管理/紧急修复”且已明确授权。
3. 能走全流程时优先走 `generate-week.js`，只在排障或补录时使用分步命令。
4. 涉及发布状态变更时，必须显式指定 `--week`，避免误发当前周之外的数据。
5. OpenClaw 调用 CLI 时，应以“脚本退出码 + JSON 输出”作为成功失败判断依据，不应依赖自然语言日志。

### 2.2 安全原则

1. 修改类命令只允许改动目标记录，不允许批量 SQL 直写替代 CLI。
2. `update-item.js` 仅允许更新脚本白名单字段，不得扩展到任意字段写入。
3. 发布命令只能在处理完成且目标周数据已确认后执行。
4. 生产环境执行前，必须确认 `.env.local` 或环境变量已正确加载。
5. 遇到 API 限流、AI 调用失败、周标识错误时，应立即中止当前流程并保留错误输出。

## 3. 运行前检查

每次由 OpenClaw 执行 CLI 前，至少完成以下检查：

```bash
node tools/check-status.js
```

检查项：

1. `DATABASE_PATH` 可用，数据库文件存在且可写。
2. `ANTHROPIC_API_KEY` 已配置后，才允许执行 `process-data.js` 的 AI 模式。
3. `GITHUB_TOKEN` 未配置时允许执行，但应接受 GitHub API 限流风险。
4. 当前周标识使用 `YYYY-WNN` 格式，例如 `2026-W10`。
5. `raw_items`、`weeks`、`items` 表结构已初始化。

推荐环境变量：

```env
DATABASE_PATH=./data/weekly.db
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
API_KEY=your-api-key
```

## 4. 标准操作流程

### 4.1 标准全流程

适用场景：定时更新、人工触发“生成本期/更新周报”。

```bash
node tools/generate-week.js --week 2026-W10
```

规范要求：

1. 默认推荐使用该命令作为周报生产主入口。
2. 未传 `--week` 时脚本会自动计算当前周，但生产环境建议显式传入，避免跨时区或误判。
3. 脚本内部标准顺序为：
   - `collect-rss.js`
   - `collect-github.js`
   - `collect-skillsmp.js`（失败可跳过）
   - `process-data.js`
   - `publish-week.js`
4. 成功时以 stdout 输出单个 JSON 对象。
5. 失败时应以非零退出码结束。

### 4.2 分步执行

适用场景：排查单步失败、限流重试、只更新某一阶段。

```bash
node tools/collect-rss.js --max-age 7 --limit 30
node tools/collect-github.js --days 7
node tools/collect-skillsmp.js
node tools/process-data.js --week 2026-W10
node tools/publish-week.js --week 2026-W10
```

规范要求：

1. 分步执行时必须按依赖顺序运行，不能跳过数据处理直接发布。
2. 若采集阶段失败，不得继续执行发布。
3. 若 `process-data.js` 失败，必须先修复问题，再决定是否重跑 `--force`。
4. 分步执行完成后，应再执行一次 `check-status.js` 复核状态。

### 4.3 单条修复

适用场景：修正文案、排序、图片地址、AI 解读。

```bash
node tools/update-item.js --id 123 --field ai_detail --value "新的解读内容"
```

允许更新字段：

- `title`
- `summary`
- `highlight`
- `ai_summary`
- `ai_detail`
- `tags`
- `heat_data`
- `sort_order`
- `image_url`
- `logo_url`

规范要求：

1. 必须同时提供 `--id`、`--field`、`--value`。
2. 不允许更新白名单之外字段。
3. 修改前应确认目标 `id` 和字段含义，避免误覆盖。
4. 文案修复属于局部变更，不得借此触发整周重新发布，除非用户明确要求。

## 5. 参数与输入规范

### 5.1 周标识

统一格式：

```text
YYYY-WNN
```

示例：

```text
2026-W10
2026-W11
```

要求：

1. `YYYY` 为四位年份。
2. `WNN` 为两位周序号，必须补零。
3. 不允许使用 `2026-10`、`2026/W10`、`W10-2026` 等非标准格式。

### 5.2 命令参数

推荐只使用脚本已实现的参数：

- `generate-week.js`
  - `--week <YYYY-WNN>`
- `collect-rss.js`
  - `--max-age <days>`
  - `--limit <count>`
  - `--dry-run`
- `collect-github.js`
  - `--days <days>`
- `process-data.js`
  - `--week <YYYY-WNN>`
  - `--no-ai`
  - `--force`
- `publish-week.js`
  - `--week <YYYY-WNN>`
- `update-item.js`
  - `--id <number>`
  - `--field <allowed_field>`
  - `--value <string>`

规范要求：

1. 不允许传入脚本未定义参数作为“约定扩展”。
2. 对会变更数据的命令，参数必须完整显式给出。
3. `--force` 只用于明确需要重处理既有数据的场景。
4. `--no-ai` 仅用于降级运行或 AI 服务不可用时的兜底处理。

## 6. 输出与日志规范

### 6.1 标准输出

CLI 成功时，stdout 必须输出 JSON；OpenClaw 只解析 JSON 主体，不依赖 stderr 文案。

成功示例：

```json
{ "ok": true, "weekId": "2026-W10", "results": { "rss": {}, "github": {}, "process": {}, "publish": {} } }
```

失败示例：

```json
{ "ok": false, "error": "错误信息" }
```

### 6.2 日志原则

1. 进度日志可写入 stderr。
2. 机器可读结果写 stdout。
3. 失败时必须返回非零退出码。
4. OpenClaw 应优先记录原始错误 JSON，禁止只保留“执行失败”四字。

## 7. 推荐操作标准

### 7.1 定时任务

标准 crontab：

```cron
0 9 * * 5  cd /path/to/ai-weekly-report && node tools/generate-week.js >> /var/log/weekly-report.log 2>&1
```

要求：

1. 定时任务统一调用 `generate-week.js`。
2. 日志必须重定向到固定文件，便于排障。
3. 周期性任务应运行在固定目录，不允许依赖不确定相对路径。

### 7.2 手动补跑

适用场景：上次定时任务失败、发布后发现内容缺失。

推荐顺序：

```bash
node tools/check-status.js
node tools/generate-week.js --week 2026-W10
node tools/check-status.js
```

### 7.3 降级运行

当 AI 服务不可用但仍需完成基础筛选时，可执行：

```bash
node tools/process-data.js --week 2026-W10 --no-ai
```

要求：

1. 降级执行必须在记录中注明“本期为非 AI 完整处理结果”。
2. 后续若 AI 服务恢复，可在确认后再使用 `--force` 重处理。

## 8. 禁止事项

以下操作不符合标准：

1. 未检查状态直接执行发布。
2. 直接修改 SQLite 表替代 `update-item.js`。
3. 在不确认目标周的情况下使用自动周计算执行生产发布。
4. 在采集失败或处理失败后继续调用 `publish-week.js`。
5. 把 stderr 的进度日志当成成功结果。
6. 通过自定义参数调用脚本未实现的能力。
7. 对同一周频繁执行 `--force`，导致结果不可追溯。

## 9. 异常处理规范

### 9.1 常见错误与处理

1. `ANTHROPIC_API_KEY not set`
   - 处理：补齐环境变量，或改用 `--no-ai` 降级执行。
2. `GitHub API 403` 或限流
   - 处理：检查 `GITHUB_TOKEN`，必要时稍后重试。
3. `--week required`
   - 处理：按 `YYYY-WNN` 重新传参。
4. `Week 'xxxx' not found`
   - 处理：先确认该周是否已在处理阶段生成。
5. `Item <id> not found`
   - 处理：先核对目标记录是否存在，再执行单条修复。

### 9.2 中断原则

遇到以下情况必须立即中断流程：

1. 数据库不可读写。
2. 返回非 JSON 或 JSON 结构明显异常。
3. 目标周不存在但命令试图发布。
4. 修改类命令的目标参数不明确。

## 10. OpenClaw 调用建议

若由 OpenClaw 作为执行代理，建议遵循以下约定：

1. 先执行 `check-status.js` 获取上下文。
2. 根据任务类型选择“全流程 / 分步 / 单条修复”三类模式之一。
3. 每次只发起一个明确目标命令，等待 JSON 结果后再进入下一步。
4. 读取 stdout 的 JSON 作为结构化结果。
5. 把 stderr 作为日志展示，不作为业务成功依据。
6. 失败时把原始 `error` 字段返回给调用方。

## 11. 标准命令清单

```bash
# 查看状态
node tools/check-status.js

# 全流程生成
node tools/generate-week.js --week 2026-W10

# 分步采集
node tools/collect-rss.js --max-age 7 --limit 30
node tools/collect-github.js --days 7
node tools/collect-skillsmp.js

# 数据处理
node tools/process-data.js --week 2026-W10
node tools/process-data.js --week 2026-W10 --no-ai
node tools/process-data.js --week 2026-W10 --force

# 发布
node tools/publish-week.js --week 2026-W10

# 单条修复
node tools/update-item.js --id 123 --field ai_detail --value "新的解读内容"
```

## 12. 结论

对于当前项目，OpenClaw CLI 的标准用法可以归纳为一句话：

先检查状态，优先全流程，分步仅用于排障，修改必须走白名单字段，发布必须显式指定目标周，并始终以 JSON 输出和退出码作为唯一执行依据。
