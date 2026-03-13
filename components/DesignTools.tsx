"use client";

import type { Item } from "@/lib/db/schema";
import AIReadAlong from "./AIReadAlong";
import { extractToolName as _extractToolName, extractUpdateSummary } from "@/lib/tool-update-types";

interface DesignToolsProps {
  items: Item[];
}

function ToolAvatar({ name }: { name: string }) {
  const letter = name.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, "")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="shrink-0 flex items-center justify-center text-sm font-bold select-none"
      style={{ width: 48, height: 48, borderRadius: 8, background: "var(--color-pill-bg)", color: "var(--color-text)", fontSize: 24 }}
    >
      {letter}
    </div>
  );
}

const TOOL_TYPE_RULES: [RegExp, string][] = [
  [/Figma|协作|多人|评论|设计系统/i, "设计协作"],
  [/原型|prototype|交互|flow/i, "原型生成"],
  [/视频|video|motion|动画/i, "视频制作"],
  [/图像|图片|修图|image|photo/i, "图像处理"],
  [/代码|开发|component|前端|cursor|copilot/i, "代码辅助"],
  [/whiteboard|头脑风暴|脑图|想法/i, "创意探索"],
];

const RECOMMEND_FOCUS_RULES: [RegExp, string][] = [
  [/MVP|验证|快速验证/i, "用于MVP快速验证"],
  [/全栈|应用|full.?stack/i, "用于全栈应用搭建"],
  [/设计系统|组件|token/i, "用于设计系统维护"],
  [/提案|演示|pitch/i, "用于方案演示与提案"],
  [/协作|多人|team/i, "用于多人协作流程"],
  [/运营|营销|素材/i, "用于营销素材产出"],
  [/3D|三维|建模/i, "用于三维场景搭建"],
  [/网站|落地页|landing/i, "用于落地页快速搭建"],
  [/品牌|视觉|出图/i, "用于品牌视觉产出"],
];

function matchToolType(title: string, summary: string | null, tags: string | null): string {
  const text = [title, summary ?? "", tags ?? ""].join(" ");
  for (const [re, label] of TOOL_TYPE_RULES) {
    if (re.test(text)) return label;
  }
  return "设计工具";
}

function buildRecommendFocus(item: Item): string {
  const candidates = [item.ai_detail, item.summary, item.highlight, item.title].filter(Boolean) as string[];
  for (const text of candidates) {
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (/首选|流程|验证|适合|推荐|关注/.test(line)) {
        return line
          .replace(/^[\s\-*·•]+/, "")
          .replace(/^[①②③]\s*/g, "")
          .replace(/^(建议动作|可选动作|建议|推荐关注)[：:\s]*/g, "")
          .replace(/[：:]/g, "")
          .trim()
          .replace(/^(适用|适合|试用)\s*/, "用于")
          .slice(0, 18);
      }
    }
  }
  const text = candidates.join(" ");
  for (const [re, label] of RECOMMEND_FOCUS_RULES) {
    if (re.test(text)) return label;
  }
  return "用于日常工作流探索";
}

function buildTagRow(item: Item): string[] {
  const toolType = matchToolType(item.title, item.summary, item.tags);
  const abilityTags: string[] = [];
  const abilityRules: [RegExp, string][] = [
    [/用户研究|访谈|调研|survey/i, "用户研究"],
    [/原型|flow|交互/i, "原型设计"],
    [/三维|3D|建模/i, "三维建模"],
    [/文案|写作|营销|内容/i, "文案撰写"],
    [/视觉|出图|图像|品牌/i, "视觉出稿"],
    [/数据|分析|报表|埋点/i, "数据分析"],
    [/代码|开发|前端|组件/i, "代码联动"],
    [/网站|落地页|页面/i, "页面搭建"],
  ];
  const text = [item.title, item.summary ?? "", item.highlight ?? "", item.tags ?? ""].join(" ");
  for (const [re, label] of abilityRules) {
    if (re.test(text)) {
      abilityTags.push(label);
    }
  }
  const tags = [toolType, ...abilityTags]
    .filter(Boolean)
    .map((tag) => String(tag).replace(/^集成：/, ""))
    .filter((tag, idx, arr) => arr.indexOf(tag) === idx)
    .slice(0, 3);
  return tags;
}

function ToolUpdateCard({ item }: { item: Item }) {
  const toolName = _extractToolName(item.title);
  const updateTitle = extractUpdateSummary(item.title, toolName);
  const desc = (updateTitle ? item.highlight : item.summary) || item.highlight || "";
  const recommendFocus = buildRecommendFocus(item);
  const tags = buildTagRow(item);
  const versionMatch = item.title.match(/v?\d+(\.\d+)?/i);
  const version = versionMatch ? `V${versionMatch[0].replace(/^v/i, "")}` : null;

  return (
    <div
      className="card cursor-pointer"
      onClick={() => item.source_url && window.open(item.source_url, "_blank")}
      style={{ minHeight: 196, padding: 20 }}
    >
      <div className="card-horizontal h-full overflow-hidden">
        <ToolAvatar name={toolName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex items-baseline gap-2" style={{ minHeight: 24 }}>
            <h3
              className="truncate text-card-title"
              style={{
                fontWeight: 700,
                textDecoration: "underline",
                textDecorationStyle: "dashed",
                textDecorationColor: "var(--color-accent)",
                textUnderlineOffset: 6,
              }}
            >
              {toolName}
            </h3>
            {version && (
              <span className="text-note">
                {version}
              </span>
            )}
          </div>
          {(updateTitle || desc) && (
            <p className="text-truncate-3 mb-3 text-body" style={{ minHeight: 76 }}>
              {updateTitle || desc}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mb-3" style={{ minHeight: 28 }}>
            {tags.map((tag) => (
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
          <div className="mt-auto flex items-center justify-between gap-2 min-w-0">
            <p className="text-note text-truncate-2 min-w-0" style={{ color: "var(--color-text-tertiary)" }}>
              {recommendFocus}
            </p>
            <span className="shrink-0">
              <AIReadAlong
              title={item.title}
              summary={item.ai_summary}
              detail={item.ai_detail}
              sourceUrl={item.source_url}
              mode="modal"
              contentType="tool"
            />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesignTools({ items }: DesignToolsProps) {
  if (items.length === 0) return null;

  return (
    <section id="design-tools" className="mb-8">
      <h2 className="section-heading">
        ✨ 设计工具
      </h2>
      <div className="section-subheading" style={{ marginTop: "-4px", marginBottom: "18px", textTransform: "none", letterSpacing: "0.02em" }}>
        工具更新
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map(item => <ToolUpdateCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}
