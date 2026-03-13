import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weeks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { upsertWeek } from "@/lib/db/mutations";
import { errUnauthorized, errValidation, errInternal } from "@/lib/api-error";

/**
 * GET /api/data/weeks
 *
 * 列出所有期（含 draft），管理用。无需鉴权。
 *
 * 成功: [{ id, period, date_range, status, created_at, updated_at }, ...]
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await db
      .select()
      .from(weeks)
      .orderBy(desc(weeks.id))
      .all();
    return NextResponse.json(all);
  } catch (e: unknown) {
    return errInternal(e);
  }
}

const CreateWeekSchema = z.object({
  id:            z.string().min(1),
  period:        z.string().min(1),
  date_range:    z.string().min(1),
  intro:         z.string().optional(),
  keywords:      z.union([z.string(), z.array(z.string())]).optional(),
  data_source_line: z.string().optional(),
  status:        z.enum(["draft", "published"]).optional(),
});

/**
 * POST /api/data/weeks
 *
 * 创建或更新一期记录（upsert）。
 *
 * Headers:
 *   x-api-key: <API_KEY>
 *
 * Body:
 *   {
 *     id:            string    必填，如 "2026-W11"
 *     period:        string    必填，如 "第 3 期"
 *     date_range:    string    必填，如 "2026.03.16-03.22"
 *     intro?:        string
 *     keywords?:     string|string[]
 *     data_source_line?: string
 *     status?:       "draft" | "published"   默认 "draft"
 *   }
 *
 * 成功: { ok: true, weekId: string, action: "created"|"updated" }
 */
export async function POST(req: NextRequest) {
  if (!auth(req)) return errUnauthorized(!!req.headers.get("x-api-key"));

  try {
    const body = await req.json();
    const parsed = CreateWeekSchema.parse(body);

    const existing = await db
      .select({ id: weeks.id })
      .from(weeks)
      .where(eq(weeks.id, parsed.id))
      .get()
      .catch(() => null);

    const keywords = Array.isArray(parsed.keywords)
      ? JSON.stringify(parsed.keywords)
      : (parsed.keywords ?? null);

    await upsertWeek({ ...parsed, keywords });

    return NextResponse.json({
      ok: true,
      weekId: parsed.id,
      action: existing ? "updated" : "created",
    });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return errValidation(
        e.issues,
        'Required fields: id (string, e.g. "2026-W11"), period (string), date_range (string).',
      );
    }
    return errInternal(e);
  }
}
