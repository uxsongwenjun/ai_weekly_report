"use client";

import Image from "next/image";
import { useState } from "react";
import type { Item } from "@/lib/db/schema";
import AIReadAlong from "./AIReadAlong";
import { IMPACT_PHRASES } from "@/lib/impact-phrases";
import { extractToolName, matchCapabilityTag } from "@/lib/scene-types";

interface IndustryNewsProps {
  items: Item[];
}

const MODEL_CATEGORIES = ["模型更新", "模型发布", "大模型", "LLM", "多模态"];

function extractModelName(title: string): string {
  const m = title.match(/^([A-Z][\w.]*(?:\s[\d.]+)?)/);
  if (m) return m[1];
  const m2 = title.match(/^([\u4e00-\u9fa5]{2,6})/);
  if (m2) return m2[1];
  return title.split(/[\s：:—\-|·]/)[0].trim().slice(0, 16);
}

function extractModelVersion(title: string): string | null {
  const m = title.match(/\b(v?\d+(?:\.\d+)*)\b/i);
  return m ? m[1] : null;
}

function splitModelDisplay(title: string, fallbackName: string) {
  const cleaned = title.replace(/[：:].*$/, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    const suffix = parts[parts.length - 1];
    if (/^[A-Za-z][A-Za-z0-9-]{2,20}$/.test(suffix)) {
      return {
        primary: parts.slice(0, -1).join(" "),
        suffix,
      };
    }
  }
  return { primary: fallbackName, suffix: null as string | null };
}

/** 特殊名词解释：从 ai_detail 中提取 "Term: 解释" 或 "* Term: 解释"，用于黄条灰底块 */
function findSpecialTermExplanation(detail: string | null): string | null {
  if (!detail) return null;
  const line = detail.split(/\n/).find((l) => {
    const cleaned = l.trim();
    if (!cleaned || /^[①②③]/.test(cleaned)) return false;
    if (/^(影响|依据|建议动作|可选动作)[：:]/.test(cleaned)) return false;
    return /^[\s*·•]*[A-Za-z0-9\u4e00-\u9fa5\-+/]{2,24}[\s]*[：:]\s*.+/.test(cleaned);
  });
  if (!line) return null;
  const cleaned = line.replace(/^[\s\-*·•🔹▸]+/, "").trim();
  if (cleaned.length < 5 || cleaned.length > 120) return null;
  return `* ${cleaned}`;
}

function extractSpecialTermLabel(specialTerm: string | null): string | null {
  if (!specialTerm) return null;
  return specialTerm.replace(/^\*\s*/, "").split(/[：:]/)[0]?.trim() || null;
}

function buildModelMainDescription(modelName: string, title: string, summary: string | null, highlight: string | null): string {
  const candidate = summary?.trim() || highlight?.trim() || title;
  const rest = candidate
    .replace(new RegExp(`^${modelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s：:，,、\\-—V.v0-9]*`, "i"), "")
    .replace(/^(发布|更新|版本更新|上线|支持|新增|重点增强)\s*/i, "")
    .replace(/^[\s：:—\-|·，,]+/, "")
    .trim();
  return rest || candidate;
}

function deriveImpactStageTag(
  title: string,
  summary: string | null,
  detail: string | null,
  tags: string | null
): string | null {
  const text = [title, summary ?? "", detail ?? "", tags ?? ""].join(" ");
  const rules: [RegExp, string][] = [
    [/设计系统|组件|token|规范|component/i, "设计系统"],
    [/交付|开发|前端|代码|工程|协作/i, "交付协作"],
    [/研究|分析|调研|访谈|洞察/i, "研究分析"],
    [/原型|prototype|交互|流程/i, "原型验证"],
    [/提案|演示|pitch|汇报/i, "提案表达"],
    [/视觉|出图|海报|素材|图像/i, "视觉出稿"],
  ];
  for (const [re, label] of rules) {
    if (re.test(text)) return label;
  }
  for (const [re, phrase] of IMPACT_PHRASES) {
    if (re.test(text)) return phrase;
  }
  return null;
}

