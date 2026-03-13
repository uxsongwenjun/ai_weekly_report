# AI 设计探针 · 周报系统 API 文档

## 概述

基地址：`http://<host>:3000`

### 鉴权

管理接口（`/api/data/*`）需要在请求头中携带 API Key：

```
x-api-key: <API_KEY>
```

`API_KEY` 通过环境变量配置。未携带或不匹配时返回 `401 Unauthorized`。

公开接口（`/api/week/*`、`/api/data/status`）无需鉴权。

### 通用响应格式

成功：
```json
{ "ok": true, ... }
```

失败：
```json
{ "error": "错误描述" }
```

---

## 公开接口

### GET /api/data/status

系统状态概览，返回最新期信息、未处理原始数据数和已处理条目总数。

**请求**
```
GET /api/data/status
```

**响应**
```json
{
  "ok": true,
  "latestWeek": {
    "id": "2026-W10",
    "period": "第 1 期",
    "date_range": "2026.03.04-03.10",
    "intro": "多模态能力大跃升...",
    "keywords": "[\"多模态\",\"Vibe Coding\"]",
    "status": "published",
    "created_at": "2026-03-10T00:00:00.000Z",
    "updated_at": "2026-03-10T00:00:00.000Z"
  },
  "unprocessedRaw": 0,
  "totalItems": 18
}
```

---

### GET /api/week/list

获取所有**已发布**期列表（用于前端导航）。

**请求**
```
GET /api/week/list
```

**响应**
```json
[
  {
    "id": "2026-W11",
    "period": "第 2 期",
    "date_range": "2026.03.11-03.17",
    "status": "published"
  },
  {
    "id": "2026-W10",
    "period": "第 1 期",
    "date_range": "2026.03.04-03.10",
    "status": "published"
  }
]
```

---

### GET /api/week/:weekId

获取指定期的完整数据（前端渲染用）。

**请求**
```
GET /api/week/2026-W10
```

**响应**
```json
{
  "week": {
    "id": "2026-W10",
    "period": "第 1 期",
    "date_range": "2026.03.04-03.10",
    "intro": "...",
    "keywords": "[\"多模态\",\"Vibe Coding\"]",
    "data_source_line": "覆盖 RSS、主动检索...",
    "status": "published"
  },
  "topThree": [ /* Item[] */ ],
  "industry": [ /* Item[] */ ],
  "designTools": [ /* Item[] */ ],
  "opensource": [ /* Item[] */ ],
  "hotTopics": [ /* Item[] */ ],
  "sourceInfo": {
    "week_id": "2026-W10",
    "categories": "[{\"name\":\"科技媒体\",\"examples\":[...]}]",
    "statement": "通过 RSS 订阅...",
    "representative_sources": "{\"total\":392,\"selected\":28}"
  },
  "totalItems": 18,
  "selectedItems": 18
}
```

**404** 当 weekId 不存在：
```json
{ "error": "Week not found" }
```

---

## 管理接口（需鉴权）

### POST /api/data/raw

写入原始采集数据。支持单条或批量。

**请求**
```
POST /api/data/raw
x-api-key: <API_KEY>
Content-Type: application/json
```

单条：
```json
{
  "source_type": "rss",
  "source_name": "The Verge AI",
  "title": "OpenAI releases GPT-5",
  "content": "Article content preview...",
  "url": "https://example.com/article"
}
```

批量（数组）：
```json
[
  { "source_type": "rss", "source_name": "TechCrunch", "title": "...", "content": "...", "url": "..." },
  { "source_type": "github", "source_name": "GitHub Trending", "title": "...", "content": "...", "url": "..." }
]
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source_type | string | 是 | `rss` / `github` / `skillsmp` / `social` |
| source_name | string | 否 | 来源名称，如 "The Verge AI" |
| title | string | 否 | 标题 |
| content | string | 否 | 正文/摘要 |
| url | string | 否 | 原文链接 |
| raw_data | string | 否 | JSON 字符串，存放额外元数据 |

**响应**
```json
{ "ok": true, "inserted": 2 }
```

---

### GET /api/data/weeks/:weekId

获取指定期的管理视图数据（含所有 items，不区分 section）。

**请求**
```
GET /api/data/weeks/2026-W10
x-api-key: <API_KEY>
```

**响应**
```json
{
  "ok": true,
  "week": { /* Week 对象 */ },
  "items": [ /* 该期所有 Item[] */ ]
}
```

---

### PUT /api/data/weeks/:weekId

统一写入接口，通过 `action` 字段区分操作。

#### action: `publish`

将指定期状态改为 published，前端即可展示。

```json
{ "action": "publish" }
```

**响应**
```json
{ "ok": true, "action": "published", "weekId": "2026-W10" }
```

---

#### action: `upsert_week`

创建或更新期元数据。weekId 不存在则创建，存在则更新。

```json
{
  "action": "upsert_week",
  "period": "第 2 期",
  "date_range": "2026.03.11-03.17",
  "intro": "本周 AI 设计领域...",
  "keywords": "[\"Agent\",\"多模态\"]",
  "data_source_line": "共处理 420 条，精选 30 条"
}
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| period | string | 是 | 期号，如 "第 2 期" |
| date_range | string | 是 | 日期范围，如 "2026.03.11-03.17" |
| intro | string | 否 | 一句话导读 |
| keywords | string | 否 | JSON 数组字符串 |
| data_source_line | string | 否 | 头部数据说明 |
| status | string | 否 | `draft` / `published`，默认 draft |

