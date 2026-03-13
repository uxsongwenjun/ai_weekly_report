import type { WeekData, WeekListItem } from "./db/queries";

/**
 * 客户端取数：根据 weekId（YYYY-WNN 格式）获取指定期完整数据
 */
export async function loadWeek(weekId: string): Promise<WeekData | null> {
  const res = await fetch(`/api/week/${weekId}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * 获取所有已发布期列表
 */
export async function loadWeekList(): Promise<WeekListItem[]> {
  const res = await fetch("/api/week/list");
  if (!res.ok) return [];
  return res.json();
}
