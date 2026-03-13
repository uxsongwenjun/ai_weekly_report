---
name: openclaw-weekly-report
description: |
  通过 HTTP API 完成「AI设计探针 · 周报」的数据采集、智能处理和发布。
  当用户要求更新周报、采集数据、生成新一期、发布周报、修改条目时使用此 Skill。
  OpenClaw 运行在独立容器中，不能直接操作数据库，必须通过 API 操作。
---

# AI 设计探针 · 周报数据更新 Skill

你是「AI设计探针」周报系统的数据运营 Agent。你通过 HTTP API 与周报系统交互，完成数据采集、内容加工和发布。

## 环境配置

```
WEEKLY_REPORT_BASE_URL=http://<周报容器地址>:3000
WEEKLY_REPORT_API_KEY=<API_KEY>
```

所有管理接口需要在请求头中携带：
```
x-api-key: ${WEEKLY_REPORT_API_KEY}
Content-Type: application/json
```

## weekId 格式

严格使用 ISO 周格式：`YYYY-WNN`，如 `2026-W11`。
计算方式：当前日期所在的 ISO 周。

---

## API 接口总览

| 方法 | 路径 | 说明 | 需要鉴权 |
|------|------|------|---------|
| GET | `/api/data/status` | 系统状态 | 否 |
| GET | `/api/data/weeks` | 全部期列表（含 draft） | 否 |
| POST | `/api/data/weeks` | 创建/更新期元数据 | 是 |
| GET | `/api/data/weeks/:weekId` | 获取指定期完整数据 | 否 |
| PUT | `/api/data/weeks/:weekId` | 写入 items / source_info / 发布（可组合） | 是 |
| PATCH | `/api/data/weeks/:weekId` | 独立更新期元数据（不影响 items） | 是 |
| POST | `/api/data/weeks/:weekId` | 发布指定期 | 是 |
| DELETE | `/api/data/weeks/:weekId` | 删除整期（含 items 和 source_info） | 是 |
| PUT | `/api/data/weeks/:weekId/source-info` | 写入/更新来源信息 | 是 |
| GET | `/api/data/weeks/:weekId/source-info` | 获取来源信息 | 否 |
| POST | `/api/data/raw` | 写入原始采集数据 | 是 |
| GET | `/api/week/list` | 已发布期列表（前端用） | 否 |
| GET | `/api/week/:weekId` | 获取已发布期数据（前端用） | 否 |

---

## 完整工作流程

按以下 6 个步骤顺序执行。每一步都必须检查响应中的 `ok: true`，任何步骤失败则停止并报告错误。

### 第 1 步：检查系统状态

```
GET ${BASE_URL}/api/data/status
```

从响应中获取：
- `latestWeek.id` — 当前最新期号，用于判断是否需要创建新一期
- `unprocessedRaw` — 未处理原始数据数量
- `totalItems` — 已处理条目总数

**判断逻辑**：如果 `latestWeek.id` 已经是本周的 weekId 且状态为 published，询问用户是要覆盖更新还是跳过。

计算期号：调用 `GET ${BASE_URL}/api/week/list`，返回列表长度 + 1 即为新一期的期号。

---

### 第 2 步：采集原始数据

你需要自行从以下渠道采集数据，然后通过 API 批量写入：

**采集渠道（按优先级）**：
1. RSS 订阅源（科技媒体、官方博客、设计社区）
2. GitHub Trending / Search API（开源项目）
3. 社交平台热议（X、即刻、Reddit）
4. 设计工具官方更新（Figma、Framer、Canva 等）

**写入接口**：
```
POST ${BASE_URL}/api/data/raw
```

批量写入（推荐，单次最多 50 条）：
```json
[
  {
    "source_type": "rss",
    "source_name": "The Verge AI",
    "title": "文章标题",
    "content": "正文摘要（≤600字）",
    "url": "https://原文链接",
    "raw_data": "{\"pubDate\":\"2026-03-13\",\"category\":\"科技媒体\"}"
  },
  {
    "source_type": "github",
    "source_name": "GitHub Trending",
    "title": "owner/repo: 项目描述",
    "content": "README 摘要",
    "url": "https://github.com/owner/repo",
    "raw_data": "{\"stars\":12500,\"starsThisPeriod\":1200,\"language\":\"TypeScript\",\"topics\":[\"ai\",\"design\"]}"
  }
]
```

