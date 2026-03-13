import type { Week, Item } from "@/lib/db/schema";
import { safeJsonParse } from "@/lib/utils/json";
import TopThreeCard from "./TopThreeCard";

interface WeeklyOverviewProps {
  week: Week;
  topThree: Item[];
}

const PILL_COLORS = [
  "pill-industry",   // Purple
  "pill-tools",      // Green
  "pill-topics",     // Blue
  "pill-opensource", // Orange
  "pill-highlight",  // Pink
];

export default function WeeklyOverview({ week, topThree }: WeeklyOverviewProps) {
  const keywords = safeJsonParse<string[]>(week.keywords, []);

  return (
    <section id="overview" className="mb-14">
      <h2 className="section-heading mb-6">本周速览</h2>

      <div
        className="mb-10 rounded-xl px-6 py-6"
        style={{
          background: "var(--color-card-bg)",
          border: "none", // Removed border to match clean look
        }}
      >
        {week.intro && (
          <p className="mb-5 text-[18px] font-bold leading-relaxed" style={{ color: "var(--color-text)" }}>
            {week.intro}
          </p>
        )}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {keywords.map((kw, i) => (
              <span key={kw} className={`keyword-pill ${PILL_COLORS[i % PILL_COLORS.length]}`}>
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {topThree.length > 0 && (
        <>
          <h2 className="section-heading mb-6">
            <span>TOP 3 热点</span>
          </h2>
          <div className="space-y-3">
            {topThree.map((item) => (
              <TopThreeCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
