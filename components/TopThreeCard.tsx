"use client";

import Image from "next/image";
import type { Item } from "@/lib/db/schema";
import AIReadAlong from "./AIReadAlong";

interface TopThreeCardProps {
  item: Item;
}

function ImagePlaceholder({ title, category }: { title: string; category?: string | null }) {
  const letter = (title || category || "?").replace(/[^a-zA-Z\u4e00-\u9fa5]/g, "")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="shrink-0 flex items-center justify-center select-none"
      style={{ width: 120, height: 90, borderRadius: 6, background: "var(--color-surface)", fontSize: 28, fontWeight: 700, color: "var(--color-text-tertiary)" }}
    >
      {letter}
    </div>
  );
}

export default function TopThreeCard({ item }: TopThreeCardProps) {
  const openSource = () => item.source_url && window.open(item.source_url, "_blank");

  return (
    <div className="card card-fixed-lg flex flex-col">
      <div
        className="flex flex-1 gap-5 cursor-pointer overflow-hidden"
        onClick={openSource}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && openSource()}
        aria-label="查看详情"
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.title}
            width={120}
            height={90}
            className="shrink-0 object-cover"
            style={{ borderRadius: 6, width: "auto", height: "auto", maxHeight: 90 }}
          />
        ) : (
          <ImagePlaceholder title={item.title} category={item.category} />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {item.category && (
            <div className="mb-3">
              <span className="meta-label" style={{ background: "var(--color-pill-bg)", color: "var(--color-text-secondary)" }}>
                {item.category}
              </span>
            </div>
          )}
          <h3 className="mb-2 text-card-title text-truncate-2">{item.title}</h3>
          {item.summary && (
            <p className="text-body text-truncate-2 mb-3" style={{ color: "var(--color-text-secondary)" }}>
              {item.summary}
            </p>
          )}
        </div>
      </div>
      {item.ai_summary && (
        <div className="mt-4 notion-callout text-truncate-2">
          {item.ai_summary}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--color-border)" }} onClick={(e) => e.stopPropagation()}>
        <span className="text-note" style={{ color: "var(--color-text-tertiary)" }}>
          {item.source_platform || ""}
        </span>
        <AIReadAlong title={item.title} summary={item.ai_summary} detail={item.ai_detail} sourceUrl={item.source_url} mode="modal" />
      </div>
    </div>
  );
}
