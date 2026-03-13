#!/usr/bin/env node
/**
 * collect-github.js — 采集 GitHub Trending + Search API,写入 raw_items
 * 用法: node tools/collect-github.js [--days 7]
 *
 * 采集策略:
 *  1. GitHub Search API(按 topic + pushed 时间过滤)
 *  2. GitHub Trending 页面解析(HTML scraping,无需 token)
 *  3. 两路结果按 url 去重合并
 */
import { createClient } from "@libsql/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

if (process.argv.includes("--help")) {
  console.log("用法: node tools/collect-github.js [--days 7]\n环境变量: DATABASE_PATH, GITHUB_TOKEN");
  process.exit(0);
}

const argv = process.argv;
const DAYS = parseInt(argv[argv.indexOf("--days") + 1] ?? "7", 10);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH ?? resolve(__dirname, "../data/weekly.db");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Design/AI related topics to search
const SEARCH_TOPICS = [
  "topic:figma",
  "topic:design-system",
  "topic:generative-ui",
  "topic:ui-components ai",
  "topic:design ai",
  "ai design tool stars:>20",
  "generative-ui stars:>10",
  "vibe-coding stars:>5",
];

// ─── GitHub API ────────────────────────────────────────────────────────────────

async function githubApi(path) {
  const headers = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "AI-Weekly-Report/2.0",
  };
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;

  const url = `https://api.github.com${path}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });

  if (res.status === 403) {
    const reset = res.headers.get("X-RateLimit-Reset");
    throw new Error(`Rate limited. Reset at ${reset ? new Date(parseInt(reset) * 1000).toLocaleTimeString() : "unknown"}`);
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

async function searchRepos(query) {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const q = encodeURIComponent(`${query} pushed:>${since}`);
  const data = await githubApi(`/search/repositories?q=${q}&sort=stars&order=desc&per_page=15`);
  return (data.items ?? []).filter((r) => !r.fork && r.stargazers_count >= 10);
}

// ─── GitHub Trending 解析(HTML)──────────────────────────────────────────────

async function fetchTrending(lang = "", since = "weekly") {
  const url = `https://github.com/trending${lang ? `/${lang}` : ""}?since=${since}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 AI-Weekly-Report/2.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Trending HTTP ${res.status}`);
  const html = await res.text();

  const repos = [];
  // Parse repo entries from GitHub trending page
  const articlePattern = /<article[^>]+class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let m;
  while ((m = articlePattern.exec(html)) !== null) {
    const block = m[1];

    // Repo full name from h2 link
    const nameMatch = block.match(/href="\/([^/"]+\/[^/"]+)"/);
    const name = nameMatch ? nameMatch[1] : null;
    if (!name) continue;

    // Description
    const descMatch = block.match(/class="[^"]*color-fg-muted[^"]*"[^>]*>\s*([\s\S]*?)\s*</);
    const description = descMatch ? descMatch[1].replace(/\s+/g, " ").trim() : "";

    // Stars total
    const starsMatch = block.match(/aria-label="([0-9,]+) users starred/);
    const stars = starsMatch ? parseInt(starsMatch[1].replace(/,/g, ""), 10) : 0;

    // Stars this week/period
    const periodMatch = block.match(/([\d,]+)\s+stars? this week/i);
    const starsThisPeriod = periodMatch ? parseInt(periodMatch[1].replace(/,/g, ""), 10) : 0;

    // Language
    const langMatch = block.match(/itemprop="programmingLanguage"[^>]*>([^<]+)</);
    const language = langMatch ? langMatch[1].trim() : "";

    repos.push({
      full_name: name,
      html_url: `https://github.com/${name}`,
      description,
      stargazers_count: stars,
      stars_this_period: starsThisPeriod,
      language,
      source: "trending",
    });
  }
  return repos;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = createClient({ url: "file:" + DB_PATH });
  await client.execute("PRAGMA journal_mode = WAL");

  // Dedup across our own results in this run
  const seenUrls = new Set();

  // Load already-known URLs from DB to avoid repeated inserts
  const knownUrls = new Set(
    (await client.execute("SELECT url FROM raw_items WHERE source_type='github'")).rows.map((r) => r.url)
  );

  let collected = 0, skipped = 0, errors = 0;

  async function insertRepo(repo, sourceLabel) {
    if (!repo.html_url || seenUrls.has(repo.html_url) || knownUrls.has(repo.html_url)) {
      skipped++;
      return;
    }
    seenUrls.add(repo.html_url);
    const title = `${repo.full_name}: ${repo.description ?? ""}`.slice(0, 250);
    await client.execute({
      sql: "INSERT INTO raw_items (source_type, source_name, title, content, url, raw_data) VALUES (?,?,?,?,?,?)",
      args: [
        "github",
        sourceLabel,
        title,
        repo.description ?? "",
        repo.html_url,
        JSON.stringify({
          name: repo.full_name,
          stars: repo.stargazers_count,
          starsThisPeriod: repo.stars_this_period ?? 0,
          language: repo.language,
          topics: repo.topics ?? [],
          description: repo.description,
          source: repo.source ?? sourceLabel,
        })
      ]
    });
    collected++;
  }

  // ── 1. GitHub Trending ──────────────────────────────────────────────────────
  try {
    process.stderr.write("  GitHub Trending (all)... ");
    const trending = await fetchTrending("", "weekly");
    for (const r of trending) {
      await insertRepo(r, "GitHub Trending");
    }
    process.stderr.write(`✓ +${trending.length} parsed\n`);
    await new Promise((r) => setTimeout(r, 1000));
  } catch (err) {
    process.stderr.write(`✗ ${err.message}\n`);
    errors++;
  }

  // ── 2. GitHub Search ────────────────────────────────────────────────────────
  for (const query of SEARCH_TOPICS) {
    try {
      process.stderr.write(`  Search "${query.slice(0, 40)}"... `);
      const repos = await searchRepos(query);
      for (const r of repos) {
        await insertRepo({ ...r, source: "search" }, "GitHub Search");
      }
      process.stderr.write(`✓ ${repos.length} found\n`);
      // Respect rate limits: 30 req/min unauthenticated, 60/min authenticated
      await new Promise((r) => setTimeout(r, GITHUB_TOKEN ? 1200 : 2500));
    } catch (err) {
      process.stderr.write(`✗ ${err.message}\n`);
      errors++;
      if (err.message.includes("Rate limited")) break; // stop on rate limit
    }
  }

  client.close();
  console.log(JSON.stringify({ ok: true, collected, skipped, errors, queries: SEARCH_TOPICS.length }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
