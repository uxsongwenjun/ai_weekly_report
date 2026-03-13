/**
 * 应用场景 — 场景类型 emoji 映射 & 能力标签规则
 */

export const SCENE_TYPES: [RegExp, { emoji: string; label: string }][] = [
  [/图像|图片|插图|绘画|Midjourney|DALL|Stable.?Diffusion|文生图/, { emoji: "🎨", label: "图像生成" }],
  [/视频|动画|Motion|Runway|Pika|Sora|文生视频/, { emoji: "🎬", label: "视频制作" }],
  [/3D|三维|NeRF|Mesh|建模/, { emoji: "🧊", label: "3D建模" }],
  [/音频|语音|音乐|TTS|播客|Whisper/, { emoji: "🎵", label: "音频处理" }],
  [/代码|编程|Copilot|Cursor|IDE|开发/, { emoji: "💻", label: "代码辅助" }],
  [/写作|文案|文本|翻译|营销/, { emoji: "✍️", label: "文案写作" }],
  [/设计|UI|UX|Figma|Sketch|原型/, { emoji: "🎯", label: "设计辅助" }],
  [/搜索|问答|知识|RAG|检索/, { emoji: "🔍", label: "智能搜索" }],
  [/数据|分析|可视化|报表|BI/, { emoji: "📊", label: "数据分析" }],
  [/自动化|工作流|Agent|RPA|批量/, { emoji: "⚙️", label: "流程自动化" }],
  [/教育|学习|培训|课程/, { emoji: "📚", label: "教育学习" }],
  [/医疗|健康|诊断/, { emoji: "🏥", label: "医疗健康" }],
  [/电商|购物|商品|营销/, { emoji: "🛒", label: "电商营销" }],
  [/聊天|对话|客服|社交/, { emoji: "💬", label: "对话交互" }],
];

export const CAPABILITY_TAGS: [RegExp, string][] = [
  [/ComfyUI|Stable.?Diffusion|SD/, "集成：ComfyUI/SD"],
  [/Figma/, "集成：Figma"],
  [/Blender/, "集成：Blender"],
  [/Photoshop|PS/, "集成：Photoshop"],
  [/API|SDK/, "提供API"],
  [/插件|Plugin|Extension/, "插件形式"],
  [/开源|GitHub|Open.?Source/i, "开源项目"],
  [/Chrome|浏览器/, "浏览器扩展"],
  [/VS ?Code|IDE/, "IDE集成"],
  [/Slack|Discord|飞书|钉钉/, "团队集成"],
];

export function extractToolName(title: string): string {
  const m = title.match(/^([A-Z][\w.]*(?:\s[A-Z][\w.]*){0,2})/);
  if (m) return m[1];
  const m2 = title.match(/^([\u4e00-\u9fa5]{2,6})/);
  if (m2) return m2[1];
  return title.split(/[\s：:—\-|·]/)[0].trim().slice(0, 20);
}

export function matchSceneType(
  title: string,
  category: string | null,
  tags: string | null
): { emoji: string; label: string } {
  const text = [title, category ?? "", tags ?? ""].join(" ");
  for (const [re, val] of SCENE_TYPES) {
    if (re.test(text)) return val;
  }
  return { emoji: "🤖", label: "AI应用" };
}

export function matchCapabilityTag(
  title: string,
  summary: string | null,
  tags: string | null
): string | null {
  const text = [title, summary ?? "", tags ?? ""].join(" ");
  for (const [re, val] of CAPABILITY_TAGS) {
    if (re.test(text)) return val;
  }
  return null;
}
