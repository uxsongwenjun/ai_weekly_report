import type { SourceInfo } from "@/lib/db/schema";
import { safeJsonParse } from "@/lib/utils/json";

interface SourceInfoSectionProps {
  sourceInfo: SourceInfo | null;
}

const SOURCE_ICONS: Record<string, string> = {
  科技媒体: "📰",
  官方博客: "📝",
  社交平台: "💬",
  技术社区: "🧑‍💻",
  中文媒体: "🇨🇳",
  产品文档: "📚",
  开源社区: "🔓",
};

const DEFAULT_CATEGORIES = [
  { name: "科技媒体", examples: ["The Verge", "TechCrunch", "Ars Technica", "MIT Technology Review"] },
  { name: "官方博客", examples: ["OpenAI Blog", "Anthropic Blog", "Google AI Blog", "Figma Blog"] },
  { name: "社交平台", examples: ["X (Twitter)", "即刻"] },
  { name: "技术社区", examples: ["Hacker News", "Product Hunt", "Reddit r/UI_Design"] },
  { name: "中文媒体", examples: ["36氪", "机器之心", "少数派"] },
  { name: "产品文档", examples: ["Figma Blog", "Notion Updates"] },
  { name: "开源社区", examples: ["GitHub Trending", "SkillsMP"] },
];

export default function SourceInfoSection({ sourceInfo }: SourceInfoSectionProps) {
  const categories = safeJsonParse(sourceInfo?.categories, DEFAULT_CATEGORIES);
  const updatedAt = sourceInfo?.updated_at ?? "";
  const stats = safeJsonParse<{ total?: number; selected?: number } | null>(sourceInfo?.representative_sources, null);

  return (
    <section id="source-info" className="mb-16">
      <h2 className="section-heading">📌 信源说明</h2>

      <div className="rounded-[4px] p-5" style={{ background: "var(--color-banner-bg)", border: "1px solid var(--color-border-strong)" }}>
        {/* Icon row */}
        <div className="flex items-center justify-center gap-4 mb-3">
          {categories.map((cat: { name: string; examples: string[] }) => (
            <span key={cat.name} style={{ fontSize: 22 }} title={cat.name}>
              {SOURCE_ICONS[cat.name] ?? "🔗"}
            </span>
          ))}
        </div>

        {/* Summary text */}
        <div className="text-caption text-center mb-4">
          <p>覆盖科技媒体、官方博客、社交平台及开源社区等多类来源。</p>
          <p>
            通过 RSS 订阅、关键词检索与开源追踪，由 AI 辅助筛选整理
            {stats?.total && stats?.selected && (
              <>，共处理 {stats.total} 条，精选 {stats.selected} 条</>
            )}
            。
          </p>
        </div>

        {/* Category list */}
        <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3" style={{ borderTop: "1px solid var(--color-border)" }}>
          {categories.map((cat: { name: string; examples: string[] }) => (
            <div key={cat.name}>
              <p className="text-note font-semibold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                {cat.name}
              </p>
              <ul className="text-note space-y-1" style={{ color: "var(--color-text-tertiary)" }}>
                {cat.examples.slice(0, 3).map((e: string) => (
                  <li key={e}>{e}</li>
                ))}
                {cat.examples.length > 3 && <li>等</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {updatedAt && (
        <p className="text-note text-center mt-3">
          更新于 {updatedAt.slice(0, 10)}
        </p>
      )}
    </section>
  );
}
