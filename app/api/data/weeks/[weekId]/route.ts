import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { auth } from "@/lib/auth";
import { getWeekData } from "@/lib/db/queries";
import { upsertWeek, upsertItems, deleteWeekItems, publishWeek, upsertSourceInfo, deleteWeekSourceInfo } from "@/lib/db/mutations";
import { WeekSchema, ItemSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { weeks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { errUnauthorized, errValidation, errNotFound, errInternal } from "@/lib/api-error";

const SourceInfoBodySchema = z.object({
  categories: z.string().optional(),
  statement: z.string().optional(),
  representative_sources: z.string().optional(),
});

type RouteContext = { params: Promise<{ weekId: string }> };

/**
 * GET /api/data/weeks/:weekId
 *
 * 获取指定期的完整数据（含所有条目）。无需鉴权。
 *
 * 成功: { ok: true, data: { week, topThree, industry, designTools, opensource, hotTopics, sourceInfo, totalItems } }
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { weekId } = await params;
  try {
    const data = await getWeekData(weekId);
    if (!data) {
      return errNotFound(
        "Week",
        weekId,
        'Use GET /api/week/list to see available week IDs. Format: YYYY-WNN (e.g. 2026-W10)',
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    return errInternal(e);
  }
}

const PutBodySchema = z.object({
  week: WeekSchema.optional(),
  items: z.array(ItemSchema).optional(),
  publish: z.boolean().optional(),
  source_info: SourceInfoBodySchema.optional(),
});

/**
 * PUT /api/data/weeks/:weekId
 *
 * 写入/更新一期内容。week、items、publish 均为可选，按需传入。
 * 传入 items 时会先删除该期所有旧条目再重新写入。
 *
 * Headers:
 *   x-api-key: <API_KEY>
 *
 * Body:
 *   {
 *     week?: {
 *       period?:          string          期号，如 "第 3 期"
 *       date_range?:      string          日期范围，如 "2026.03.16-03.22"
 *       intro?:           string          导语
 *       keywords?:        string|string[] 关键词
 *       data_source_line?:string          数据来源说明
 *       status?:          "draft"|"published"
 *     }
 *     items?: Array<{
 *       section:          "top_three"|"industry"|"design_tools"|"opensource"|"hot_topics"  必填
 *       title:            string          必填，最长200字
 *       summary?:         string
 *       highlight?:       string
 *       category?:        string
 *       tags?:            string|string[]
 *       image_url?:       string (URL)
 *       logo_url?:        string (URL)
 *       source_url?:      string (URL)
 *       author?:          string
 *       author_label?:    string
 *       author_avatar?:   string (URL)
 *       heat_data?:       string          JSON字符串，如 '{"likes":"1.2k"}'
 *       ai_summary?:      string
 *       ai_detail?:       string
 *       sort_order?:      number (0-10)
 *       source_platform?: string
 *       source_date?:     string
 *       source_type?:     string
 *     }>
 *     publish?: boolean                  true 时同步将该期状态改为 published
 *   }
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { weekId } = await params;
  if (!auth(req)) return errUnauthorized(!!req.headers.get("x-api-key"));

  try {
    const body = await req.json();
    const parsed = PutBodySchema.parse(body);

    if (parsed.week) {
      const existing = await db.select().from(weeks).where(eq(weeks.id, weekId)).get();
      const period = (parsed.week.period as string | undefined) ?? existing?.period ?? weekId;
      const date_range = (parsed.week.date_range as string | undefined) ?? existing?.date_range ?? weekId;
      const { keywords, ...rest } = parsed.week;
      const keywordsStr = Array.isArray(keywords) ? JSON.stringify(keywords) : (keywords ?? null);
      await upsertWeek({ ...rest, keywords: keywordsStr, id: weekId, period, date_range } as Parameters<typeof upsertWeek>[0]);
    }

    if (parsed.items && parsed.items.length > 0) {
      // Auto-create the week record if it doesn't exist, to avoid FK constraint failure
      const weekExists = await db.select({ id: weeks.id }).from(weeks).where(eq(weeks.id, weekId)).get();
      if (!weekExists) {
        await upsertWeek({ id: weekId, period: weekId, date_range: weekId });
      }

      await deleteWeekItems(weekId);
      const itemRows = parsed.items.map((item, idx) => ({
        week_id: weekId,
        section: item.section,
        title: item.title,
        summary: item.summary ?? null,
        highlight: item.highlight ?? null,
        category: item.category ?? null,
        tags: Array.isArray(item.tags) ? item.tags.join(",") : (item.tags ?? null),
        image_url: item.image_url ?? null,
        logo_url: item.logo_url ?? null,
        source_url: item.source_url ?? null,
        author: item.author ?? null,
        author_label: item.author_label ?? null,
        author_avatar: item.author_avatar ?? null,
        heat_data: item.heat_data ?? null,
        ai_summary: item.ai_summary ?? null,
        ai_detail: item.ai_detail ?? null,
        sort_order: item.sort_order ?? idx,
        source_platform: item.source_platform ?? null,
        source_date: item.source_date ?? null,
        source_type: item.source_type ?? null,
      }));
      await upsertItems(itemRows as Parameters<typeof upsertItems>[0]);
    }

    if (parsed.source_info) {
      await upsertSourceInfo({ week_id: weekId, ...parsed.source_info });
    }

    if (parsed.publish) {
      await publishWeek(weekId);
    }

    return NextResponse.json({ ok: true, weekId });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return errValidation(
        e.issues,
        'Check `week` fields and each item in `items`. Required per item: section (enum), title (string ≤200).',
      );
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON", fix: "Ensure the request body is valid JSON. Check for missing quotes, commas, or brackets." },
        { status: 400 },
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("FOREIGN KEY")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Foreign key constraint failed",
          fix: `Week "${weekId}" does not exist. Create it first via POST /api/data/weeks with { id, period, date_range }.`,
          detail: { weekId },
        },
        { status: 409 },
      );
    }
    return errInternal(e);
  }
}

const PatchBodySchema = z.object({
  period:           z.string().optional(),
  date_range:       z.string().optional(),
  intro:            z.string().optional(),
  keywords:         z.union([z.string(), z.array(z.string())]).optional(),
  data_source_line: z.string().optional(),
  status:           z.enum(["draft", "published"]).optional(),
});

/**
 * PATCH /api/data/weeks/:weekId
 *
 * 独立更新期元数据（不影响条目）。仅更新传入字段。
 * 适用于更新「本周速览」的导读文字（intro）和关键词标签（keywords）。
 *
 * Headers:
 *   x-api-key: <API_KEY>
 *
 * Body (所有字段均可选，只更新传入的字段):
 *   {
 *     period?:          string    期号，如 "第 3 期"
 *     date_range?:      string    日期范围，如 "2026.03.16-03.22"
 *     intro?:           string    导语（本周速览正文）
 *     keywords?:        string|string[]  关键词标签数组（本周速览标签）
 *     data_source_line?: string   数据来源说明
 *     status?:          "draft"|"published"
 *   }
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { weekId } = await params;
  if (!auth(req)) return errUnauthorized(!!req.headers.get("x-api-key"));

  try {
    const body = await req.json();
    const parsed = PatchBodySchema.parse(body);

    const existing = await db.select({ id: weeks.id }).from(weeks).where(eq(weeks.id, weekId)).get();
    if (!existing) {
      return errNotFound("Week", weekId, 'Create it first via POST /api/data/weeks with { id, period, date_range }.');
    }

    const { keywords, ...rest } = parsed;
    const keywordsStr = keywords !== undefined
      ? (Array.isArray(keywords) ? JSON.stringify(keywords) : keywords)
      : undefined;

    await db.update(weeks).set({
      ...(rest.period !== undefined && { period: rest.period }),
      ...(rest.date_range !== undefined && { date_range: rest.date_range }),
      ...(rest.intro !== undefined && { intro: rest.intro }),
      ...(rest.data_source_line !== undefined && { data_source_line: rest.data_source_line }),
      ...(rest.status !== undefined && { status: rest.status }),
      ...(keywordsStr !== undefined && { keywords: keywordsStr }),
      updated_at: new Date().toISOString(),
    }).where(eq(weeks.id, weekId)).run();

    return NextResponse.json({ ok: true, weekId });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return errValidation(e.issues, 'All fields are optional. Pass only the fields you want to update.');
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    return errInternal(e);
  }
}

/**
 * POST /api/data/weeks/:weekId
 *
 * 将指定期状态改为 published（发布）。无需 body。
 *
 * Headers:
 *   x-api-key: <API_KEY>
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { weekId } = await params;
  if (!auth(req)) return errUnauthorized(!!req.headers.get("x-api-key"));

  try {
    await publishWeek(weekId);
    return NextResponse.json({ ok: true, weekId, status: "published" });
  } catch (e: unknown) {
    return errInternal(e);
  }
}

/**
 * DELETE /api/data/weeks/:weekId
 *
 * 删除指定期及其全部条目。不可恢复。
 *
 * Headers:
 *   x-api-key: <API_KEY>
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { weekId } = await params;
  if (!auth(req)) return errUnauthorized(!!req.headers.get("x-api-key"));

  try {
    await deleteWeekItems(weekId);
    await deleteWeekSourceInfo(weekId);
    await db.delete(weeks).where(eq(weeks.id, weekId)).run();
    return NextResponse.json({ ok: true, weekId });
  } catch (e: unknown) {
    return errInternal(e);
  }
}
