#!/usr/bin/env node
/**
 * collect-rss.js — 拉取所有活跃 RSS 源,写入 raw_items 表
 * 用法: node tools/collect-rss.js [--max-age 7] [--limit 30] [--dry-run]
 */
import { createClient } from "@libsql/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

if (process.argv.includes("--help")) {
  console.log("用法: node tools/collect-rss.js [--max-age 7] [--limit 30] [--dry-run]");
  process.exit(0);
}

const argv = process.argv;
const MAX_AGE_DAYS = parseInt(argv[argv.indexOf("--max-age") + 1] ?? "7", 10);
const PER_SOURCE_LIMIT = parseInt(argv[argv.indexOf("--limit") + 1] ?? "30", 10);
const DRY_RUN = argv.includes("--dry-run");

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? resolve(__dirname, "../data/weekly.db");

// ─── XML / RSS 解析工具 ───────────────────────────────────────────────────────

function extractCDATA(str) {
  return (str ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripHtml(str) {
  return (str ?? "").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
}

function xmlField(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? extractCDATA(m[1]).trim() : "";
}

function parseDate(str) {
  if (!str) return null;
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function parseFeed(xml, sourceName) {
  const items = [];
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const pattern = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = pattern.exec(xml)) !== null && items.length < PER_SOURCE_LIMIT) {
    const block = match[1];

    const title = stripHtml(xmlField(block, "title")).slice(0, 300);

    // <link> might be self-closing in Atom: <link href="..."/>
    const link =
      xmlField(block, "link") ||
      (block.match(/<link[^>]+href="([^"]+)"/) ?? [])[1] ||
      "";

    const pubDate =
      xmlField(block, "pubDate") ||
      xmlField(block, "published") ||
      xmlField(block, "updated") ||
      xmlField(block, "dc:date");

    const date = parseDate(pubDate);
    if (date && date < cutoff) continue; // skip old content

    const description = stripHtml(
      xmlField(block, "description") ||
      xmlField(block, "summary") ||
      xmlField(block, "content:encoded") ||
      xmlField(block, "content")
    ).slice(0, 600);

    const category = xmlField(block, "category") || xmlField(block, "dc:subject");

    if (!title || !link) continue;

    // Basic spam filter
    const low = title.toLowerCase();
    if (low.includes("sponsored") || low.includes("advertisement")) continue;

    items.push({
      title,
      url: link.trim(),
      description,
      category,
      pubDate: date?.toISOString() ?? pubDate,
      sourceName,
    });
  }

  return items;
}

async function fetchFeed(url, retries = 2) {
  const headers = {
    "User-Agent": "AI-Weekly-Report/2.0 RSS Bot",
    "Accept": "application/rss+xml, application/atom+xml, text/xml, */*",
  };
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.includes("<")) throw new Error("Not XML");
      return text;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = createClient({ url: "file:" + DB_PATH });
  await client.execute("PRAGMA journal_mode = WAL");

  const sources = (await client.execute("SELECT * FROM sources WHERE type='rss' AND active=1 ORDER BY id"))
    .rows
    .map((s) => ({ name: s.name, url: JSON.parse(s.config).url, category: s.category }));

  if (sources.length === 0) {
    client.close();
    console.error(JSON.stringify({ ok: false, error: "No RSS sources in DB. Run init-db.js first." }));
    process.exit(1);
  }

  let collected = 0, skipped = 0, errors = 0;
  const errorLog = [];

  for (const src of sources) {
    try {
      process.stderr.write(`  RSS ${src.name}... `);
      const xml = await fetchFeed(src.url);
      const entries = parseFeed(xml, src.name);
      let added = 0;

      // Transaction contains conditional logic, so use sequential awaits
      for (const e of entries) {
        const exists = (await client.execute({
          sql: "SELECT 1 FROM raw_items WHERE url=? LIMIT 1",
          args: [e.url]
        })).rows[0];

        if (exists) {
          skipped++;
          continue;
        }

        if (!DRY_RUN) {
          await client.execute({
            sql: "INSERT INTO raw_items (source_type, source_name, title, content, url, raw_data) VALUES (?,?,?,?,?,?)",
            args: ["rss", src.name, e.title, e.description, e.url,
              JSON.stringify({ ...e, sourceCategory: src.category })]
          });
        }
        collected++; added++;
      }

      process.stderr.write(`✓ +${added}\n`);
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      process.stderr.write(`✗ ${err.message}\n`);
      errorLog.push({ source: src.name, error: err.message });
      errors++;
    }
  }

  client.close();
  console.log(JSON.stringify({ ok: errors < sources.length, collected, skipped, errors, sources: sources.length, dryRun: DRY_RUN }));

  if (errors === sources.length) process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