**响应**
```json
{ "ok": true, "action": "upserted", "weekId": "2026-W11" }
```

---

#### action: `replace_items`

全量替换指定期的所有 items（先删除旧数据再插入新数据）。

```json
{
  "action": "replace_items",
  "items": [
    {
      "section": "top_three",
      "title": "Claude 4 发布",
      "summary": "Anthropic 发布新一代模型...",
      "highlight": "视觉理解能力跃升",
      "category": "模型更新",
      "tags": "[\"多模态\",\"视觉理解\"]",
      "source_url": "https://anthropic.com/blog",
      "source_platform": "Anthropic Blog",
      "ai_summary": "AI 解读摘要...",
      "ai_detail": "① 影响...\n② 依据...\n③ 建议动作...",
      "sort_order": 0
    }
  ]
}
```

**Item 字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| section | string | 是 | `top_three` / `industry` / `design_tools` / `opensource` / `hot_topics` |
| title | string | 是 | 标题 |
| summary | string | 否 | 2-3 句摘要 |
| highlight | string | 否 | 一句话亮点（≤20字） |
| category | string | 否 | 类别标签 |
| tags | string | 否 | JSON 数组字符串 |
| image_url | string | 否 | 封面图 URL |
| logo_url | string | 否 | Logo/图标 URL |
| source_url | string | 否 | 原文链接 |
| source_platform | string | 否 | 来源平台名，如 "GitHub"、"X"、"即刻" |
| source_date | string | 否 | 来源日期 |
| source_type | string | 否 | `rss` / `github` / `skillsmp` / `social` |
| author | string | 否 | 作者名 |
| author_label | string | 否 | 作者身份标签，如 "资深产品设计师" |
| author_avatar | string | 否 | 作者头像 URL |
| heat_data | string | 否 | JSON 字符串，如 `{"stars":"5.1k"}` |
| ai_summary | string | 否 | AI 解读摘要（1-2 句） |
| ai_detail | string | 否 | AI 解读详情（① ② ③ 格式） |
| sort_order | number | 否 | 排序权重，默认 0 |

**响应**
```json
{ "ok": true, "action": "items_replaced", "count": 18 }
```

---

#### action: `update_item`

按 id 更新单条 item 的指定字段。

```json
{
  "action": "update_item",
  "id": 42,
  "field": "ai_detail",
  "value": "① 新的影响说明\n② 新的依据\n③ 新的建议动作"
}
```

**可更新字段**：`title`、`summary`、`highlight`、`ai_summary`、`ai_detail`、`tags`、`heat_data`、`sort_order`、`image_url`、`logo_url`

**响应**
```json
{ "ok": true, "action": "item_updated", "id": 42, "field": "ai_detail" }
```

---

#### action: `upsert_source_info`

写入/更新指定期的数据来源信息（展示在页面底部）。

```json
{
  "action": "upsert_source_info",
  "categories": [
    { "name": "科技媒体", "examples": ["The Verge", "TechCrunch"] },
    { "name": "官方博客", "examples": ["OpenAI Blog", "Anthropic Blog"] },
    { "name": "开源社区", "examples": ["GitHub Trending"] }
  ],
  "statement": "通过 RSS 订阅、关键词搜索、GitHub API 采集，经 AI 筛选去重后精选。",
  "representative_sources": { "total": 392, "selected": 28 }
}
```

> `categories` 和 `representative_sources` 可以传 JSON 对象或 JSON 字符串，接口自动处理。

**响应**
```json
{ "ok": true, "action": "source_info_upserted", "weekId": "2026-W10" }
```

---

### DELETE /api/data/weeks/:weekId

删除指定期的所有 items（不删除 week 记录本身）。

**请求**
```
DELETE /api/data/weeks/2026-W10
x-api-key: <API_KEY>
```

**响应**
```json
{ "ok": true, "weekId": "2026-W10", "action": "items_deleted" }
```

---

## OpenClaw 完整对接流程

以下是 OpenClaw 从采集到发布的典型调用顺序：

```
1. POST /api/data/raw              ← 写入原始采集数据（可多次调用）
2. PUT  /api/data/weeks/2026-W11   ← action=upsert_week 创建期元数据
   { "action": "upsert_week", "period": "第 2 期", "date_range": "..." }

3. PUT  /api/data/weeks/2026-W11   ← action=replace_items 写入处理后的 items
   { "action": "replace_items", "items": [...] }

4. PUT  /api/data/weeks/2026-W11   ← action=upsert_source_info 写入来源信息
   { "action": "upsert_source_info", "categories": [...], ... }

5. PUT  /api/data/weeks/2026-W11   ← action=publish 发布
   { "action": "publish" }
```

### 调试 & 验证

```
GET /api/data/status               ← 查看系统总览
GET /api/data/weeks/2026-W11       ← 查看写入的数据（需鉴权）
GET /api/week/2026-W11             ← 模拟前端取数（无需鉴权）
```

---

## 错误码

| HTTP 状态码 | 含义 |
|------------|------|
| 200 | 成功 |
| 400 | 请求参数错误（缺少必填字段、未知 action 等） |
| 401 | 未授权（缺少或错误的 x-api-key） |
| 404 | 资源不存在（weekId 未找到） |
| 500 | 服务端错误 |
