import { NextResponse } from "next/server";
import type { ZodIssue } from "zod";

/** 统一错误响应格式，帮助调用方快速定位并修复问题 */
export function apiError(
  status: number,
  error: string,
  fix: string,
  detail?: Record<string, unknown>,
) {
  return NextResponse.json({ ok: false, error, fix, ...(detail ? { detail } : {}) }, { status });
}

/** 401 — 鉴权失败 */
export function errUnauthorized(hasHeader: boolean) {
  return apiError(
    401,
    "Unauthorized",
    'Add header: x-api-key: <your API_KEY>',
    {
      header_name: "x-api-key",
      received: hasHeader ? "present but invalid" : "missing",
    },
  );
}

/** 400 — Zod 验证失败，格式化 issues 便于阅读 */
export function errValidation(issues: ZodIssue[], hint?: string) {
  const formatted = issues.map((i) => ({
    field: i.path.join(".") || "(root)",
    message: i.message,
    ...(("received" in i && i.received !== undefined) ? { received: i.received } : {}),
    ...(("expected" in i && i.expected !== undefined) ? { expected: i.expected } : {}),
  }));
  return NextResponse.json(
    {
      ok: false,
      error: "Request body validation failed",
      fix: hint ?? "Fix the fields listed in `issues` and retry.",
      issues: formatted,
    },
    { status: 400 },
  );
}

/** 404 — 资源不存在 */
export function errNotFound(resource: string, id: string, hint?: string) {
  return apiError(
    404,
    `${resource} not found`,
    hint ?? `Check the ${resource.toLowerCase()} ID and retry.`,
    { id },
  );
}

/** 500 — 服务器内部错误，暴露 message 便于排查 */
export function errInternal(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("[API Error]", e);
  return apiError(
    500,
    "Internal server error",
    "Check server logs for details.",
    { message },
  );
}
