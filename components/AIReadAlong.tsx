"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface AIReadAlongProps {
  title: string;
  summary?: string | null;
  detail?: string | null;
  sourceUrl?: string | null;
  mode?: "inline" | "modal";
  contentType?: "model" | "scene" | "tool" | "opensource" | "topic";
}

const ACCENT_SYMBOL = <span style={{ color: "#9B59B6" }}>✦</span>;

/** 解析 ai_detail：① 影响/结论 ② 依据/数据 ③ 可选动作；①+② 合并为「影响（依据）」一段，不换行 */
function parseDetail(detail: string): { first: string; second: string; action: string } {
  const m1 = detail.match(/①\s*([\s\S]*?)(?=②|$)/);
  const m2 = detail.match(/②\s*([\s\S]*?)(?=③|$)/);
  const m3 = detail.match(/③\s*([\s\S]*)$/);
  const first = m1?.[1]?.trim() ?? "";
  const second = m2?.[1]?.trim() ?? "";
  let action = m3?.[1]?.trim() ?? "";
  action = action.replace(/^(?:③\s*)?(?:可选动作|建议动作)[：:\s]*/i, "").trim();
  return { first, second, action };
}

/** 去掉正文中「影响」「依据」等标签字眼，仅保留实质内容（前端不展示规则性标题/说明） */
function stripImpactEvidenceLabels(text: string): string {
  return text
    .replace(/(?:^|\n)\s*[①②一二]?\s*影响与?依据?[：:\s]*/g, "\n")
    .replace(/(?:^|\n)\s*[①②一二]?\s*影响[：:\s]*/g, "\n")
    .replace(/(?:^|\n)\s*[①②一二]?\s*依据[：:\s]*/g, "\n")
    .replace(/\（依据[：:\s]*/g, "（")
    .replace(/^[\s\-*·•]+/gm, "") // 去掉开头列表符号
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

/** 去掉正文开头重复的标题 */
function stripLeadingTitle(text: string, title: string): string {
  const t = title.trim();
  if (!t || !text) return text;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^\\s*${escaped}[\\s:：。，、]*`, "i");
  return text.replace(regex, "").trim();
}

/** 多条建议动作按行拆成 1. 2. 3. */
function formatActionList(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) return "";
  const lines = trimmed.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (lines.length <= 1) return trimmed;
  return lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
}

/** 规范「影响（依据）」两段的标点，避免出现多余的逗号/括号 */
function normalizeImpactParts(first: string, second: string): { first: string; second: string } {
  const f = first.trim().replace(/[，、；;,:。：.]\s*$/g, "");
  const s = second.trim().replace(/^[（(]\s*/g, "").replace(/\s*[）)]$/g, "");
  return { first: f, second: s };
}


function buildBodyBlocks(
  contentType: NonNullable<AIReadAlongProps["contentType"]>,
  title: string,
  detail?: string | null
): string[] {
  if (!detail) return [];

  const hasStructuredDetail = /①[\s\S]*②[\s\S]*③/.test(detail);
  if (!hasStructuredDetail) {
    // 尝试解析 Markdown 列表格式
    const sections: string[] = [];
    const impactMatch = detail.match(/(?:^|\n)\s*[【\[]?(?:影响\s*[&与]\s*依据|影响与依据)[】\]]?\s*\n([\s\S]*?)(?=(?:^|\n)\s*[【\[]?(?:建议动作|可选动作)[】\]]?|$)/i);
    const actionMatch = detail.match(/(?:^|\n)\s*[【\[]?(?:建议动作|可选动作)[】\]]?\s*\n([\s\S]*?)$/i);
    
    if (impactMatch) {
      sections.push(impactMatch[1].trim());
    } else if (!actionMatch) {
       // 如果没有找到结构化标记，则作为纯文本处理，尝试去除开头的标签
       return [stripImpactEvidenceLabels(stripLeadingTitle(detail, title))].filter(Boolean);
    }
    
    return sections;
  }

  const { first, second } = parseDetail(detail);
  const normalizedFirst = stripImpactEvidenceLabels(stripLeadingTitle(first, title));
  const normalizedSecond = stripImpactEvidenceLabels(stripLeadingTitle(second, title));

  if (contentType === "model") {
    const parts = normalizeImpactParts(normalizedFirst, normalizedSecond);
    const merged = parts.second ? `${parts.first}（${parts.second}）` : parts.first;
    return [merged].filter(Boolean);
  }

  return [normalizedFirst, normalizedSecond].filter(Boolean);
}

function DetailContent({
  title,
  summary,
  detail,
  contentType = "model",
}: {
  title: string;
  summary?: string | null;
  detail?: string | null;
  contentType?: NonNullable<AIReadAlongProps["contentType"]>;
}) {
  const hasStructuredDetail = detail && /①[\s\S]*②[\s\S]*③/.test(detail);
  let action = "";
  let bodyBlocks: string[] = [];
  
  if (hasStructuredDetail) {
      bodyBlocks = buildBodyBlocks(contentType, title, detail);
      const parsedDetail = detail ? parseDetail(detail) : { first: "", second: "", action: "" };
      action = stripLeadingTitle(formatActionList(parsedDetail.action), title);
  } else if (detail) {
      // Markdown 格式解析
      bodyBlocks = buildBodyBlocks(contentType, title, detail);
      const actionMatch = detail.match(/(?:^|\n)\s*[【\[]?(?:建议动作|可选动作)[】\]]?\s*\n([\s\S]*?)$/i);
      if (actionMatch) {
          action = actionMatch[1].trim();
      }
  }

  const hasBody = bodyBlocks.length > 0;
  const hasAction = action.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-[22px] font-bold text-[#37352f] dark:text-[#d4d4d4] leading-tight tracking-tight">
        {title}
      </h2>
      
      {summary && (
        <p className="text-[15px] text-[#37352f] dark:text-[#d4d4d4] leading-relaxed font-normal tracking-wide">
          {summary}
        </p>
      )}
      
      <div className="space-y-8">
        {hasBody && (
          <div>
            <h3 className="text-[14px] font-bold text-[#787774] dark:text-[#9e9e9e] mb-4 flex items-center gap-2">
              影响 & 依据
            </h3>
            <div className="text-[#37352f] dark:text-[#b0b0b0] text-[15px] pl-[13px] border-l-2 border-[#f1f1ef] dark:border-[#333333] ml-[3px]">
              {bodyBlocks.map((block, idx) => (
                <div key={idx} className="whitespace-pre-line mb-4 last:mb-0">
                  {block.split('\n').map((line, i) => {
                     const trimmed = line.trim();
                     if (trimmed.startsWith('·') || trimmed.startsWith('-')) {
                         return (
                             <div key={i} className="relative pl-4 mb-2 last:mb-0">
                                 <span className="absolute left-0 top-[9px] w-1.5 h-1.5 rounded-full bg-[#d9d9d9] dark:bg-[#555]"></span>
                                 {trimmed.replace(/^[·-]\s*/, '')}
                             </div>
                         );
                     }
                     return <p key={i} className="mb-2 last:mb-0">{line}</p>;
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasAction && (
          <div className="relative px-7 py-6 bg-gradient-to-br from-[#fbf9fc] to-[#f4f0f7] dark:from-[#2a262c] dark:to-[#221e24] rounded-[8px] border border-[#ebdff0] dark:border-[#3a323d] overflow-hidden transition-colors">
            <h3 className="text-[15px] font-bold dark:text-white mb-3 flex items-center gap-2 text-[#212121]">
              建议动作
            </h3>
            <div className="text-[#37352f] dark:text-[#d4d4d4] text-[15px] leading-relaxed font-normal tracking-wide whitespace-pre-line">
              {action.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('·') || trimmed.startsWith('-')) {
                      return (
                          <div key={i} className="relative pl-4 mb-1 last:mb-0">
                              <span className="absolute left-0 top-[9px] w-1.5 h-1.5 rounded-full bg-[#9b59b6] dark:bg-[#c486dd]"></span>
                              {trimmed.replace(/^[·-]\s*/, '')}
                          </div>
                      );
                  }
                  return <p key={i} className="mb-1 last:mb-0">{line}</p>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalPanel({
  title,
  summary,
  detail,
  sourceUrl,
  onClose,
  contentType,
}: {
  title: string;
  summary?: string | null;
  detail?: string | null;
  sourceUrl?: string | null;
  onClose: () => void;
  contentType?: NonNullable<AIReadAlongProps["contentType"]>;
}) {
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    return () => {
      const top = document.body.style.top;
      const stored = top ? parseInt(top, 10) : NaN;
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      const restoreY = Number.isNaN(stored) ? scrollY : -stored;
      window.scrollTo(0, restoreY);
    };
  }, []);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        cursor: "default",
        overflow: "hidden",
        touchAction: "none",
        overscrollBehavior: "none",
        contain: "layout paint",
      }}
      onMouseDown={handleBackdrop}
      onClick={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); e.stopPropagation(); onClose(); } }}
      onWheel={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
      onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          maxHeight: "min(85vh, 560px)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-readalong-title"
      >
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span id="ai-readalong-title" className="text-note font-medium inline-flex items-center gap-1" style={{ color: "var(--color-text-secondary)", letterSpacing: "0.04em" }}>
            AI 解读{ACCENT_SYMBOL}
          </span>
          <button type="button" onClick={onClose} className="text-lg opacity-50 hover:opacity-90 transition-opacity leading-none" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text)" }} aria-label="关闭">×</button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          <DetailContent title={title} summary={summary} detail={detail} contentType={contentType} />
        </div>
        <div className="px-5 py-3 flex justify-end shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-note font-medium" style={{ color: "var(--color-text-tertiary)" }}>
              查看原文 →
            </a>
          ) : (
            <button type="button" onClick={onClose} className="text-note" style={{ color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer" }}>关闭</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIReadAlong({
  title,
  summary,
  detail,
  sourceUrl,
  mode = "modal",
  contentType = "model",
}: AIReadAlongProps) {
  const [open, setOpen] = useState(false);

  if (!summary && !detail) return null;

  const modal = open && mode === "modal" ? (
    <ModalPanel
      title={title}
      summary={summary}
      detail={detail}
      sourceUrl={sourceUrl}
      onClose={() => setOpen(false)}
      contentType={contentType}
    />
  ) : null;

  return (
    <>
      <button
        type="button"
        className="ai-readalong-btn inline-flex items-center gap-1 text-note font-medium transition-colors min-h-[32px] rounded-md px-2.5"
        style={{
          color: "var(--color-text-secondary)",
          background: "none",
          border: "1px solid var(--color-border)",
          padding: "6px 10px",
          cursor: "zoom-in",
        }}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        AI解读{ACCENT_SYMBOL}
      </button>

      {typeof document !== "undefined" && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
