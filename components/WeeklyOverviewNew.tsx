import React from 'react';
import type { Week } from "@/lib/db/schema";
import { safeJsonParse } from "@/lib/utils/json";

interface WeeklyOverviewProps {
  week?: Week;
}

const COLORS = [
  { bg: "bg-[#6c5ce7]/10 dark:bg-[#6c5ce7]/20", text: "text-[#6c5ce7] dark:text-[#a29bfe]", border: "border-[#6c5ce7]/20" },
  { bg: "bg-[#00b894]/10 dark:bg-[#00b894]/20", text: "text-[#00b894] dark:text-[#55efc4]", border: "border-[#00b894]/20" },
  { bg: "bg-[#0984e3]/10 dark:bg-[#0984e3]/20", text: "text-[#0984e3] dark:text-[#74b9ff]", border: "border-[#0984e3]/20" },
  { bg: "bg-[#d97706]/10 dark:bg-[#d97706]/20", text: "text-[#d97706] dark:text-[#fbbf24]", border: "border-[#d97706]/20" },
  { bg: "bg-[#db2777]/10 dark:bg-[#db2777]/20", text: "text-[#db2777] dark:text-[#f472b6]", border: "border-[#db2777]/20" },
];

export default function WeeklyOverviewNew({ week }: WeeklyOverviewProps) {
  if (!week) return null;
  
  const keywords = safeJsonParse<string[]>(week.keywords, []);

  return (
    <div id="overview" className="mb-16 scroll-mt-24">
      <div className="mb-8">
        <h2 className="text-[24px] font-bold text-[#37352f] dark:text-[#d4d4d4]">本周速览</h2>
      </div>
      <div className="bg-[#f2f2f7] dark:bg-[#1e1e24] rounded-lg p-6 border border-[#e3e2e0]/50 dark:border-[#333333]/50">
        <p className="text-[17px] font-bold text-[#37352f] dark:text-[#d4d4d4] mb-5 leading-relaxed">
          {week.intro || "暂无导读"}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {keywords.map((kw, i) => {
            const style = COLORS[i % COLORS.length];
            return (
              <span key={kw} className={`${style.bg} ${style.text} font-bold text-[13px] px-3 py-1.5 rounded-lg border ${style.border}`}>
                {kw}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
