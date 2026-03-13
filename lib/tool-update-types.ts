/**
 * 设计工具 — 更新类型映射 & 行动建议提取
 */

export const UPDATE_TYPES: [RegExp, { emoji: string; label: string }][] = [
  [/v\d|大版本|重大更新|major/i, { emoji: "📦", label: "大版本" }],
  [/beta|预览|preview|early access/i, { emoji: "🧪", label: "Beta" }],
  [/插件|plugin|extension/i, { emoji: "🧩", label: "插件" }],
  [/AI|智能|copilot|assist/i, { emoji: "🤖", label: "AI功能" }],
  [/修复|fix|patch|hotfix/i, { emoji: "🔧", label: "修复" }],
  [/性能|speed|快|优化|perf/i, { emoji: "⚡", label: "性能" }],
  [/协作|多人|real.?time|team/i, { emoji: "👥", label: "协作" }],
];

export const ACTION_FALLBACKS: [RegExp, string][] = [
  [/迁移|升级|migration/i, "建议尽快评估升级"],
  [/弃用|deprecat|移除/i, "留意弃用影响"],
  [/beta|preview|预览/i, "可小范围试用"],
  [/AI|智能|copilot/i, "推荐团队试用AI能力"],
  [/插件|plugin/i, "可纳入工具链评估"],
  [/性能|speed|优化/i, "建议更新体验提速"],
  [/协作|多人|team/i, "适合多人协作场景"],
  [/安全|security|漏洞/i, "建议立即更新"],
];

export function extractToolName(title: string): string {
  const m = title.match(/^([A-Z][\w.]*(?:\s[A-Z][\w.]*){0,2})/);
  if (m) return m[1];
  const m2 = title.match(/^([\u4e00-\u9fa5]{2,6})/);
  if (m2) return m2[1];
  return title.split(/[\s：:—\-|·]/)[0].trim().slice(0, 20);
}

export function extractUpdateSummary(title: string, toolName: string): string {
  let rest = title.replace(toolName, "").replace(/^[\s：:—\-|·]+/, "").trim();
  if (!rest) rest = title;
  return rest.slice(0, 60);
}

export function extractActionHint(
  aiDetail: string | null,
  highlight: string | null,
  title: string
): string {
  const src = aiDetail ?? highlight ?? title;
  const lines = src.split(/\n/).filter(Boolean);
  for (const line of lines) {
    if (/建议|推荐|适合|可以|值得|需要/.test(line)) {
      return line.replace(/^[\s\-*·•]+/, "").trim().slice(0, 30);
    }
  }
  const all = [title, highlight ?? "", aiDetail ?? ""].join(" ");
  for (const [re, hint] of ACTION_FALLBACKS) {
    if (re.test(all)) return hint;
  }
  return "关注更新动态";
}

export function matchUpdateType(
  title: string,
  highlight: string | null,
  tags: string | null
): { emoji: string; label: string } {
  const text = [title, highlight ?? "", tags ?? ""].join(" ");
  for (const [re, val] of UPDATE_TYPES) {
    if (re.test(text)) return val;
  }
  return { emoji: "🆕", label: "更新" };
}
