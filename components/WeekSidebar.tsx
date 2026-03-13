"use client";

import { useRouter } from "next/navigation";

interface WeekSidebarProps {
  weeks: { id: string; period: string; date_range: string }[];
  currentWeekId: string;
}

export default function WeekSidebar({ weeks, currentWeekId }: WeekSidebarProps) {
  const router = useRouter();

  if (weeks.length <= 1) {
    return null;
  }

  return (
    <aside
      className="hidden lg:block sticky top-24"
      aria-label="周选择"
    >
      <div
        className="side-panel w-[156px] p-3"
      >
        <div className="px-2 pb-3 pt-1">
          <p className="text-micro font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-tertiary)" }}>
            Archive
          </p>
          <p className="mt-1 text-caption">
            历史周报
          </p>
        </div>

        <div className="flex flex-col gap-1">
        {weeks.map((w) => {
          const isActive = w.id === currentWeekId;
          return (
            <button
              key={w.id}
              className="nav-item px-3 py-2.5 text-left"
              style={{
                background: isActive ? "var(--color-accent-light)" : "transparent",
                color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => router.push(`/?week=${w.id}`)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--color-surface)";
                  e.currentTarget.style.color = "var(--color-text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--color-text-secondary)";
                }
              }}
            >
              <span className="block text-note font-semibold">
                {w.period.replace("第 ", "第").replace(" 期", "期")}
              </span>
              <span className="mt-1 block text-micro" style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-tertiary)" }}>
                {w.date_range}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </aside>
  );
}