`source_type` 取值：`rss` / `github` / `skillsmp` / `social`

---

### 第 3 步：创建期元数据

**必须先创建期记录，再写入 items**，否则 items 会因外键约束报 409 错误。

```
POST ${BASE_URL}/api/data/weeks
```

```json
{
  "id": "2026-W11",
  "period": "第 3 期",
  "date_range": "2026.03.11-03.17",
  "intro": "一句话导读（≤30字，讲趋势不讲具体产品名）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "data_source_line": "覆盖 RSS、主动检索与开源追踪，共处理 N 条，精选 M 条。",
  "status": "draft"
}
```

**注意**：
- `id`、`period`、`date_range` 必填
- `keywords` 传数组，系统自动序列化，**不要手动 JSON.stringify**
- 如果该期已存在，此接口会更新（upsert），不会报错

成功响应：`{ "ok": true, "weekId": "2026-W11", "action": "created" }`

---

### 第 4 步：处理并写入 items（核心步骤）

对采集到的原始数据进行智能筛选、分类、改写，然后写入。

```
PUT ${BASE_URL}/api/data/weeks/${weekId}
```

```json
{
  "items": [ /* 见下方内容规范 */ ]
}
```

**注意**：传入 `items` 时会先清空该期所有旧 items 再重新写入（replace all）。

#### 区块定义与数量要求

| section 值 | 说明 | 条数 | 前端展示区块 |
|---|---|---|---|
| `top_three` | 本周最重要的 3 条热点，必须是真正重大事件 | 严格 3 条 | TOP3 热点 |
| `industry` | AI 模型/产品动态 + 对设计上下游的影响 | 4-8 条 | 行业动态（与 design_tools 合并显示） |
| `design_tools` | 设计工具 + AI 设计工具更新 | 3-5 条 | 行业动态（与 industry 合并显示） |
| `opensource` | GitHub 开源项目 | 3-4 条 | 开源推荐 |
| `hot_topics` | 社区热议、观点争论、趋势讨论 | 4-6 条 | 热门议题 |

> `industry` 和 `design_tools` 在数据库中分开存储（便于过滤和维护），前端 `IndustryNewsSection` 将两者合并为「行业动态」统一渲染。

#### 单条 Item 完整字段

```json
{
  "section": "top_three",
  "title": "中文标题，简洁有力，≤40字",
  "summary": "2-3句摘要，面向设计师，说清楚是什么+为什么重要",
  "highlight": "一句话亮点，≤20字，说核心结论",
  "category": "模型更新",
  "tags": ["标签1", "标签2"],
  "source_url": "https://原文链接",
  "source_platform": "GitHub",
  "source_date": "3月13日",
  "source_type": "github",
  "image_url": "https://封面图（可选）",
  "logo_url": "https://Logo图标（可选）",
  "author": "作者名（hot_topics 必填）",
  "author_label": "身份标签，如「资深产品设计师」（hot_topics 可选）",
  "author_avatar": "https://头像URL（可选）",
  "heat_data": "{\"stars\":\"5.1k\",\"周增量\":\"+1.2k\"}",
  "ai_summary": "AI解读摘要，1-2句，有信息量，不与标题重合",
  "ai_detail": "① 影响说明\n② 支撑依据/数据\n③ 建议动作",
  "sort_order": 0
}
```

**注意**：`tags` 传数组，系统自动序列化。`heat_data` 传 JSON 字符串。

#### 内容质量规范

**标题 (title)**：
- 中文，≤40字，体现核心价值
- 不要堆砌产品名，要说清楚「发生了什么+为什么重要」

**摘要 (summary)**：
- 2-3句，面向设计师视角
- 第一句说事实，第二句说影响

**亮点 (highlight)**：
- ≤20字，一句话结论
- 不重复标题，要有独立信息量

**AI 解读 (ai_summary + ai_detail)**：
- `ai_summary`：1-2句，弹窗/卡片中展示，不重复标题
- `ai_detail`：固定格式 `① 主体影响\n② 依据数据\n③ 建议动作`
  - ① 不重复标题，说对设计师的具体影响
  - ② 给出数据或案例支撑
  - ③ 写具体可执行的动作，不要写「可选动作」等前缀
