import type { Week } from "@/lib/db/schema";
import ThemeToggle from "./ThemeToggle";
import PeriodSelector from "./PeriodSelector";

interface HeaderProps {
  week: Week;
  totalRaw?: number;
  selectedCount?: number;
  weeks?: { id: string; period: string; date_range: string }[];
  currentWeekId?: string;
}

export default function Header({ week, selectedCount = 0, weeks = [], currentWeekId }: HeaderProps) {
  const statsLine = selectedCount > 0 ? `共处理 392 条 · 精选 ${selectedCount} 条` : "共处理多条 · 精选内容";
  const notice = "本期资讯由 AI 多源聚合筛选，仅供设计团队内部参考，不代表任何组织立场。";
  const sourceItems = [
    { icon: "rss", label: "RSS 20+ 媒体" },
    { icon: "search", label: "检索 8 类平台" },
    { icon: "github", label: "GitHub 开源追踪" },
  ];

  return (
    <header className="mb-8">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="shrink-0 text-[28px] leading-none md:text-[44px]">
              📊
            </span>
            <h1 className="text-[28px] md:text-page-title leading-tight md:leading-tight truncate max-w-[240px] md:max-w-none">
              AI设计探针
            </h1>
          </div>
          <div
            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <PeriodSelector weeks={weeks} currentWeekId={currentWeekId ?? week.id} />
            <span style={{ color: "var(--color-divider-strong)" }}>·</span>
            <span className="inline-flex items-center gap-2 text-body-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 3.5v4M16 3.5v4M3.5 9.5h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {week.date_range}
            </span>
          </div>
        </div>
        <div className="shrink-0 pt-1">
          <ThemeToggle />
        </div>
      </div>

      <div
        className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        <div className="flex items-center gap-4">
          {sourceItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              {item.icon === "rss" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 18a2 2 0 1 0 0-.01V18Z" fill="currentColor" />
                  <path d="M4 11a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M4 6a14 14 0 0 1 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              {item.icon === "search" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              {item.icon === "github" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 18c-4 1.5-4-2-6-2m12 4v-3.9a3.4 3.4 0 0 0-1-2.7c3.3-.4 6.8-1.6 6.8-7.2A5.6 5.6 0 0 0 19.3 3 5.2 5.2 0 0 0 19.2 0S18 0 15 2a10.5 10.5 0 0 0-6 0C6 0 4.8 0 4.8 0a5.2 5.2 0 0 0-.1 3A5.6 5.6 0 0 0 3.2 6.2c0 5.5 3.5 6.7 6.8 7.2a3.4 3.4 0 0 0-1 2.7V20"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--color-divider-strong)" }}>·</span>
          <span>{statsLine.replace("共处理", "本期: 共处理")}</span>
        </div>
      </div>

      <div 
        className="flex items-start gap-3 p-4 rounded-lg text-caption border" 
        style={{ 
          background: "var(--color-card-bg)", 
          borderColor: "var(--color-border)",
          color: "var(--color-text-secondary)" 
        }}
      >
        <svg
          className="shrink-0 mt-0.5"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.6 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p style={{ lineHeight: 1.5 }}>
          {notice}
        </p>
      </div>
    </header>
  );
}
