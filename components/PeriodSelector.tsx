"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PeriodSelectorProps {
  weeks: { id: string; period: string; date_range: string }[];
  currentWeekId: string;
}

export default function PeriodSelector({ weeks, currentWeekId }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const current = weeks.find((w) => w.id === currentWeekId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (weeks.length <= 1) {
    return null;
  }

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-3 rounded-lg flex items-center gap-2 transition-colors hover:bg-[var(--color-surface)] text-[var(--color-text)] hover:text-[var(--color-text)]"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <span className="text-base font-bold">{current?.period ?? currentWeekId}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[var(--color-text-tertiary)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-40 min-w-[240px] p-1 animate-slide-down"
          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
        >
          <div className="px-3 py-2 text-xs font-bold" style={{ color: "var(--color-text-tertiary)" }}>
            近期期数
          </div>
          {weeks.map((w) => {
            const isActive = w.id === currentWeekId;
            return (
              <button
                key={w.id}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between group ${
                  isActive
                    ? "bg-[var(--color-pill-bg)] text-[var(--color-text)] font-bold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-pill-bg)] hover:text-[var(--color-text)]"
                }`}
                style={{ border: "none", cursor: "pointer" }}
                onClick={() => { router.push(`/?week=${w.id}`); setOpen(false); }}
              >
                <span className={isActive ? "font-bold" : "font-medium"}>{w.period}</span>
                <span className={`text-xs ${isActive ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]"}`}>
                  {w.date_range}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
