import { eq, desc, asc } from "drizzle-orm";
import { db } from "./index";
import { weeks, items, sourceInfo } from "./schema";
import type { Week, Item, SourceInfo } from "./schema";

export interface WeekData {
  week: Week;
  topThree: Item[];
  industry: Item[];
  designTools: Item[];
  opensource: Item[];
  hotTopics: Item[];
  sourceInfo: SourceInfo | null;
  totalItems: number;
  selectedItems: number;
}

export interface WeekListItem {
  id: string;
  period: string;
  date_range: string;
  status: string | null;
}

/** 获取所有已发布期列表（用于左侧导航） */
export async function getWeekList(): Promise<WeekListItem[]> {
  return db
    .select({
      id: weeks.id,
      period: weeks.period,
      date_range: weeks.date_range,
      status: weeks.status,
    })
    .from(weeks)
    .where(eq(weeks.status, "published"))
    .orderBy(desc(weeks.id))
    .all();
}

/** 获取最新发布期的 ID */
export async function getLatestWeekId(): Promise<string | null> {
  const row = await db
    .select({ id: weeks.id })
    .from(weeks)
    .where(eq(weeks.status, "published"))
    .orderBy(desc(weeks.id))
    .limit(1)
    .all();
  return row[0]?.id ?? null;
}

/** 获取指定期的完整数据 */
export async function getWeekData(weekId: string): Promise<WeekData | null> {
  const [week, allItems, info] = await Promise.all([
    db.select().from(weeks).where(eq(weeks.id, weekId)).get(),
    db.select().from(items).where(eq(items.week_id, weekId)).orderBy(asc(items.sort_order)).all(),
    db.select().from(sourceInfo).where(eq(sourceInfo.week_id, weekId)).get(),
  ]);

  if (!week) return null;

  const resolvedInfo = info ?? null;

  return {
    week,
    topThree: allItems.filter((i: Item) => i.section === "top_three"),
    industry: allItems.filter((i: Item) => i.section === "industry"),
    designTools: allItems.filter((i: Item) => i.section === "design_tools"),
    opensource: allItems.filter((i: Item) => i.section === "opensource"),
    hotTopics: allItems.filter((i: Item) => i.section === "hot_topics"),
    sourceInfo: resolvedInfo,
    totalItems: allItems.length,
    selectedItems: allItems.length,
  };
}
