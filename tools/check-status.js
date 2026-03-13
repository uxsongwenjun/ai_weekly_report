#!/usr/bin/env node
/**
 * check-status.js — 查看当前采集/处理状态
 * 用法: node tools/check-status.js
 */
import { createClient } from "@libsql/client";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? resolve(__dirname, "../data/weekly.db");

async function main() {
  const client = createClient({ url: "file:" + DB_PATH });
  await client.execute("PRAGMA journal_mode = WAL");

  const weeks = (await client.execute("SELECT id, period, date_range, status FROM weeks ORDER BY id DESC LIMIT 5")).rows;
  const unprocessed = (await client.execute("SELECT COUNT(*) as c FROM raw_items WHERE processed=0")).rows[0];
  const totalRaw = (await client.execute("SELECT COUNT(*) as c FROM raw_items")).rows[0];
  const totalItems = (await client.execute("SELECT COUNT(*) as c FROM items")).rows[0];

  const result = {
    ok: true,
    recentWeeks: weeks,
    rawItems: { total: totalRaw.c, unprocessed: unprocessed.c },
    processedItems: totalItems.c,
  };

  console.log(JSON.stringify(result, null, 2));
  client.close();
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
