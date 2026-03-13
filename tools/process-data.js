#!/usr/bin/env node
/**
 * process-data.js — 处理 raw_items → 分类/摘要 → 写入 items 表
 *
 * 用法:
 *   node tools/process-data.js --week 2026-W10
 *   node tools/process-data.js --week 2026-W10 --no-ai   (跳过 AI，仅做规则筛选)
 *   node tools/process-data.js --week 2026-W10 --force   (重新处理已处理的)
 */
import { createClient } from "@libsql/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

if (process.argv.includes("--help")) {
  console.log(`用法: node tools/process-data.js --week <YYYY-WNN> [--no-ai] [--force]
环境变量: DATABASE_PATH, ANTHROPIC_API_KEY`);
  process.exit(0);
}

const argv = process.argv;
const weekArg = argv[argv.indexOf("--week") + 1];
const NO_AI = argv.includes("--no-ai");
const FORCE = argv.includes("--force");

if (!weekArg) {
  console.error(JSON.stringify({ ok: false, error: "--week required (e.g. --week 2026-W10)" }));
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? resolve(__dirname, "../data/weekly.db");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MASKED_KEY = API_KEY ? `${API_KEY.slice(0, 8)}***` : "(not set)";
process.stderr.write(`[init] ANTHROPIC_API_KEY: ${MASKED_KEY}\n`);

function weekIdToDateRange(weekId) {
  const [year, weekStr] = weekId.split("-W");
  const y = Number(year);
  const week = Number(weekStr);

  const jan4 = new Date(y, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const format = (date) =>
    `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  return `${format(weekStart)}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}.${String(weekEnd.getDate()).padStart(2, "0")}`;
}

// ─── Claude API ────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userPrompt, maxTokens = 4096) {
  if (!API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  // Clean markdown code fences
  return text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
}

async function callClaudeWithRetry(systemPrompt, userPrompt, maxTokens = 4096, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callClaude(systemPrompt, userPrompt, maxTokens);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = Math.pow(2, i) * 1500;
      process.stderr.write(`  [retry ${i + 1}] ${err.message}, wait ${delay}ms\n`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ─── 分类 & 摘要 System Prompt ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是「AI设计探针」周报的资深编辑，专注于 AI 设计领域。
你的任务是对采集到的原始资讯进行智能分类、筛选和摘要，只保留对设计师真正有价值的内容。

## 区块定义

| section 值 | 说明 | 选几条 |
|---|---|---|
| top_three | 本周最重要的 3 条热点，必须是行业里真正重大的事件 | 严格 3 条 |
| industry | AI 模型/产品动态，以及对设计上下游的影响 | 总计 4-8 条，其中模型变化 2-4 条，落地场景 2-4 条 |
| design_tools | 设计工具（Figma/Framer/Canva等）+ AI设计类工具的更新 | 3-5 条 |
| opensource | GitHub 开源项目 + SkillsMP 技能 | 3-4 条 |
| hot_topics | 社区热议、观点争论、设计师分享、行业趋势讨论 | 4-6 条 |

## 内容要求

- **标题**: 改写为中文，**简洁有力**，≤40字，体现核心价值（弹窗内会带✦展示，与摘要区分）
- **highlight**: 一句话亮点，≤20字，说核心结论不是复述标题
- **summary**: 2-3句话摘要，面向设计师，说清楚是什么+为什么重要
- **ai_summary**: AI 解读用摘要，1–2 句，**有信息量**，不与标题重合（弹窗中紧接标题后展示）
- **ai_detail**: 默认固定格式为
  \`① 主体说明\n② 补充依据\n③ 建议动作\`
  仅当 section=industry 且属于模型变化时，若存在需要解释的术语/能力，可在最前面额外补一行
  \`术语: 通俗解释\`
  例如：\`UI 理解: 指模型能看懂界面层级、组件关系和布局结构。\`
  前端规则：模型卡黄条灰底块**只读取这类「术语: 通俗解释」行**，没有就不展示；弹窗中 ①+② 会组织成「设计影响」，③ 单独作为「建议动作」；①②③ 正文均不重复条目标题，③ 只写具体动作，不要写「可选动作」等前缀
- **category**: 类别标签，从以下选：模型更新/设计工具/生成式UI/AI硬件/工作流/开源项目/行业趋势/观点争议/案例分享

## 筛选规则

- 必须与 AI + 设计的交叉领域相关
- 不相关（纯技术/金融/娱乐）的资讯直接丢弃
- top_three 必须是本周真正有影响力的事件，不要凑数
- 同一件事只入选一次，选最有价值的角度`;

// ─── 规则筛选（无AI降级方案）─────────────────────────────────────────────────

const DESIGN_KEYWORDS = [
  "design", "figma", "ui", "ux", "interface", "prototype", "component",
  "设计", "产品", "交互", "figma", "framer", "sketch", "canva",
  "generative", "ai tool", "vibe", "v0 ", "cursor", "bolt",
  "midjourney", "stable diffusion", "dalle", "sora",
  "typography", "layout", "wireframe", "mockup", "icon",
  "color palette", "design system", "design token", "accessibility",
  "responsive", "motion", "animation", "3d", "spline",
  "webflow", "penpot", "affinity",
];

const AI_KEYWORDS = [
  "ai", "llm", "gpt", "claude", "gemini", "openai", "anthropic",
  "machine learning", "neural", "模型", "大模型", "人工智能", "语言模型",
  "copilot", "agent", "prompt", "diffusion", "transformer",
  "multimodal", "多模态", "生成式", "embedding", "fine-tune",
  "rag", "langchain", "huggingface",
];

function isRelevant(item) {
  const text = `${item.title ?? ""} ${item.content ?? ""}`.toLowerCase();
  const hasDesign = DESIGN_KEYWORDS.some((k) => text.includes(k));
  const hasAI = AI_KEYWORDS.some((k) => text.includes(k));
  return hasDesign || hasAI;
}

function fallbackClassify(item) {
  const text = `${item.title ?? ""} ${item.content ?? ""}`.toLowerCase();

  if (item.source_type === "github" || item.source_type === "skillsmp") {
    return "opensource";
  }

  if (["figma", "framer", "canva", "sketch", "spline", "webflow", "penpot", "affinity", "adobe xd"].some((k) => text.includes(k))) {
    return "design_tools";
  }

  if (["midjourney", "stable diffusion", "dalle", "sora", "runway", "pika"].some((k) => text.includes(k))) {
    return "design_tools";
  }

  if (["gpt", "claude", "gemini", "llama", "mistral", "qwen", "deepseek", "模型", "发布", "release", "benchmark"].some((k) => text.includes(k))) {
    return "industry";
  }

  if (["vibe coding", "v0 ", "bolt", "cursor", "copilot", "agent"].some((k) => text.includes(k))) {
    return "industry";
  }

  if (item.source_type === "social" || ["观点", "争议", "讨论", "分享", "tweet", "体验", "测评", "看法"].some((k) => text.includes(k))) {
    return "hot_topics";
  }

  if (["开源", "github", "star", "fork", "npm", "package"].some((k) => text.includes(k))) {
    return "opensource";
  }

  return "industry";
}

function safeParseJSON(text, fallback = null) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function cleanText(value, maxLen = 120) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[•·▪︎]/g, " ")
    .trim()
    .slice(0, maxLen);
}

