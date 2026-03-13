#!/usr/bin/env node
/**
 * init-db.js — 仅初始化数据库表结构（不写入数据）
 * 适合生产环境首次部署
 * 用法: node tools/init-db.js
 */
import { createClient } from "@libsql/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? resolve(__dirname, "../data/weekly.db");

// Ensure data directory exists
const dataDir = resolve(__dirname, "../data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

async function main() {
  const client = createClient({ url: "file:" + DB_PATH });

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

  CREATE INDEX IF NOT EXISTS idx_raw_items_processed ON raw_items(processed);
  CREATE INDEX IF NOT EXISTS idx_raw_items_url ON raw_items(url);
  CREATE INDEX IF NOT EXISTS idx_items_week_section ON items(week_id, section);

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
    updated_at DATETIME,
    PRIMARY KEY (week_id)
  );
`);

  // Insert default RSS sources if sources table is empty
  const result = await client.execute("SELECT COUNT(*) as c FROM sources");
  const sourceCount = result.rows[0].c;

  if (sourceCount === 0) {
    const DEFAULT_SOURCES = [
      ["rss", "The Verge AI",        "科技媒体", JSON.stringify({ url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" })],
      ["rss", "TechCrunch AI",       "科技媒体", JSON.stringify({ url: "https://techcrunch.com/category/artificial-intelligence/feed/" })],
      ["rss", "Ars Technica",        "科技媒体", JSON.stringify({ url: "https://feeds.arstechnica.com/arstechnica/technology-lab" })],
      ["rss", "MIT Technology Review","科技媒体",JSON.stringify({ url: "https://www.technologyreview.com/feed/" })],
      ["rss", "OpenAI Blog",         "官方博客", JSON.stringify({ url: "https://openai.com/blog/rss.xml" })],
      ["rss", "Anthropic Blog",      "官方博客", JSON.stringify({ url: "https://www.anthropic.com/feed" })],
      ["rss", "Google AI Blog",      "官方博客", JSON.stringify({ url: "https://blog.google/technology/ai/rss/" })],
      ["rss", "Figma Blog",          "设计工具", JSON.stringify({ url: "https://www.figma.com/blog/feed/" })],
      ["rss", "36氪",                 "中文媒体", JSON.stringify({ url: "https://36kr.com/feed" })],
      ["rss", "机器之心",              "中文媒体", JSON.stringify({ url: "https://www.jiqizhixin.com/rss" })],
      ["rss", "少数派",               "中文媒体", JSON.stringify({ url: "https://sspai.com/feed" })],
      ["rss", "HN AI+Design",        "技术社区", JSON.stringify({ url: "https://hnrss.org/newest?q=design+AI" })],
      ["rss", "Product Hunt",        "技术社区", JSON.stringify({ url: "https://www.producthunt.com/feed" })],
      ["rss", "Reddit r/UI_Design",  "技术社区", JSON.stringify({ url: "https://www.reddit.com/r/UI_Design/.rss" })],
      ["rss", "Reddit r/artificial", "技术社区", JSON.stringify({ url: "https://www.reddit.com/r/artificial/.rss" })],
      ["github", "GitHub Search Design","开源社区", JSON.stringify({ queries: ["topic:design AI", "topic:figma", "generative-ui", "topic:ui-design"] })],
      ["keyword", "设计关键词", "搜索", JSON.stringify({ keywords: ["AI design tool", "generative UI", "Vibe Coding", "Figma AI", "design workflow AI", "text to UI"] })],
    ];

    const statements = DEFAULT_SOURCES.map(([type, name, cat, config]) => ({
      sql: "INSERT INTO sources (type, name, category, config, active) VALUES (?, ?, ?, ?, 1)",
      args: [type, name, cat, config]
    }));

    await client.batch(statements, "write");
    console.error(`Inserted ${DEFAULT_SOURCES.length} default sources`);
  }

  client.close();
  console.log(JSON.stringify({ ok: true, dbPath: DB_PATH, message: "Database initialized" }));
}

main().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
