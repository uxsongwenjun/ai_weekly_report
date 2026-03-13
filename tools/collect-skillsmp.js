#!/usr/bin/env node
/**
 * collect-skillsmp.js — 抓取 SkillsMP 数据,写入 raw_items
 * 用法: node tools/collect-skillsmp.js
 */
import { createClient } from "@libsql/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

if (process.argv.includes("--help")) {
  console.log("用法: node tools/collect-skillsmp.js\n环境变量: DATABASE_PATH, SKILLSMP_API_KEY");
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? resolve(__dirname, "../data/weekly.db");

// SkillsMP API 基地址(根据实际情况修改)
const SKILLSMP_BASE = process.env.SKILLSMP_BASE_URL ?? "https://skillsmp.com/api";
const SKILLSMP_KEY = process.env.SKILLSMP_API_KEY;

async function fetchSkills(category) {
  const url = `${SKILLSMP_BASE}/skills?category=${encodeURIComponent(category)}&sort=installs&limit=20`;
  const headers = {};
  if (SKILLSMP_KEY) headers["Authorization"] = `Bearer ${SKILLSMP_KEY}`;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`SkillsMP API ${res.status}`);
  return res.json();
}

async function main() {
  const client = createClient({ url: "file:" + DB_PATH });
  await client.execute("PRAGMA journal_mode = WAL");

  const CATEGORIES = ["design", "ui", "image", "figma", "generative"];
  let collected = 0;
  let errors = 0;

  for (const cat of CATEGORIES) {
    try {
      const data = await fetchSkills(cat);
      const skills = data.skills ?? data.items ?? data ?? [];

      for (const s of skills) {
        if (!s.name || !s.url) continue;
        if (s.installs < 5 && s.stars < 5) continue;

        const exists = (await client.execute({
          sql: "SELECT 1 FROM raw_items WHERE url=?",
          args: [s.url]
        })).rows[0];

        if (exists) continue;

        await client.execute({
          sql: "INSERT INTO raw_items (source_type, source_name, title, content, url, raw_data) VALUES (?, ?, ?, ?, ?, ?)",
          args: [
            "skillsmp", "SkillsMP",
            s.name, s.description ?? "",
            s.url,
            JSON.stringify({ name: s.name, installs: s.installs, stars: s.stars, category: cat, type: s.type ?? "skill" })
          ]
        });
        collected++;
      }
    } catch (e) {
      console.error(`Error for category '${cat}': ${e.message}`);
      errors++;
    }
  }

  client.close();
  console.log(JSON.stringify({ ok: true, collected, errors }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
