import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { insertRawItems } from "@/lib/db/mutations";
import { auth } from "@/lib/auth";
import { RawItemSchema } from "@/lib/schemas";
import { errUnauthorized, errValidation, errInternal } from "@/lib/api-error";

/**
 * POST /api/data/raw
 *
 * 写入原始采集数据。支持单条或数组。
 *
 * Headers:
 *   x-api-key: <API_KEY>
 *
 * Body (单条或数组):
 *   {
 *     source_type: string       必填，数据来源类型 (e.g. "rss", "github", "skillsmp")
 *     source_name?: string      来源名称
 *     title?:       string      标题
 *     content?:     string      正文
 *     url?:         string      原文链接
 *     raw_data?:    string|object  原始数据（JSON对象或字符串均可）
 *   }
 */
export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return errUnauthorized(!!req.headers.get("x-api-key"));
  }

  try {
    const body = await req.json();
    const rawItems = Array.isArray(body) ? body : [body];
    const validated = RawItemSchema.array().parse(rawItems);
    await insertRawItems(validated as Parameters<typeof insertRawItems>[0]);
    return NextResponse.json({ ok: true, inserted: validated.length });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return errValidation(
        e.issues,
        'Required field: source_type (string). All other fields are optional.',
      );
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON", fix: "Ensure the request body is valid JSON." },
        { status: 400 },
      );
    }
    return errInternal(e);
  }
}
