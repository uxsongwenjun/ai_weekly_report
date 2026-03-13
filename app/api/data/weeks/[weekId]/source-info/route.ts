import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weeks, sourceInfo } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { upsertSourceInfo } from "@/lib/db/mutations";
import { errUnauthorized, errValidation, errNotFound, errInternal } from "@/lib/api-error";

type RouteContext = { params: Promise<{ weekId: string }> };

const SourceInfoSchema = z.object({
  categories:             z.string().optional(),
  statement:              z.string().optional(),
  representative_sources: z.string().optional(),
});

/**
 * GET /api/data/weeks/:weekId/source-info
 *
 * 获取指定期的来源信息。无需鉴权。
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { weekId } = await params;
  try {
    const info = await db
      .select()
      .from(sourceInfo)
      .where(eq(sourceInfo.week_id, weekId))
      .get();
    if (!info) {
      return errNotFound("SourceInfo", weekId, 'Use PUT to create source info for this week.');
    }
    return NextResponse.json({ ok: true, data: info });
  } catch (e: unknown) {
    return errInternal(e);
  }
}

/**
 * PUT /api/data/weeks/:weekId/source-info
 *
 * 写入或更新指定期的来源信息。不影响 items。
 *
 * Headers:
 *   x-api-key: <API_KEY>
 *
 * Body:
 *   {
 *     categories?:             string  来源分类（JSON字符串）
 *     statement?:              string  来源声明
 *     representative_sources?: string  代表性来源列表（JSON字符串）
 *   }
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { weekId } = await params;
  if (!auth(req)) return errUnauthorized(!!req.headers.get("x-api-key"));

  try {
    const body = await req.json();
    const parsed = SourceInfoSchema.parse(body);

    // Auto-create the week if it doesn't exist
    const weekExists = await db.select({ id: weeks.id }).from(weeks).where(eq(weeks.id, weekId)).get();
    if (!weekExists) {
      return errNotFound("Week", weekId, 'Create the week first via POST /api/data/weeks with { id, period, date_range }.');
    }

    await upsertSourceInfo({ week_id: weekId, ...parsed });

    return NextResponse.json({ ok: true, weekId });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return errValidation(e.issues, 'All fields are optional strings: categories, statement, representative_sources.');
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    return errInternal(e);
  }
}