function uniqStrings(values, limit = 5) {
  return [...new Set(values.map((v) => cleanText(v, 40)).filter(Boolean))].slice(0, limit);
}

function isModelLike(item) {
  const text = [item.section, item.category, ...(item.tags ?? []), item.title]
    .filter(Boolean)
    .join(" ");
  return item.section === "industry" && /模型更新|模型发布|大模型|LLM|多模态|GPT|Claude|Gemini|Llama|Mistral|Qwen|DeepSeek/i.test(text);
}

function extractTermLine(detail) {
  if (!detail) return "";
  const lines = detail.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => {
    if (/^[①②③]/.test(line)) return false;
    if (/^(影响|依据|建议动作|可选动作)[：:]/.test(line)) return false;
    return /^[A-Za-z0-9\u4e00-\u9fa5\-+/]{2,24}[：:]\s*.+/.test(line);
  }) ?? "";
}

function defaultActionForSection(section, title) {
  switch (section) {
    case "design_tools":
      return `选一个小项目试跑「${cleanText(title, 24)}」，记录是否真的节省工时。`;
    case "opensource":
      return "先看 README 和示例，再判断是否值得接入当前流程。";
    case "hot_topics":
      return "结合团队当前流程判断哪些观点值得纳入下周试验。";
    case "industry":
      return "挑一个真实任务做 30 分钟验证，确认它是否值得进入常用工作流。";
    case "top_three":
      return "把这条加入本周关注，并选一个相关任务快速试用。";
    default:
      return "结合当前项目试用一次，确认是否值得继续投入。";
  }
}

