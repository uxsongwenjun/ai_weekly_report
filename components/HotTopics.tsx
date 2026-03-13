"use client";

import Image from "next/image";
import type { Item } from "@/lib/db/schema";
import { safeJsonParse } from "@/lib/utils/json";
import AIReadAlong from "./AIReadAlong";

interface HotTopicsProps {
  items: Item[];
}

function TopicCard({ item }: { item: Item }) {
  const parsedTags = safeJsonParse<string[]>(item.tags, []);

  return (
    <div
      className="card cursor-pointer h-full flex flex-col"
      onClick={() => item.source_url && window.open(item.source_url, "_blank")}
      style={{ minHeight: 300, padding: 24 }}
    >
      {/* 金句区域：气泡+大引号+圆角+彩色边框 */}
      <div
        className="mb-5"
        style={{
          position: "relative",
          padding: "24px 22px 20px 22px",
          borderRadius: 0,
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border-strong)",
          borderLeft: "4px solid var(--color-border-hover)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 14,
            fontSize: 36,
            lineHeight: 1,
            color: "var(--color-text-tertiary)",
            opacity: 0.35,
            fontFamily: "Georgia, serif",
          }}
          aria-hidden="true"
        >
          &ldquo;
        </span>
        <p
          className="text-body-lg text-truncate-4"
          style={{ paddingLeft: 8, paddingTop: 8 }}
        >
          {item.highlight || item.summary || item.title}
        </p>
        {item.title && item.highlight && (
          <p
            className="text-note mt-2"
            style={{ color: "var(--color-text-tertiary)", paddingLeft: 8, textAlign: "right" }}
          >
            {item.title}
          </p>
        )}
      </div>

      {/* 类型标签 + 特点标签 */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {item.category && (
          <span
            className="meta-label"
            style={{
              background: "var(--color-pill-bg)",
              color: "var(--color-text-secondary)",
            }}
          >
            #{item.category}
          </span>
        )}
        {parsedTags.map((tag) => (
          <span
            key={tag}
            className="meta-label"
            style={{
              background: "var(--color-pill-bg)",
              color: "var(--color-text-secondary)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* 底部：来源 + 作者 + 身份标签 | AI解读 */}
      <div className="mt-auto flex items-center justify-between gap-2 min-w-0 pt-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {item.author_avatar ? (
            <Image
              src={item.author_avatar}
              alt={item.author ?? ""}
              width={28}
              height={28}
              className="rounded-full shrink-0 object-cover"
              style={{ width: "auto", height: "auto", maxHeight: 28 }}
            />
          ) : item.author ? (
            <div
              className="rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ width: 28, height: 28, background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              {item.author[0]?.toUpperCase() ?? "?"}
            </div>
          ) : null}
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap text-note">
            <span style={{ color: "var(--color-text-tertiary)" }}>
              {item.source_platform || "即刻"}
            </span>
            {item.author && (
              <>
                <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
                <span className="truncate" style={{ color: "var(--color-text-secondary)" }}>
                  {item.author}
                </span>
              </>
            )}
            {item.author_label && (
              <span
                className="identity-pill"
                style={{
                  background: "var(--color-pill-bg)",
                  color: "var(--color-text-tertiary)",
                  padding: "3px 8px",
                  borderRadius: 999,
                  fontSize: "var(--font-size-note)",
                }}
              >
                {item.author_label}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <AIReadAlong
            title={item.title}
            summary={item.ai_summary}
            detail={item.ai_detail}
            sourceUrl={item.source_url}
            mode="modal"
            contentType="topic"
          />
        </div>
      </div>
    </div>
  );
}

export default function HotTopics({ items }: HotTopicsProps) {
  if (items.length === 0) return null;

  return (
    <section id="hot-topics" className="mb-8">
      <h2 className="section-heading">🔥 热门议题</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <TopicCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}
