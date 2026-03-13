import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weeks, rawItems, items } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const latestWeek = await db.select().from(weeks).orderBy(desc(weeks.id)).limit(1).get();
    const unprocessedCount = await db
      .select({ count: count() })
      .from(rawItems)
      .where(eq(rawItems.processed, 0))
      .get();
    const itemsCount = await db.select({ count: count() }).from(items).get();

    return NextResponse.json({
      ok: true,
      latestWeek: latestWeek ?? null,
      unprocessedRaw: unprocessedCount?.count ?? 0,
      totalItems: itemsCount?.count ?? 0,
    });
  } catch (e: unknown) {
    const { errInternal } = await import("@/lib/api-error");
    return errInternal(e);
  }
}