function buildEvidenceFallback(item, raw, meta) {
  if (raw.source_type === "github") {
    const stars = meta.stars ? `GitHub stars ${meta.stars}` : "GitHub 社区活跃度较高";
    const delta = meta.starsThisPeriod ? `，近一周新增 ${meta.starsThisPeriod}` : "";
    return `${stars}${delta}`;
  }
  if (raw.source_type === "skillsmp") {
    if (meta.installs || meta.downloads) {
      return `SkillsMP 安装量 ${meta.installs ?? meta.downloads}`;
    }
    return "已有一定真实安装与使用量";
  }
  if (meta.pubDate) {
    return `来源于 ${raw.source_name ?? raw.source_type}，发布时间 ${String(meta.pubDate).slice(0, 10)}`;
  }
  return cleanText(raw.content || item.summary || item.highlight || raw.title || raw.source_name, 120);
}

function applySelectionLimits(items) {
  const topThree = items.filter((item) => item.section === "top_three").slice(0, 3);
  const industryModels = items.filter((item) => isModelLike(item)).slice(0, 4);
  const industryScenes = items
    .filter((item) => item.section === "industry" && !isModelLike(item))
    .slice(0, 4);
  const designTools = items.filter((item) => item.section === "design_tools").slice(0, 5);
  const opensource = items.filter((item) => item.section === "opensource").slice(0, 4);
  const hotTopics = items.filter((item) => item.section === "hot_topics").slice(0, 6);
  return [...topThree, ...industryModels, ...industryScenes, ...designTools, ...opensource, ...hotTopics];
}

function normalizeAiDetail(detail, item, raw, meta) {
  const rawDetail = cleanText(detail, 600);
  const termLine = isModelLike(item) ? extractTermLine(detail) : "";
  const cleanPart = (text) =>
    cleanText(
      String(text ?? "")
        .replace(/^[①②③]\s*/, "")
        .replace(/^(影响|依据|建议动作|可选动作)[：:\s]*/g, ""),
      120
    );

  let first = "";
  let second = "";
  let action = "";

  if (/①[\s\S]*②[\s\S]*③/.test(detail ?? "")) {
    first = cleanPart((detail.match(/①\s*([\s\S]*?)(?=②|$)/) ?? [])[1]);
    second = cleanPart((detail.match(/②\s*([\s\S]*?)(?=③|$)/) ?? [])[1]);
    action = cleanPart((detail.match(/③\s*([\s\S]*)$/) ?? [])[1]);
  } else if (rawDetail) {
    const sentences = rawDetail
      .split(/[。！？]/)
      .map((s) => cleanText(s, 120))
      .filter(Boolean);
    [first, second] = sentences;
  }

  first = first || cleanText(item.highlight || item.summary || item.title, 120);
  second = second || buildEvidenceFallback(item, raw, meta);
  action = action || defaultActionForSection(item.section, item.title);

  return [termLine, `① ${first}`, `② ${second}`, `③ ${action}`].filter(Boolean).join("\n");
}

function normalizeAiSummary(summary, item) {
  return cleanText(summary || item.summary || item.highlight || item.title, 140);
}

function normalizeCategory(item, raw, meta) {
  if (item.category) return item.category;
  if (raw.source_type === "github") return "开源项目";
  if (raw.source_type === "skillsmp") return "开源项目";
  return meta.sourceCategory || "行业动态";
}

