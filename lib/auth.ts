import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

export function auth(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");
  const expected = process.env.API_KEY;
  if (!key || !expected) return false;
  try {
    const a = Buffer.from(key);
    const b = Buffer.from(expected);
    if (a.length !== b.length) {
      // Perform a dummy comparison to avoid timing leaks on length mismatch
      timingSafeEqual(Buffer.alloc(b.length), b);
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
