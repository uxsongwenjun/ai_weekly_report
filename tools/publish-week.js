#!/usr/bin/env node
/**
 * publish-week.js — 将指定期状态改为 published
 * 用法: node tools/publish-week.js --week 2026-W10
 */
import { createClient } from "@libsql/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

if (process.argv.includes("--help")) {
  console.log("用法: node tools/publish-week.js --week <YYYY-WNN>");
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? resolve(__dirname, "../data/weekly.db");
const weekArg = process.argv[process.argv.indexOf("--week") + 1];

if (!weekArg) {
  console.error(JSON.stringify({ ok: false, error: "--week required" }));
  process.exit(1);
}

async function main() {
  const client = createClient({ url: "file:" + DB_PATH });
  await client.execute("PRAGMA journal_mode = WAL");
  const result = await client.execute({
    sql: "UPDATE weeks SET status='published', updated_at=CURRENT_TIMESTAMP WHERE id=?",
    args: [weekArg]
  });
  client.close();

  if (result.rowsAffected === 0) {
    console.error(JSON.stringify({ ok: false, error: `Week '${weekArg}' not found` }));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, weekId: weekArg, status: "published" }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