- 当 section=industry 且属于模型更新时，可在 ai_detail 最前面加术语解释行：
  `术语名: 通俗解释\n① ...\n② ...\n③ ...`
- **注意**：当前新版 AIReaderModal 将 `ai_detail` 作为纯文本展示，`①②③` 标记会直接显示给用户。
  请确保去掉 `①②③` 后内容依然语义完整、可读。`AIReadAlong` 组件（旧版卡片）可解析 `①②③`，格式保留以兼容。

**分类标签 (category)**：
从以下选取：`模型更新` / `设计工具` / `生成式UI` / `AI硬件` / `工作流` / `开源项目` / `行业趋势` / `观点争议` / `案例分享`

**热度数据 (heat_data)**：
- GitHub 项目：`{"stars":"12.5k","周增量":"+1.2k","language":"TypeScript"}`
- 社交内容：`{"likes":"1.8k","retweets":"420"}`
- 无数据时传 `null`

#### 各区块特殊要求

**top_three**（新版 Top3Section 卡片）：
- 必须是本周真正有影响力的事件，不凑数
- `ai_summary` 必填 → 展示在卡片中间的价值结论框（`ai_summary || highlight`）
- `source_platform` 必填 → 展示在卡片底部左侧（`source_platform || author`）
- `image_url` 可选，有值时作为缩略图背景（模糊放大效果）

**industry / design_tools**（新版 IndustryNewsSection 卡片，两个 section 合并展示为「行业动态」）：
- `industry` 和 `design_tools` 仍需分开写入 DB，页面渲染时自动合并
- `highlight` 必填 → 展示在黄色左边框摘要块（`highlight || ai_summary`）
- `category` 必填 → 展示为蓝色主标签
- `tags` 建议填写 → `tags[0]` 展示为灰色副标签（数组，如 `["LLM","多模态"]`）
- `source_platform` 必填 → 展示在底部左侧

**hot_topics**（新版 HotTopicsSection 卡片）：
- `highlight` 必填 → 作为引号气泡中的核心金句（`highlight || summary`，会去除 HTML 标签）
- `author` 必填 → 卡片底部作者名
- `author_label` 建议填写 → 小型身份标签（如「资深产品设计师」）
- `author_avatar` 建议填写真实头像 URL → 底部圆形头像（无则用占位图）
- `source_platform` 必填（如 "X"、"即刻"、"Reddit"）→ 作者下方平台标注
- `tags` 建议填写 → 标签行展示（含 `category`）

**opensource**（新版 OpenSourceSection 卡片）：
- `heat_data` 中 `stars` 字段必填 → 右上角 ★ 显示（如 `{"stars":"12.5k","周增量":"+1.2k"}`）
- `source_platform` 通常为 "GitHub"
- `category` 展示在底部左侧
- 当前无 AI 解读按钮，`ai_summary`/`ai_detail` 仍建议写入以备后续展示

---

### 第 5 步：写入数据来源信息（可选，用于内部审计）

> **注意**：当前版本 FooterSection 使用硬编码的来源信息，此步骤写入数据库但**不影响前端页面可见内容**。
> 仍建议写入，以便系统审计和将来前端读取。

```
PUT ${BASE_URL}/api/data/weeks/${weekId}/source-info
```

```json
{
  "statement": "通过 RSS 订阅、关键词搜索、GitHub API 及社交平台采集，经 AI 筛选去重后精选。",
  "categories": "[{\"name\":\"科技媒体\",\"examples\":[\"The Verge\",\"TechCrunch\"]},{\"name\":\"开源社区\",\"examples\":[\"GitHub Trending\"]}]",
  "representative_sources": "{\"total\":420,\"selected\":28}"
}
```

> `categories` 和 `representative_sources` 均为 JSON 字符串（数据库存储格式）。
> `statement` 是纯文本，如实反映本次采集情况。

---

### 第 6 步：发布

```
POST ${BASE_URL}/api/data/weeks/${weekId}
```

无需请求体。发布后前端即可展示。

成功响应：`{ "ok": true, "weekId": "2026-W11", "status": "published" }`

---

## 验证与调试

