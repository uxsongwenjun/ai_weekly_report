"use client";

import type { Item } from "@/lib/db/schema";
import { safeJsonParse } from "@/lib/utils/json";

interface OpenSourcePicksProps {
  items: Item[];
}

const IDENTIFIER_RULES: [RegExp, { label: string; emoji: string }][] = [
  [/mcp/i, { label: "MCP", emoji: "🔌" }],
  [/skill/i, { label: "Skill", emoji: "⚡" }],
  [/experience/i, { label: "Experience", emoji: "🎯" }],
  [/template|模板/i, { label: "模板", emoji: "📋" }],
  [/component.?library|组件库/i, { label: "组件库", emoji: "📦" }],
  [/starter|boilerplate|脚手架/i, { label: "脚手架", emoji: "🏗" }],
  [/plugin/i, { label: "Plugin", emoji: "🧩" }],
];

function getIdentifier(item: Item) {
  const parsedTags = safeJsonParse<string[]>(item.tags, []);
  const text = [item.source_platform ?? "", item.category ?? "", item.title, item.summary ?? "", parsedTags.join(" ")].join(" ");
  for (const [re, config] of IDENTIFIER_RULES) {
    if (re.test(text)) return config;
  }
  if ((item.source_platform ?? "").toLowerCase().includes("github")) {
    return { label: "开源项目", emoji: "🔓" };
  }
  return { label: "Skill", emoji: "⚡" };
}

function formatStar(val: string): string {
  const n = parseFloat(val.replace(/[^\d.]/g, ""));
  if (isNaN(n)) return val;
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function LargeIcon({ name }: { name: string }) {
  const letter = name.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, "")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="shrink-0 flex items-center justify-center text-xl font-bold select-none"
      style={{
        width: 64,
        height: 64,
        borderRadius: 14,
        background: "var(--color-tag-industry)",
        color: "var(--color-tag-industry-text)",
        fontSize: 26,
      }}
    >
      {letter}
    </div>
  );
}

function VoteBlock({ heat, identifierLabel }: { heat: Record<string, string>; identifierLabel: string }) {
  const starsRaw = heat.stars ?? heat.star_count ?? null;
  const starsDisplay = starsRaw ? formatStar(starsRaw) : null;
  const installsDisplay = heat.installs ?? heat.downloads ?? null;
  const isGithub = identifierLabel === "开源项目" || starsRaw;
  const val = isGithub ? starsDisplay : installsDisplay;
  const label = isGithub ? "stars" : "安装";
  if (!val) return null;
  return (
    <div
      className="flex flex-col items-center justify-center text-note font-medium"
      style={{ width: 64, minHeight: 64, padding: "8px 6px", borderRadius: 12, background: "var(--color-pill-bg)", color: "var(--color-text)" }}
    >
      <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{val}</span>
      <span className="text-meta" style={{ lineHeight: 1.1, marginTop: 4, fontSize: 11 }}>{label}</span>
    </div>
  );
}

function OpenSourceCard({ item }: { item: Item }) {
  const heat = safeJsonParse<Record<string, string>>(item.heat_data, {});
  const identifier = getIdentifier(item);
  const purposeRules: [RegExp, string][] = [
    [/design system|design tokens|组件库|theme|tailwind/i, "设计系统"],
    [/ui 生成|ui生成|v0|react|代码/i, "UI转代码"],
    [/workflow|工作流|自动化|agent|mcp/i, "工作流自动化"],
    [/素材|品牌|插图|图像/i, "品牌素材"],
    [/模板|starter|boilerplate|脚手架/i, "项目起步"],
  ];
  const purposeText = [item.title, item.summary ?? "", item.category ?? "", item.tags ?? ""].join(" ");
  const purposeTag = purposeRules.find(([re]) => re.test(purposeText))?.[1] ?? "设计协作";

  return (
    <div
      className="card cursor-pointer"
      onClick={() => item.source_url && window.open(item.source_url, "_blank")}
      style={{ minHeight: 196, padding: 20 }}
    >
      <div className="card-horizontal h-full">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <LargeIcon name={item.title} />
          <VoteBlock heat={heat} identifierLabel={identifier.label} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex flex-wrap items-center gap-2" style={{ minHeight: 28 }}>
            <span
              className="meta-label"
              style={{
                background: "var(--color-pill-bg)",
                color: "var(--color-text-secondary)",
              }}
            >
              {identifier.label}
            </span>
            <span
              className="meta-label"
              style={{
                background: "var(--color-pill-bg)",
                color: "var(--color-text-secondary)",
              }}
            >
              {purposeTag}
            </span>
          </div>
          <h3
            className="text-truncate-2 mb-2 text-card-title"
            style={{
              fontWeight: 700,
              minHeight: 48, // 2 lines * 1.5 line-height * 16px font-size = 48px
            }}
          >
            {item.title}
          </h3>
          {(item.summary || item.highlight) ? (
            <p
              className="text-truncate-2 mb-3 text-body"
              style={{ minHeight: 52 }} // 2 lines * 1.6 line-height * 16px font-size ≈ 51.2px -> 52px
            >
              {item.summary ?? item.highlight}
            </p>
          ) : (
            <div className="mb-3" style={{ minHeight: 52 }} />
          )}
          <div className="mt-auto border-t pt-2.5" style={{ borderColor: "var(--color-border-strong)" }}>
            <div className="flex items-center justify-between gap-3">
              <p
                className="text-note truncate"
                style={{
                  color: "var(--color-text-tertiary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 15 }}>📦</span>
                {(item.source_platform ?? "github").toLowerCase()}
              </p>
              {item.source_url ? (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: "var(--color-text)",
                    borderRadius: 14,
                    border: "1px solid var(--color-border-strong)",
                    padding: "6px 16px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    fontSize: "var(--font-size-caption)",
                    fontWeight: 600,
                    background: "var(--color-surface)",
                  }}
                >
                  查看
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  style={{
                    color: "var(--color-text-tertiary)",
                    borderRadius: 14,
                    border: "1px solid var(--color-border-strong)",
                    padding: "6px 16px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    fontSize: "var(--font-size-caption)",
                    fontWeight: 600,
                    background: "var(--color-surface)",
                  }}
                >
                  查看
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OpenSourcePicks({ items }: OpenSourcePicksProps) {
  if (items.length === 0) return null;

  return (
    <section id="opensource" className="mb-8">
      <h2 className="section-heading">
        🔧 开源精选
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((item) => <OpenSourceCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}