function normalizeTags(item, meta) {
  return uniqStrings([
    ...(Array.isArray(item.tags) ? item.tags : safeParseJSON(item.tags, [])),
    ...(Array.isArray(meta.topics) ? meta.topics : []),
    meta.category,
    meta.type,
    meta.language,
  ]);
}

function deriveSourcePlatform(raw, meta) {
  if (meta.platform) return cleanText(meta.platform, 30);
  if (raw.source_type === "github") return "GitHub";
  if (raw.source_type === "skillsmp") return "SkillsMP";
  return cleanText(raw.source_name || raw.source_type, 40);
}

function deriveImageUrl(meta) {
  return meta.image_url || meta.image || meta.thumbnail || meta.cover || meta.og_image || null;
}

function deriveLogoUrl(meta) {
  return meta.logo_url || meta.logo || meta.icon || null;
}

function deriveAuthor(meta) {
  return cleanText(meta.author || meta.user || meta.creator || "", 40) || null;
}

function deriveAuthorLabel(meta) {
  return cleanText(meta.author_label || meta.role || meta.authorRole || "", 40) || null;
}

function deriveAuthorAvatar(meta) {
  return meta.author_avatar || meta.authorAvatar || meta.avatar || null;
}

function deriveHeatData(raw, meta) {
  const heat = {};
  if (raw.source_type === "github") {
    if (meta.stars) heat.stars = String(meta.stars);
    if (meta.starsThisPeriod) heat["周增量"] = `+${meta.starsThisPeriod}`;
    if (meta.language) heat.language = String(meta.language);
  } else if (raw.source_type === "skillsmp") {
    if (meta.installs) heat.installs = String(meta.installs);
    if (meta.downloads) heat.downloads = String(meta.downloads);
    if (meta.stars) heat.stars = String(meta.stars);
  } else {
    if (meta.likes) heat.likes = String(meta.likes);
    if (meta.retweets) heat.retweets = String(meta.retweets);
    if (meta.comments) heat.comments = String(meta.comments);
  }
  return Object.keys(heat).length > 0 ? JSON.stringify(heat) : null;
}

// ─── 批量处理（分批调用 Claude）──────────────────────────────────────────────

