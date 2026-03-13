import { NextResponse } from "next/server";
import { getWeekList } from "@/lib/db/queries";
import { errInternal } from "@/lib/api-error";

export const revalidate = 300;

/** GET /api/week/list — 获取所有已发布期列表 */
export async function GET() {
  try {
    const weeks = await getWeekList();
    return NextResponse.json(weeks);
  } catch (e: unknown) {
    return errInternal(e);
  }
}
