/**
 * 将 ISO 周 ID（如 '2026-W10'）转为 { start, end } Date 对象
 */
export function weekIdToDates(weekId: string): { start: Date; end: Date } {
  const [year, weekStr] = weekId.split("-W");
  const week = parseInt(weekStr, 10);
  const y = parseInt(year, 10);

  // Jan 4 is always in week 1 (ISO standard)
  const jan4 = new Date(y, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // make Sunday = 7
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return { start: weekStart, end: weekEnd };
}

/**
 * 将日期转为 ISO 周 ID
 */
export function dateToWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * 格式化显示用日期范围（如 '2026.03.04-03.10'）
 */
export function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const s = fmt(start);
  const e = `${String(end.getMonth() + 1).padStart(2, "0")}.${String(end.getDate()).padStart(2, "0")}`;
  return `${s}-${e}`;
}

/**
 * 生成期号文字（如 '第 3 期'）
 */
export function formatPeriod(n: number): string {
  return `第 ${n} 期`;
}

/**
 * 当前周的 weekId
 */
export function currentWeekId(): string {
  return dateToWeekId(new Date());
}
