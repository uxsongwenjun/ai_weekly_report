#!/usr/bin/env node
/**
 * seed.js — 初始化数据库并写入 Mock 数据
 * 用法: node tools/seed.js
 */
import { createClient } from "@libsql/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? resolve(__dirname, "../data/weekly.db");

// Ensure data dir
const dataDir = resolve(__dirname, "../data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const client = createClient({ url: "file:" + DB_PATH });

// ─── Create tables ────────────────────────────────────────────────────────────
await client.execute("PRAGMA journal_mode = WAL");
await client.execute("PRAGMA foreign_keys = ON");

await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS weeks (
    id TEXT PRIMARY KEY,
    period TEXT NOT NULL,
    date_range TEXT NOT NULL,
    intro TEXT,
    keywords TEXT,
    data_source_line TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_id TEXT NOT NULL REFERENCES weeks(id),
    section TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    highlight TEXT,
    category TEXT,
    tags TEXT,
    image_url TEXT,
    logo_url TEXT,
    source_url TEXT,
    author TEXT,
    author_label TEXT,
    author_avatar TEXT,
    heat_data TEXT,
    ai_summary TEXT,
    ai_detail TEXT,
    sort_order INTEGER DEFAULT 0,
    source_platform TEXT,
    source_date TEXT,
    source_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS raw_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_name TEXT,
    title TEXT,
    content TEXT,
    url TEXT,
    raw_data TEXT,
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    config TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS source_info (
    week_id TEXT NOT NULL REFERENCES weeks(id),
    categories TEXT,
    statement TEXT,
    representative_sources TEXT,
    updated_at DATETIME
  );
`);

// ─── Mock Week ────────────────────────────────────────────────────────────────
const WEEK_ID = "2026-W10";

await client.execute({ sql: "DELETE FROM items WHERE week_id=?", args: [WEEK_ID] });
await client.execute({ sql: "DELETE FROM source_info WHERE week_id=?", args: [WEEK_ID] });
await client.execute({ sql: "DELETE FROM weeks WHERE id=?", args: [WEEK_ID] });

await client.execute({
  sql: `INSERT INTO weeks (id, period, date_range, intro, keywords, data_source_line, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
  args: [
    WEEK_ID,
    "第 1 期",
    "2026.03.04 - 03.10",
    "多模态能力大跃升,AI 辅助设计开始渗透生产工作流",
    JSON.stringify(["多模态", "Vibe Coding", "Figma AI", "生成式UI", "Agent设计"]),
    "覆盖 RSS、主动检索与开源追踪,共处理 392 条,精选 28 条。",
    "published"
  ]
});

// ─── Mock Items ────────────────────────────────────────────────────────────────
const base = {
  week_id: WEEK_ID,
  section: null,
  title: null,
  summary: null,
  highlight: null,
  category: null,
  tags: null,
  image_url: null,
  logo_url: null,
  source_url: null,
  author: null,
  author_label: null,
  author_avatar: null,
  heat_data: null,
  ai_summary: null,
  ai_detail: null,
  sort_order: 0,
  source_platform: null,
  source_date: null,
  source_type: "rss",
};

const MOCK_ITEMS = [
  // ── TOP THREE ──
  {
    ...base,
    section: "top_three",
    title: "Claude 3.7 发布:视觉理解能力直追人类设计师",
    summary: "Anthropic 发布 Claude 3.7,在视觉理解基准上取得重大突破,能精准解析 UI 截图、还原设计稿结构,并给出设计建议。",
    highlight: "设计稿解析精度提升 40%",
    category: "模型更新",
    tags: JSON.stringify(["多模态", "视觉理解", "设计辅助"]),
    image_url: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&h=300&fit=crop",
    source_url: "https://www.anthropic.com/blog",
    heat_data: JSON.stringify({ "媒体报道": "32家", "HN讨论": "680+", "X转发": "4.2k" }),
    ai_summary: "多模态视觉理解的跃升意味着 AI 开始真正「看懂」设计,而不只是描述它。",
    ai_detail: "① 影响:设计师可以直接截图交给 Claude 做评审、改稿、出组件文档,减少手动描述成本。\n② 依据:Claude 3.7 在 UI 截图转代码任务上 F1 分数达 0.89,比上代提升 0.17。\n③ 可选动作:将截图 + \"帮我优化这个设计并说明理由\" 写入日常提示词,测试一周。",
    sort_order: 0,
  },
  {
    ...base,
    section: "top_three",
    title: "Figma AI 批量编辑正式上线,重塑 Design Token 工作流",
    summary: "Figma 推出 AI 驱动的批量编辑功能,设计师可用自然语言批量修改样式、替换组件、调整间距,与 Design Tokens 深度集成。",
    highlight: "批量操作效率提升 5-10 倍",
    category: "设计工具",
    tags: JSON.stringify(["Figma", "AI工具", "Design Tokens", "批量编辑"]),
    image_url: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop",
    source_url: "https://www.figma.com/blog",
    heat_data: JSON.stringify({ "媒体报道": "18家", "PH热度": "1.2k", "Reddit讨论": "520+" }),
    ai_summary: "Figma AI 批量编辑把重复性设计操作的成本降到接近零。",
    ai_detail: "① 影响:大型设计系统的日常维护工作量预计减少 60%,尤其是品牌焕新类项目。\n② 依据:内测数据显示 Token 批量更新从平均 2 小时降到 12 分钟。\n③ 可选动作:升级 Figma 到最新版,在小型项目先试验自然语言批量操作。",
    sort_order: 1,
  },
  {
    ...base,
    section: "top_three",
    title: "Vibe Coding 爆火:设计师开始「说出来」做产品",
    summary: "以 Cursor + v0 + Bolt 为代表的 Vibe Coding 工具组合让设计师无需写代码即可产出可交互原型,社区讨论量周增 300%。",
    highlight: "零代码出可交互原型成可能",
    category: "生成式UI",
    tags: JSON.stringify(["Vibe Coding", "生成式UI", "原型", "v0", "Cursor"]),
    image_url: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=300&fit=crop",
    source_url: "https://x.com",
    heat_data: JSON.stringify({ "媒体报道": "25家", "HN讨论": "1.1k+", "X转发": "8.6k" }),
    ai_summary: "Vibe Coding 正在重新定义设计交付物的边界——从静态稿到可运行代码。",
    ai_detail: "① 影响:设计师可以直接交付可运行的前端代码,减少设计-开发交接摩擦。\n② 依据:v0 的 DAU 在本周突破 50 万,其中设计相关查询占比 38%。\n③ 可选动作:选一个小功能,尝试用 v0 或 Bolt 直接生成原型,感受交付形态的变化。",
    sort_order: 2,
  },

  // ── INDUSTRY ──
  {
    ...base,
    section: "industry",
    title: "GPT-4.5 多模态更新:理解复杂 UI 截图",
    summary: "可直接识别 UI 层级、组件关系和布局结构,用截图就能做界面分析、组件梳理和设计评审。",
    highlight: "UI 层级识别准确率 91%",
    category: "模型更新",
    tags: JSON.stringify(["OpenAI", "多模态", "UI识别", "视觉理解"]),
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/240px-ChatGPT_logo.svg.png",
    source_url: "https://openai.com/blog",
    ai_summary: "GPT-4.5 在理解 UI 截图方面有显著提升,对设计师描述界面、生成组件文档有直接帮助。",
    ai_detail: "UI理解:指模型能看懂界面层级、组件关系和布局结构。\n① 影响:可以用截图直接问 AI「这个组件用 React 如何实现」。\n② 依据:UI 层级理解测试中 GPT-4.5 得分 91.3,较 GPT-4o 提升 12 个点。\n③ 可选动作:测试截图 → 代码转换流程,对比 Claude 3.7 的结果。",
    sort_order: 0,
  },
  {
    ...base,
    section: "industry",
    title: "Gemini 2.0 Flash:实时多模态交互成本降低 80%",
    summary: "支持实时流式视觉输入,设计工具可以一边接收画面一边返回反馈,适合做低成本实时辅助能力。",
    highlight: "API 成本降低 80%",
    category: "模型更新",
    tags: JSON.stringify(["Google", "Gemini", "成本优化", "实时多模态"]),
    logo_url: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
    source_url: "https://blog.google/technology/ai",
    ai_summary: "成本障碍消除后,中小型设计工具也有望快速集成多模态 AI 能力。",
    ai_detail: "流式视觉输入:指边接收画面边返回结果,适合实时反馈类产品。\n① 影响:设计工具开发者可以低成本嵌入实时 AI 反馈,用户体验将大幅提升。\n② 依据:Flash 模型每百万 token 仅 $0.075,比 GPT-4o mini 低 40%。\n③ 可选动作:如果在做设计工具,评估切换到 Gemini Flash 的可行性。",
    sort_order: 1,
  },
  {
    ...base,
    section: "industry",
    title: "Midjourney V7:风格一致性控制达新高度",
    summary: "新增 Style Reference 强化版,可在多张图之间保持统一品牌风格,适合批量产出同一体系的插图和营销素材。",
    highlight: "跨图风格一致性 92%",
    category: "AI视频",
    tags: JSON.stringify(["Midjourney", "图像生成", "品牌设计", "风格一致性"]),
    logo_url: null,
    source_url: "https://www.midjourney.com",
    ai_summary: "V7 的风格锁定能力让品牌插图批量生产成为可能,可大幅降低外包成本。",
    ai_detail: "Style Reference:用参考图约束生成结果风格一致性的能力。\n① 影响:设计师可建立品牌 Style Reference 库,一键生成系列插图。\n② 依据:内测用户报告品牌插图一致性从 V6 的 71% 提升到 92%。\n③ 可选动作:整理品牌参考图,建立 Style Reference 集合,测试批量输出效果。",
    sort_order: 2,
  },
  {
    ...base,
    section: "industry",
    title: "Midjourney V7:跨图品牌插图批量产出",
    summary: "品牌团队输入参考图和品牌描述后,可连续生成同系列 KV、海报和社媒图,跨图风格更稳定。",
    highlight: "品牌视觉批量出图更稳",
    category: "案例分享",
    tags: JSON.stringify(["Midjourney", "品牌设计", "参考图", "文字描述", "视觉出稿"]),
    logo_url: null,
    source_url: "https://www.midjourney.com",
    ai_summary: "同一套品牌风格可以更稳定地延伸到多张物料,减少反复返修。",
    ai_detail: "① 影响:品牌活动页、社媒物料和插图套图可以统一产出,出稿速度更快。\n② 依据:使用参考图和文字描述组合后,多张图的一致性明显提升。\n③ 可选动作:挑一组现有品牌 KV,试一轮参考图 + 提示词批量生成。",
    sort_order: 3,
  },
  {
    ...base,
    section: "industry",
    title: "Runway Gen-4:脚本到分镜视频流程更顺滑",
    summary: "输入脚本和关键参考画面后,可快速生成广告分镜和镜头草案,适合前期提案和动效预演。",
    highlight: "广告分镜生成更快",
    category: "案例分享",
    tags: JSON.stringify(["Runway", "首帧图", "API", "动效预演", "工作流"]),
    logo_url: null,
    source_url: "https://runwayml.com",
    ai_summary: "把脚本草案直接转成可讨论的分镜,能显著缩短前期沟通周期。",
    ai_detail: "① 影响:提案前期就能快速看到镜头节奏,减少靠口头描述反复对齐。\n② 依据:脚本加关键画面后,团队可在更早阶段预览视频表达方向。\n③ 可选动作:用一个现有 campaign 脚本测试脚本到分镜的速度差异。",
    sort_order: 4,
  },

  // ── DESIGN TOOLS ──
  {
    ...base,
    section: "design_tools",
    title: "Framer AI:从文字描述直接生成可发布网站",
    summary: "Framer 全新 AI 生成能力上线,输入品牌描述即可生成完整响应式网站,支持自定义组件和动效,最快 5 分钟上线。",
    highlight: "5 分钟从文字到可发布网站",
    category: "生成式UI",
    tags: JSON.stringify(["Framer", "网站生成", "生成式UI", "无代码"]),
    logo_url: null,
    source_url: "https://framer.com",
    ai_summary: "Framer AI 把落地页设计的交付周期压缩到小时级,对设计师的时间经济价值巨大。",
    ai_detail: "① 影响:营销落地页、个人作品集类项目可由设计师独立完成全链路。\n② 依据:Beta 用户平均网站生成时间 4.2 分钟,组件调整需 15-30 分钟。\n③ 可选动作:用 Framer AI 重做一个现有落地页,对比工时差异。",
    sort_order: 0,
    source_platform: "Product Hunt",
  },
  {
    ...base,
    section: "design_tools",
    title: "Figma Variables 2.0:与代码变量双向同步",
    summary: "Figma 发布 Variables 2.0,支持与代码仓库中的 Design Tokens 双向实时同步,消除设计-开发割裂问题。",
    highlight: "设计与代码变量实时同步",
    category: "设计工具",
    tags: JSON.stringify(["Figma", "Variables", "Design System", "开发协作"]),
    logo_url: null,
    source_url: "https://figma.com/blog",
    ai_summary: "Variables 2.0 解决了设计-开发最痛的对齐问题,对设计系统团队是重大利好。",
    ai_detail: "① 影响:设计师修改颜色 Token 后,代码库自动同步,消除手动更新成本。\n② 依据:内测团队报告 Token 同步工作量减少 85%。\n③ 可选动作:如果团队在维护设计系统,优先安排升级验证。",
    sort_order: 1,
  },
  {
    ...base,
    section: "design_tools",
    title: "Spline 3D + AI:文字生成三维场景",
    summary: "Spline 发布 AI 生成功能,支持自然语言描述生成可交互 3D 场景,与 Figma 和 Webflow 原生集成。",
    highlight: "文字描述直接生成3D场景",
    category: "3D设计",
    tags: JSON.stringify(["Spline", "3D", "AI生成", "Webflow集成"]),
    logo_url: null,
    source_url: "https://spline.design",
    ai_summary: "3D 设计门槛大幅降低,普通 UI 设计师可快速制作产品展示动效。",
    ai_detail: "① 影响:Hero 区域 3D 动效不再需要专业 3D 设计师,设计效率提升显著。\n② 依据:用户测试显示无 3D 经验的 UI 设计师平均 20 分钟可产出可用 3D 场景。\n③ 可选动作:尝试用 Spline AI 生成产品展示 3D 场景,替代传统 mockup。",
    sort_order: 2,
  },

  // ── OPENSOURCE ──
  {
    ...base,
    section: "opensource",
    title: "shadcn/ui v4:支持 AI 自动生成主题",
    summary: "shadcn/ui 发布 v4,新增 AI 主题生成 CLI,输入品牌色即可生成完整 Tailwind 设计系统,本周 Stars 增加 3.2k。",
    highlight: "Stars +3200 本周",
    category: "UI组件库",
    tags: JSON.stringify(["React", "Tailwind", "shadcn", "组件库"]),
    source_url: "https://github.com/shadcn-ui/ui",
    heat_data: JSON.stringify({ stars: "58.2k", "周增量": "+3.2k", language: "TypeScript" }),
    ai_summary: "shadcn/ui 持续引领 React 组件生态,AI 主题生成让品牌化更轻松。",
    ai_detail: "设计师可以提供品牌色,直接生成完整的 shadcn 主题配置,大幅减少设计系统搭建时间。",
    sort_order: 0,
    source_platform: "github",
  },
  {
    ...base,
    section: "opensource",
    title: "v0 SDK:在任意 React 项目集成 AI UI 生成",
    summary: "Vercel 开源 v0 SDK,允许开发者在任意 React 项目中嵌入 AI UI 生成能力,首周 Stars 突破 5k。",
    highlight: "首周 Stars 5k+",
    category: "AI工具SDK",
    tags: JSON.stringify(["Vercel", "v0", "React", "AI生成", "SDK"]),
    source_url: "https://github.com/vercel/v0",
    heat_data: JSON.stringify({ stars: "5.1k", "周增量": "+5.1k", language: "TypeScript" }),
    ai_summary: "v0 SDK 让 AI UI 生成能力可以嵌入任意产品,是生成式 UI 的重要基础设施。",
    ai_detail: "产品团队可以快速为自己的设计工具增加 AI 生成界面功能,无需从零研发。",
    sort_order: 1,
    source_platform: "github",
  },
  {
    ...base,
    section: "opensource",
    title: "Design Tokens Community Group:W3C 标准草案",
    summary: "W3C Design Tokens 规范进入候选推荐阶段,支持 Figma、Sketch、Tokens Studio 三方互通,本周 GitHub 活跃度激增。",
    highlight: "W3C标准化进入关键阶段",
    category: "设计规范",
    tags: JSON.stringify(["Design Tokens", "W3C", "标准化", "设计系统"]),
    source_url: "https://github.com/design-tokens/community-group",
    heat_data: JSON.stringify({ stars: "2.8k", "周增量": "+340" }),
    ai_summary: "Design Tokens 标准化将彻底解决跨工具设计系统同步问题。",
    ai_detail: "一旦 W3C 标准落地,设计师可以在任何工具中维护 Tokens,不再被工具生态绑定。",
    sort_order: 2,
    source_platform: "github",
  },

  // ── HOT TOPICS ──
  {
    ...base,
    section: "hot_topics",
    title: "@DesignWithAI 分享:我用 Cursor 替代 Figma 一个月",
    summary: "资深设计师分享使用 Cursor + v0 工作一个月的心得,指出文字转原型的效率远超传统 Figma 流程,但交互细节控制仍需手动调整。",
    author: "DesignWithAI",
    author_label: "资深产品设计师",
    author_avatar: "https://i.pravatar.cc/80?img=12",
    image_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop",
    category: "工具测评",
    tags: JSON.stringify(["Cursor", "Vibe Coding", "工作流"]),
    heat_data: JSON.stringify({ likes: "1.8k", retweets: "420" }),
    source_url: "https://x.com",
    source_platform: "X",
    source_date: "3月6日",
    ai_summary: "真实工作流实验,对评估 Vibe Coding 对设计师的实际价值有参考意义。",
    sort_order: 0,
  },
  {
    ...base,
    section: "hot_topics",
    title: "即刻热议:AI设计工具还在学「会开门」的阶段",
    summary: "即刻 AI设计 圈子热门讨论:AI 生成的设计在视觉层面已经很好,但理解业务逻辑和用户心智模型仍是短板。圈内设计师分享了大量对比案例。",
    author: "加加加酱",
    author_label: "UX 设计团队",
    author_avatar: "https://i.pravatar.cc/80?img=32",
    image_url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop",
    category: "观点争议",
    tags: JSON.stringify(["AI局限性", "业务逻辑", "UX"]),
    heat_data: JSON.stringify({ likes: "892", retweets: "230" }),
    source_url: "https://jike.city",
    source_platform: "即刻",
    source_date: "3月7日",
    ai_summary: "针对 AI 设计能力边界的清醒讨论,有助于设计师设定合理预期。",
    sort_order: 1,
  },
  {
    ...base,
    section: "hot_topics",
    title: "Figma 官方:Design Engineer 将成下一个重要岗位",
    summary: "Figma CEO Dylan Field 在访谈中表示,能同时掌握设计与 AI 工具开发的 Design Engineer 将是未来最紧缺的职位,并宣布推出对应课程。",
    author: "Dylan Field",
    author_label: "Figma CEO",
    author_avatar: "https://i.pravatar.cc/80?img=53",
    image_url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop",
    category: "行业趋势",
    tags: JSON.stringify(["Design Engineer", "职业发展", "Figma"]),
    heat_data: JSON.stringify({ likes: "3.1k", retweets: "880" }),
    source_url: "https://x.com",
    source_platform: "X",
    source_date: "3月5日",
    ai_summary: "行业信号:设计 + 工程的复合能力正在成为核心竞争力。",
    sort_order: 2,
  },
  {
    ...base,
    section: "hot_topics",
    title: "Reddit 热议:设计师开始把 AI 当成第二操作系统",
    summary: "Reddit 上多位产品设计师分享,把 AI 常驻在研究、出稿、交付三个阶段后,真正节省时间的不是单点功能,而是连续工作流被串起来了。",
    author: "Maya Chen",
    author_label: "产品设计负责人",
    author_avatar: "https://i.pravatar.cc/80?img=47",
    image_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=400&fit=crop",
    category: "行业趋势",
    tags: JSON.stringify(["AI工作流", "设计效率", "团队协作"]),
    heat_data: JSON.stringify({ likes: "1.2k", retweets: "310" }),
    source_url: "https://reddit.com",
    source_platform: "Reddit",
    source_date: "3月8日",
    ai_summary: "讨论重点从单个工具好不好用,转向整条设计工作流是否真正被改写。",
    sort_order: 3,
  },
];

// Insert all items using batch
const insertItemsSQL = `INSERT INTO items (week_id, section, title, summary, highlight, category, tags, image_url, logo_url, source_url, author, author_label, author_avatar, heat_data, ai_summary, ai_detail, sort_order, source_platform, source_date, source_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const itemStatements = MOCK_ITEMS.map(item => ({
  sql: insertItemsSQL,
  args: [
    item.week_id,
    item.section,
    item.title,
    item.summary,
    item.highlight,
    item.category,
    item.tags,
    item.image_url,
    item.logo_url,
    item.source_url,
    item.author,
    item.author_label,
    item.author_avatar,
    item.heat_data,
    item.ai_summary,
    item.ai_detail,
    item.sort_order,
    item.source_platform,
    item.source_date,
    item.source_type,
  ]
}));

await client.batch(itemStatements, "write");

// ─── Source Info ───────────────────────────────────────────────────────────────
await client.execute({
  sql: `INSERT INTO source_info (week_id, categories, statement, representative_sources, updated_at)
        VALUES (?, ?, ?, ?, ?)`,
  args: [
    WEEK_ID,
    JSON.stringify([
      { name: "科技媒体", examples: ["The Verge", "TechCrunch", "MIT Technology Review"] },
      { name: "官方博客", examples: ["OpenAI Blog", "Anthropic Blog", "Google AI Blog"] },
      { name: "社交平台", examples: ["X (Twitter)", "即刻"] },
      { name: "技术社区", examples: ["Hacker News", "Product Hunt", "Reddit r/UI_Design"] },
      { name: "中文媒体", examples: ["36氪", "机器之心", "少数派"] },
      { name: "产品文档", examples: ["Figma Blog", "Framer Blog"] },
      { name: "开源社区", examples: ["GitHub Trending", "SkillsMP"] },
    ]),
    "通过 RSS 订阅、关键词搜索、GitHub API 及 SkillsMP 抓取,经 AI 筛选去重后精选。",
    JSON.stringify({ total: 392, selected: 28 }),
    new Date().toISOString()
  ]
});

// ─── Seed RSS Sources ─────────────────────────────────────────────────────────
const RSS_SOURCES = [
  ["rss", "The Verge AI", "科技媒体", JSON.stringify({ url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" })],
  ["rss", "TechCrunch AI", "科技媒体", JSON.stringify({ url: "https://techcrunch.com/category/artificial-intelligence/feed/" })],
  ["rss", "OpenAI Blog", "官方博客", JSON.stringify({ url: "https://openai.com/blog/rss.xml" })],
  ["rss", "Anthropic Blog", "官方博客", JSON.stringify({ url: "https://www.anthropic.com/feed" })],
  ["rss", "Figma Blog", "设计工具", JSON.stringify({ url: "https://www.figma.com/blog/feed/" })],
  ["rss", "HN AI+Design", "技术社区", JSON.stringify({ url: "https://hnrss.org/newest?q=design+AI" })],
  ["rss", "36氪", "中文媒体", JSON.stringify({ url: "https://36kr.com/feed" })],
  ["github", "GitHub Search", "开源社区", JSON.stringify({ queries: ["topic:design AI", "generative-ui"] })],
];

const sourceStatements = RSS_SOURCES.map(([type, name, cat, config]) => ({
  sql: `INSERT OR IGNORE INTO sources (type, name, category, config, active) VALUES (?, ?, ?, ?, 1)`,
  args: [type, name, cat, config]
}));

await client.batch(sourceStatements, "write");

client.close();
console.log(`✅ Database seeded: ${DB_PATH}`);
console.log(`   Week: ${WEEK_ID} · ${MOCK_ITEMS.length} items`);
