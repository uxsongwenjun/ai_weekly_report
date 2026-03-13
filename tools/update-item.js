#!/usr/bin/env node
/**
 * update-item.js — 更新单条内容字段
 * 用法: node tools/update-item.js --id 123 --field ai_detail --value "..."
 */
import { createClient } from "@libsql/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

if (process.argv.includes("--help")) {
  console.log("用法: node tools/update-item.js --id <id> --field <field> --value <value>");
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? resolve(__dirname, "../data/weekly.db");

const args = process.argv;
const idArg = args[args.indexOf("--id") + 1];
const fieldArg = args[args.indexOf("--field") + 1];
const valueArg = args[args.indexOf("--value") + 1];

const ALLOWED = ["title", "summary", "highlight", "ai_summary", "ai_detail", "tags", "heat_data", "sort_order", "image_url", "logo_url"];

if (!idArg || !fieldArg || valueArg === undefined) {
  console.error(JSON.stringify({ ok: false, error: "--id, --field, --value all required" }));
  process.exit(1);
}

if (!ALLOWED.includes(fieldArg)) {
  console.error(JSON.stringify({ ok: false, error: `Field '${fieldArg}' not updatable. Allowed: ${ALLOWED.join(", ")}` }));
  process.exit(1);
}

async function main() {
  const client = createClient({ url: "file:" + DB_PATH });
  await client.execute("PRAGMA journal_mode = WAL");
  const result = await client.execute({
    sql: `UPDATE items SET ${fieldArg}=? WHERE id=?`,
    args: [valueArg, parseInt(idArg)]
  });
  client.close();

  if (result.rowsAffected === 0) {
    console.error(JSON.stringify({ ok: false, error: `Item ${idArg} not found` }));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, id: idArg, field: fieldArg, updated: true }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