async function processWithClaude(rawItems, weekId, client) {
  // Filter relevant items first
  const relevant = rawItems.filter(isRelevant);
  process.stderr.write(`  Relevant items after keyword filter: ${relevant.length}/${rawItems.length}\n`);

  if (relevant.length === 0) {
    process.stderr.write("  No relevant items found\n");
    return { items: [], intro: "", keywords: [] };
  }

  // Batch into groups of 60 to stay within token limits
  const BATCH_SIZE = 60;
  const allParsedItems = [];

  for (let i = 0; i < relevant.length; i += BATCH_SIZE) {
    const batch = relevant.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(relevant.length / BATCH_SIZE);

    process.stderr.write(`  Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...\n`);

    const itemList = batch.map((r, idx) => {
      const raw = r.raw_data ? JSON.parse(r.raw_data) : {};
      return `[${i + idx}] source_type=${r.source_type} source_name="${r.source_name}"
  title: ${r.title?.slice(0, 200)}
  content: ${r.content?.slice(0, 300)}
  url: ${r.url}
  extra: stars=${raw.stars ?? "N/A"} lang=${raw.language ?? "N/A"}`;
    }).join("\n\n");

    const userPrompt = `当前周：${weekId}
请对以下 ${batch.length} 条原始资讯进行分类和摘要。

${itemList}

请严格输出 JSON，格式：
{
  "items": [
    {
      "raw_index": <number>,
      "section": "<top_three|industry|design_tools|opensource|hot_topics>",
      "title": "<改写后的中文标题，简洁有力>",
      "highlight": "<亮点句≤20字>",
      "summary": "<2-3句摘要>",
      "category": "<类别>",
      "tags": ["<tag1>", "<tag2>"],
      "ai_summary": "<AI解读摘要1-2句，有信息量、不与标题重合>",
      "ai_detail": "<① 影响/结论\\n② 依据/数据\\n③ 可选动作（建议动作，前端单独展示）>",
      "sort_order": <0-10>
    }
  ]
}

不相关的不要输出。只输出 JSON，不要任何解释文字。`;

    try {
      const response = await callClaudeWithRetry(SYSTEM_PROMPT, userPrompt, 4096);
      const parsed = JSON.parse(response);
      allParsedItems.push(...(parsed.items ?? []));
    } catch (err) {
      process.stderr.write(`  Batch ${batchNum} failed: ${err.message}\n`);
      // Fallback: basic classification for this batch
      for (const [idx, item] of batch.entries()) {
        allParsedItems.push({
          raw_index: i + idx,
          section: fallbackClassify(item),
          title: item.title?.slice(0, 100) ?? "无标题",
          highlight: "",
          summary: item.content?.slice(0, 200) ?? "",
          category: "",
          tags: [],
          ai_summary: "",
          ai_detail: "",
          sort_order: 5,
        });
      }
    }

    if (batchNum < totalBatches) {
      await new Promise((r) => setTimeout(r, 2000)); // Rate limit between batches
    }
  }

  // Generate week intro and keywords from all selected items
  const selectedTitles = allParsedItems.slice(0, 15).map((i) => i.title).join("；");
  let intro = "";
  let keywords = [];

  try {
    process.stderr.write("  Generating week intro...\n");
    const introPrompt = `基于以下本周精选内容，生成：
1. 一句话导读（≤30字，讲趋势变化而非具体事件，不出现产品名）
2. 5-6个关键词标签（每个≤6字）。要求：
   - 有信息量、能概括本周重点方向或主题，避免空泛（如避免仅「AI」「设计」）
   - 用户可拿去搜索高价值内容与话题，优先：具体能力/场景（如多模态、代码生成）、工具或模型类型、热点议题、开源相关等

本周内容：${selectedTitles}

输出 JSON：{ "intro": "...", "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"] }`;

    const introResponse = await callClaudeWithRetry(SYSTEM_PROMPT, introPrompt, 500);
    const introParsed = JSON.parse(introResponse);
    intro = introParsed.intro ?? "";
    keywords = introParsed.keywords ?? [];
  } catch (_) {
    intro = "本周 AI 设计领域持续演进，多款工具和模型迎来重要更新";
    keywords = ["AI工具", "模型更新", "设计工作流", "开源"];
  }

  return { items: applySelectionLimits(allParsedItems), intro, keywords, rawItems: relevant };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = createClient({ url: "file:" + DB_PATH });
  await client.execute("PRAGMA journal_mode = WAL");

  // Ensure week exists
  let weekResult = await client.execute({ sql: "SELECT * FROM weeks WHERE id=?", args: [weekArg] });
  let week = weekResult.rows[0];
  if (!week) {
    const countResult = await client.execute("SELECT COUNT(*) as c FROM weeks");
    const periodNum = countResult.rows[0].c + 1;
    // Compute date range from week ID
    const [y, w] = weekArg.split("-W").map(Number);
    await client.execute({
      sql: "INSERT INTO weeks (id, period, date_range, status) VALUES (?,?,?,?)",
      args: [weekArg, `第 ${periodNum} 期`, weekIdToDateRange(weekArg), "draft"]
    });
    weekResult = await client.execute({ sql: "SELECT * FROM weeks WHERE id=?", args: [weekArg] });
    week = weekResult.rows[0];
    process.stderr.write(`  Created week entry: ${weekArg}\n`);
  }

  // Get raw items to process
  const query = FORCE
    ? "SELECT * FROM raw_items ORDER BY id DESC LIMIT 300"
    : "SELECT * FROM raw_items WHERE processed=0 ORDER BY id DESC LIMIT 300";

  const rawResult = await client.execute(query);
  const rawRows = rawResult.rows;
  process.stderr.write(`  Raw items to process: ${rawRows.length}\n`);

  if (rawRows.length === 0) {
    client.close();
    console.log(JSON.stringify({ ok: true, weekId: weekArg, message: "No raw items to process" }));
    return;
  }

  // Clear existing items for this week if force
  if (FORCE) {
    await client.execute({ sql: "DELETE FROM items WHERE week_id=?", args: [weekArg] });
    process.stderr.write("  Cleared existing items (--force)\n");
  }

  let result;
  if (NO_AI) {
    process.stderr.write("  Skipping AI (--no-ai), using rule-based classification\n");
    const relevant = rawRows.filter(isRelevant);
    result = {
      items: relevant.map((item, idx) => ({
        raw_index: idx,
        section: fallbackClassify(item),
        title: item.title?.slice(0, 150) ?? "无标题",
        highlight: "",
        summary: item.content?.slice(0, 300) ?? "",
        category: item.source_type === "github" ? "开源项目" : "行业动态",
        tags: [],
        ai_summary: "",
        ai_detail: "",
        sort_order: 5,
      })),
      intro: "本周 AI 设计领域持续演进",
      keywords: ["AI工具", "模型更新", "设计工作流"],
      rawItems: relevant,
    };
  } else {
    result = await processWithClaude(rawRows, weekArg, client);
  }

  // Insert items into DB
  const itemMap = NO_AI ? rawRows : (result.rawItems ?? rawRows);

  let insertedCount = 0;
  const insertStatements = [];

  for (const item of result.items) {
    const raw = itemMap[item.raw_index];
    if (!raw) continue;
    const meta = safeParseJSON(raw.raw_data, {}) ?? {};
    const tags = normalizeTags(item, meta);

    insertStatements.push({
      sql: `INSERT INTO items
        (week_id, section, title, summary, highlight, category, tags, image_url, logo_url, source_url,
         author, author_label, author_avatar, heat_data, ai_summary, ai_detail, sort_order,
         source_platform, source_date, source_type)
      VALUES
        (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        weekArg,
        item.section,
        item.title,
        item.summary ?? "",
        item.highlight ?? "",
        normalizeCategory(item, raw, meta),
        JSON.stringify(tags),
        deriveImageUrl(meta),
        deriveLogoUrl(meta),
        raw.url,
        deriveAuthor(meta),
        deriveAuthorLabel(meta),
        deriveAuthorAvatar(meta),
        deriveHeatData(raw, meta),
        normalizeAiSummary(item.ai_summary, item),
        normalizeAiDetail(item.ai_detail, item, raw, meta),
        item.sort_order ?? 5,
        deriveSourcePlatform(raw, meta),
        meta.pubDate || meta.source_date || null,
        raw.source_type,
      ]
    });
    insertedCount++;
  }

  if (insertStatements.length > 0) {
    await client.batch(insertStatements, "write");
  }

  // Mark reviewed raw items with a stable terminal state:
  // 1 = selected into the weekly report, 2 = reviewed but not selected.
  const selectedRawIds = new Set(
    result.items
      .map((item) => itemMap[item.raw_index]?.id)
      .filter(Boolean)
  );

  const markStatements = rawRows.map((r) => ({
    sql: "UPDATE raw_items SET processed=? WHERE id=?",
    args: [selectedRawIds.has(r.id) ? 1 : 2, r.id]
  }));

  if (markStatements.length > 0) {
    await client.batch(markStatements, "write");
  }

  // Update week metadata
  if (result.intro || result.keywords?.length) {
    await client.execute({
      sql: "UPDATE weeks SET intro=?, keywords=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
      args: [result.intro ?? week.intro, JSON.stringify(result.keywords ?? []), weekArg]
    });
  }

  // Update data source line
  const dataLine = `覆盖 RSS、主动检索与开源追踪，共处理 ${rawRows.length} 条，精选 ${insertedCount} 条。`;
  await client.execute({ sql: "UPDATE weeks SET data_source_line=? WHERE id=?", args: [dataLine, weekArg] });

  client.close();

  console.log(JSON.stringify({
    ok: true,
    weekId: weekArg,
    rawProcessed: rawRows.length,
    itemsCreated: insertedCount,
    mode: NO_AI ? "rule-based" : "ai",
  }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