function deriveCapabilityTag(title: string, tags: string | null, highlight: string | null): string | null {
  const text = [title, tags ?? "", highlight ?? ""].join(" ");
  const rules: [RegExp, string][] = [
    [/SWE-Bench|benchmark|编码|代码|coding|编程/i, "代码理解"],
    [/推理|reasoning|思维链|CoT/i, "深度推理"],
    [/Agent|工具调用|function.?call/i, "Agent能力"],
    [/上下文|context|长文本|128k|1M/i, "长上下文"],
    [/图像理解|视觉理解|vision/i, "图像理解"],
    [/速度|延迟|性能|快|token\/s/i, "推理加速"],
    [/开源|open.?source/i, "开源模型"],
    [/安全|对齐|alignment/i, "安全对齐"],
  ];
  for (const [re, label] of rules) {
    if (re.test(text)) return label;
  }
  return null;
}

function SubHeading({ label }: { label: string }) {
  return <h3 className="section-subheading">{label}</h3>;
}

function ModelAvatar({ name }: { name: string }) {
  const letter = name.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, "")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="shrink-0 flex items-center justify-center text-sm font-bold select-none"
      style={{ width: 64, height: 64, borderRadius: 10, background: "var(--color-pill-bg)", color: "var(--color-text)", fontSize: 26 }}
    >
      {letter}
    </div>
  );
}

function SceneAvatar({ name }: { name: string }) {
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

function renderHighlightedText(text: string, termLabel: string | null) {
  if (!termLabel) return <>{text}</>;
  const idx = text.indexOf(termLabel);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ borderBottom: "2px dashed #E6A23C", paddingBottom: 1 }}>{termLabel}</span>
      {text.slice(idx + termLabel.length)}
    </>
  );
}

