import { NextResponse } from "next/server";
import { getWeekData } from "@/lib/db/queries";
import { errNotFound, errInternal } from "@/lib/api-error";

export const revalidate = 300;

interface RouteParams {
  params: Promise<{ weekId: string }>;
}

/** GET /api/week/:weekId — 获取指定期完整数据（供 loadWeek 客户端取数） */
export async function GET(_req: Request, { params }: RouteParams) {
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
    return NextResponse.json(data);
  } catch (e: unknown) {
    return errInternal(e);
  }
}
