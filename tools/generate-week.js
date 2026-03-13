#!/usr/bin/env node
/**
 * generate-week.js — 一键执行：采集 → 处理 → 发布（完整流程）
 * 用法: node tools/generate-week.js [--week 2026-W10]
 */
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

if (process.argv.includes("--help")) {
  console.log("用法: node tools/generate-week.js [--week <YYYY-WNN>]");
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolsDir = __dirname;

// Compute current week ID
function currentWeekId() {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const weekArg = process.argv[process.argv.indexOf("--week") + 1] ?? currentWeekId();

console.error(`=== AI设计探针周报生成 · ${weekArg} ===\n`);

function run(cmd, desc) {
  console.error(`[${new Date().toLocaleTimeString()}] ${desc}...`);
  try {
    const out = execSync(cmd, { cwd: resolve(toolsDir, ".."), encoding: "utf-8", stdio: ["pipe", "pipe", "inherit"] });
    const parsed = JSON.parse(out.trim());
    console.error(`  ✓ ${JSON.stringify(parsed)}`);
    return parsed;
  } catch (e) {
    console.error(`  ✗ Failed: ${e.message}`);
    throw e;
  }
}

async function main() {
  const results = {};

  results.rss = run(`node tools/collect-rss.js`, "采集 RSS");
  results.github = run(`node tools/collect-github.js`, "采集 GitHub");

  try {
    results.skillsmp = run(`node tools/collect-skillsmp.js`, "采集 SkillsMP");
  } catch (_) {
    console.error("  ⚠ SkillsMP 采集跳过");
  }

  results.process = run(`node tools/process-data.js --week ${weekArg}`, "处理数据 + AI 分类");
  results.publish = run(`node tools/publish-week.js --week ${weekArg}`, "发布本期");

  console.error(`\n=== ✅ 完成 · ${weekArg} ===`);
  console.log(JSON.stringify({ ok: true, weekId: weekArg, results }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