function ModelUpdateCard({ item }: { item: Item }) {
  const [logoError, setLogoError] = useState(false);
  const modelName = extractModelName(item.title);
  const version = extractModelVersion(item.title);
  const displayName = version && !modelName.includes(version) ? `${modelName} ${version}` : modelName;
  const changeSummary = buildModelMainDescription(modelName, item.title, item.summary, item.highlight);
  const specialTerm = findSpecialTermExplanation(item.ai_detail);
  const specialTermLabel = extractSpecialTermLabel(specialTerm);
  const impactStage = deriveImpactStageTag(item.title, item.ai_summary, item.ai_detail, item.tags);
  const capTag = deriveCapabilityTag(item.title, item.tags, item.highlight);
  const useAvatar = !item.logo_url || logoError;
  const modelDisplay = splitModelDisplay(item.title, displayName);

  return (
    <div
      className="card cursor-pointer"
      onClick={() => item.source_url && window.open(item.source_url, "_blank")}
      style={{ padding: 24 }}
    >
      <div className="flex h-full flex-col items-start overflow-hidden">
        <div className="flex items-start gap-6 w-full">
          {!useAvatar ? (
            <Image
            src={item.logo_url!}
            alt={modelName}
            width={64}
            height={64}
            className="shrink-0 object-cover"
            style={{ borderRadius: 10, width: "auto", height: "auto", maxHeight: 64 }}
            onError={() => setLogoError(true)}
          />
          ) : (
            <ModelAvatar name={modelName} />
          )}
          <div className="flex-1 min-w-0">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h3
                className="text-truncate-2 text-card-title"
                style={{
                  textDecoration: "underline",
                  textDecorationStyle: "dashed",
                  textDecorationColor: "#a855f7",
                  textUnderlineOffset: 8,
                }}
              >
                {modelDisplay.primary}
              </h3>
              {modelDisplay.suffix && (
                <span className="text-card-title" style={{ color: "rgba(55,53,47,0.35)" }}>
                  {modelDisplay.suffix}
                </span>
              )}
            </div>
            {changeSummary && (
              <p
                className="text-truncate-2 text-body"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {renderHighlightedText(changeSummary, specialTermLabel)}
              </p>
            )}
          </div>
        </div>

        {item.highlight && (
          <div className="mt-5 mb-4 w-full notion-callout text-truncate-2 font-medium">
            {item.highlight}
          </div>
        )}

        <div className="mt-auto flex w-full items-end justify-between gap-3 pt-2">
          <div className="min-w-0 flex-1">
            {(impactStage || capTag) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {impactStage && (
                  <span
                    className="meta-label"
                    style={{
                      background: "var(--color-pill-bg)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    设计影响：{impactStage}
                  </span>
                )}
                {capTag && (
                  <span
                    className="meta-label"
                    style={{
                      background: "var(--color-pill-bg)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    能力：{capTag}
                  </span>
                )}
              </div>
            )}

            {specialTerm && (
              <p className="text-micro truncate mt-2">
                <span style={{ color: "#E6A23C", fontWeight: 600 }}>*</span>{" "}
                {specialTerm.replace(/^\*\s*/, "")}
              </p>
            )}
            {item.source_platform && (
              <p className="text-note mt-2" style={{ color: "var(--color-text-tertiary)" }}>
                {item.source_platform}
              </p>
            )}
          </div>

          <div className="shrink-0">
            <AIReadAlong
              title={item.title}
              summary={item.ai_summary}
              detail={item.ai_detail}
              sourceUrl={item.source_url}
              mode="modal"
              contentType="model"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAppDesc(title: string, summary: string | null, highlight: string | null): string {
  const toolName = extractToolName(title);
  const raw = summary || highlight || "";
  const cleaned = raw
    .replace(new RegExp(`^${toolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s：:，,、\\-—]*`, "i"), "")
    .replace(/^(上线|新增|支持|现已|可以)[：:，,、\s]*/i, "")
    .trim();
  return cleaned || raw;
}

function buildSceneHeadline(title: string, summary: string | null, highlight: string | null): string {
  const toolName = extractToolName(title);
  const candidates = [highlight, summary, title].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(new RegExp(`^${toolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s：:，,、\\-—]*`, "i"), "")
      .split(/[。！？\n]/)[0]
      .trim();
    if (cleaned && cleaned !== toolName) return cleaned.slice(0, 24);
  }
  return toolName;
}

function deriveSceneStage(title: string, summary: string | null, tags: string | null): string | null {
  const text = [title, summary ?? "", tags ?? ""].join(" ");
  const rules: [RegExp, string][] = [
    [/提案|pitch|演示/i, "提案表达"],
    [/原型|prototype|交互/i, "原型验证"],
    [/组件|设计系统|token/i, "设计系统"],
    [/视频|动效|motion/i, "动效预演"],
    [/素材|海报|图像|出图/i, "视觉出稿"],
    [/交付|开发|前端|代码/i, "交付协作"],
    [/灵感|概念|探索/i, "灵感探索"],
  ];
  for (const [re, label] of rules) {
    if (re.test(text)) return label;
  }
  return null;
}

function deriveSceneMetaTags(title: string, summary: string | null, tags: string | null): string[] {
  const text = [title, summary ?? "", tags ?? ""].join(" ");
  const rules: [RegExp, string, "input" | "access" | "complexity"][] = [
    [/首帧|首图|参考图/i, "输入：参考图", "input"],
    [/Figma/i, "输入：Figma 稿", "input"],
    [/品牌描述|文字描述|提示词/i, "输入：文字描述", "input"],
    [/API|SDK/i, "接入：API", "access"],
    [/ComfyUI/i, "接入：ComfyUI", "access"],
    [/Webflow/i, "接入：Webflow", "access"],
    [/插件|plugin/i, "接入：插件", "access"],
    [/低门槛|快速|即用|无需代码|无代码/i, "门槛：低", "complexity"],
    [/工作流|节点|配置|部署/i, "门槛：中", "complexity"],
    [/工程化|脚本|训练|自部署/i, "门槛：高", "complexity"],
  ];
  const picked: string[] = [];
  const kinds = new Set<string>();
  for (const [re, label, kind] of rules) {
    if (!kinds.has(kind) && re.test(text)) {
      picked.push(label);
      kinds.add(kind);
    }
  }
  const capTag = matchCapabilityTag(title, summary, tags);
  if (capTag && !picked.includes(capTag)) {
    picked.push(capTag.replace(/^集成：/, "接入："));
  }
  return picked.slice(0, 2);
}

function AppSceneCard({ item }: { item: Item }) {
  const toolName = extractToolName(item.title);
  const headline = buildSceneHeadline(item.title, item.summary, item.highlight);
  const result = buildAppDesc(item.title, item.summary, item.highlight);
  const stage = deriveSceneStage(item.title, item.summary, item.tags);
  const metaTags = deriveSceneMetaTags(item.title, item.summary, item.tags);

  return (
    <div
      className="card cursor-pointer"
      onClick={() => item.source_url && window.open(item.source_url, "_blank")}
      style={{ minHeight: 188, padding: 24 }}
    >
      <div className="flex h-full gap-6 overflow-hidden">
        {item.logo_url ? (
          <Image
            src={item.logo_url}
            alt={toolName}
            width={48}
            height={48}
            className="shrink-0 object-cover"
            style={{ borderRadius: 8, width: "auto", height: "auto", maxHeight: 48 }}
          />
        ) : (
          <SceneAvatar name={toolName} />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3
            className="text-truncate-2 text-card-title"
            style={{
              fontWeight: 700,
              marginBottom: 4,
              textDecoration: "underline",
              textDecorationStyle: "dashed",
              textDecorationColor: "#a855f7",
              textUnderlineOffset: 6,
            }}
          >
            {headline}
          </h3>
          <p className="text-note mb-1.5">
            {toolName}
          </p>
          {result && (
            <p className="text-truncate-3 mb-2 text-body">
              {result}
            </p>
          )}
          <div className="mt-auto pt-3">
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {stage && (
                <span
                  className="meta-label"
                  style={{
                    background: "var(--color-pill-bg)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  应用场景：{stage}
                </span>
              )}
              {metaTags.map((tag) => (
                <span
                  key={tag}
                  className="meta-label"
                  style={{
                    background: "var(--color-pill-bg)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {tag.includes("接入") ? `集成：${tag.replace(/^接入：/, "")}` : tag}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 min-w-0">
              {item.source_platform ? (
                <span className="text-note truncate" style={{ color: "var(--color-text-tertiary)" }}>
                  {item.source_platform}
                </span>
              ) : (
                <span />
              )}
              <div className="shrink-0">
                <AIReadAlong
                  title={item.title}
                  summary={item.ai_summary}
                  detail={item.ai_detail}
                  sourceUrl={item.source_url}
                  mode="modal"
                  contentType="scene"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IndustryNews({ items }: IndustryNewsProps) {
  if (items.length === 0) return null;

  const modelItems = items.filter(i => MODEL_CATEGORIES.some(c => (i.category ?? "").includes(c) || (i.tags ?? "").includes(c)));
  const appItems = items.filter(i => !MODEL_CATEGORIES.some(c => (i.category ?? "").includes(c) || (i.tags ?? "").includes(c)));

  return (
    <section id="industry" className="mb-8">
      <h2 className="section-heading">🤖 行业动态</h2>

      {modelItems.length > 0 && (
        <div className="mb-6">
          <SubHeading label="模型变化" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {modelItems.map(item => <ModelUpdateCard key={item.id} item={item} />)}
          </div>
        </div>
      )}

      {appItems.length > 0 && (
        <div>
          <SubHeading label="落地场景" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {appItems.map(item => <AppSceneCard key={item.id} item={item} />)}
          </div>
        </div>
      )}

      {modelItems.length === 0 && appItems.length === 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map(item => <ModelUpdateCard key={item.id} item={item} />)}
        </div>
      )}
    </section>
  );
}