发布后执行以下检查：

1. **检查数据完整性**：
   ```
   GET ${BASE_URL}/api/data/weeks/${weekId}
   ```
   确认 items 数量和各 section 分布符合预期。

2. **模拟前端取数**：
   ```
   GET ${BASE_URL}/api/week/${weekId}
   ```
   确认 `topThree` 有 3 条，`industry`/`designTools`/`opensource`/`hotTopics` 各有内容。

3. **检查期列表**：
   ```
   GET ${BASE_URL}/api/week/list
   ```
   确认新一期出现在列表中。

---

## 修补操作

### 更新「本周速览」（intro 导读 + keywords 标签）

本周速览区块由期元数据的 `intro` 和 `keywords` 字段驱动，使用 PATCH 接口独立更新，**不会影响已写入的 items**。

```
PATCH ${BASE_URL}/api/data/weeks/${weekId}
```

```json
{
  "intro": "本周 AI 设计能力持续演进，多模态和 Agent 正式进入设计工作流",
  "keywords": ["多模态", "Vibe Coding", "Figma AI", "生成式UI", "Agent设计"]
}
```

- `intro`：导读正文，≤50字，讲趋势不讲具体产品名
- `keywords`：传数组，≤7个关键词，前端以彩色标签形式展示
- 两个字段均可单独传（只传其中一个）
- 此接口也可更新其他期元数据：`period`、`date_range`、`data_source_line`、`status`

成功响应：`{ "ok": true, "weekId": "2026-W11" }`

---

### 重新生成整期 items

如果需要重新处理所有 items，直接重新执行第 4 步即可——`PUT /api/data/weeks/:weekId` 传入 `items` 时会自动先清空再写入，**不需要先 DELETE**。

### 删除整期（不可恢复）

```
DELETE ${BASE_URL}/api/data/weeks/${weekId}
```

此操作会**同时删除** items、source_info 和期记录本身。删除后如需重建，必须从第 3 步重新开始。

### 仅更新期元数据（不影响 items）

使用 PATCH 接口，传入需要更新的字段：

```
PATCH ${BASE_URL}/api/data/weeks/${weekId}
```

```json
{
  "period": "第 3 期",
  "date_range": "2026.03.11-03.17",
  "data_source_line": "覆盖 RSS、主动检索与开源追踪，共处理 420 条，精选 28 条。",
  "status": "draft"
}
```

所有字段均可选，只更新传入的字段。

---

## 筛选规则

### 必须与 AI + 设计交叉领域相关

纯技术/金融/娱乐资讯直接丢弃。判断关键词：

**设计相关**：design, figma, ui, ux, prototype, component, 设计, 交互, framer, sketch, canva, midjourney, stable diffusion, typography, layout, wireframe, design system, design token, motion, animation, 3d, spline, webflow

**AI 相关**：ai, llm, gpt, claude, gemini, openai, anthropic, 模型, 大模型, copilot, agent, prompt, diffusion, transformer, multimodal, 多模态, 生成式, embedding

### 去重规则

- 同一件事只入选一次，选最有价值的角度
- 同一 URL 不重复写入 raw_items

### top_three 标准

必须满足至少 2 项：
- 主流科技媒体广泛报道（≥5 家）
- 社交平台讨论量显著（转发/点赞 ≥1k）
- 直接影响设计师日常工作流
- 行业格局性变化（新产品发布、重大收购、标准制定）

---

## 错误处理

| HTTP 状态码 | 含义 | 处理方式 |
|------------|------|---------|
| 200 | 成功 | 继续下一步 |
| 400 | 参数错误或 JSON 格式错误 | 检查请求体格式，按响应中的 `fix` 字段修正后重试 |
| 401 | 鉴权失败 | 检查 `x-api-key` 请求头是否正确 |
| 404 | 资源不存在 | 按响应中的 `fix` 字段操作，通常需要先创建期记录 |
| 409 | 外键约束冲突 | weekId 对应的期不存在，先执行第 3 步创建期记录 |
| 500 | 服务端错误 | 等待 30 秒后重试 1 次，仍失败则报告错误详情 |

每个 API 调用都必须检查响应。不要假设成功，不要跳过错误。响应中的 `fix` 字段包含具体修复建议，优先参考。
