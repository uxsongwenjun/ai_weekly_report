import { eq } from "drizzle-orm";
import { db } from "./index";
import { weeks, items, rawItems, sources, sourceInfo } from "./schema";
import type { Week, Item, RawItem, Source } from "./schema";

// ─── Weeks ────────────────────────────────────────────────────────────────────

export async function upsertWeek(data: Partial<Week> & { id: string; period: string; date_range: string }) {
  const existing = await db.select({ id: weeks.id }).from(weeks).where(eq(weeks.id, data.id)).get();
  if (!existing) {
    // INSERT — new week
    return db
      .insert(weeks)
      .values({ ...data, updated_at: new Date().toISOString() })
      .run();
  }
  // UPDATE — only update provided (non-undefined) fields; never touch id / created_at
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, created_at, ...updateFields } = data;
  return db
    .update(weeks)
    .set({ ...updateFields, updated_at: new Date().toISOString() })
    .where(eq(weeks.id, data.id))
    .run();
}

export async function publishWeek(weekId: string) {
  return db
    .update(weeks)
    .set({ status: "published", updated_at: new Date().toISOString() })
    .where(eq(weeks.id, weekId))
    .run();
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function insertItem(data: Omit<Item, "id" | "created_at">) {
  return db.insert(items).values(data).run();
}

export async function upsertItems(data: Array<Omit<Item, "id" | "created_at">>) {
  return db.insert(items).values(data).run();
}

export async function updateItemField(id: number, field: string, value: string) {
  const allowedFields = ["title", "summary", "highlight", "ai_summary", "ai_detail", "tags", "heat_data", "sort_order", "image_url", "logo_url"];
  if (!allowedFields.includes(field)) throw new Error(`Field '${field}' not updatable`);
  return db.update(items).set({ [field]: value }).where(eq(items.id, id)).run();
}

export async function deleteWeekItems(weekId: string) {
  return db.delete(items).where(eq(items.week_id, weekId)).run();
}

// ─── Raw Items ────────────────────────────────────────────────────────────────

export async function insertRawItems(data: Array<Omit<RawItem, "id" | "collected_at" | "processed">>) {
  if (data.length === 0) return;
  return db.insert(rawItems).values(data).run();
}

export async function markRawProcessed(ids: number[]) {
  for (const id of ids) {
    await db.update(rawItems).set({ processed: 1 }).where(eq(rawItems.id, id)).run();
  }
}

export async function getUnprocessedRaw() {
  return db.select().from(rawItems).where(eq(rawItems.processed, 0)).all();
}

// ─── Sources ─────────────────────────────────────────────────────────────────

export async function getSources(type?: string) {
  const q = db.select().from(sources).where(eq(sources.active, 1));
  void type;
  return q.all();
}

export async function insertSource(data: Omit<Source, "id" | "created_at">) {
  return db.insert(sources).values(data).run();
}

// ─── Source Info ──────────────────────────────────────────────────────────────

export async function upsertSourceInfo(data: {
  week_id: string;
  categories?: string;
  statement?: string;
  representative_sources?: string;
}) {
  const existing = await db
    .select({ week_id: sourceInfo.week_id })
    .from(sourceInfo)
    .where(eq(sourceInfo.week_id, data.week_id))
    .get();
  if (!existing) {
    return db.insert(sourceInfo).values({ ...data, updated_at: new Date().toISOString() }).run();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { week_id, ...updateFields } = data;
  return db
    .update(sourceInfo)
    .set({ ...updateFields, updated_at: new Date().toISOString() })
    .where(eq(sourceInfo.week_id, data.week_id))
    .run();
}

export async function deleteWeekSourceInfo(weekId: string) {
  return db.delete(sourceInfo).where(eq(sourceInfo.week_id, weekId)).run();
}
