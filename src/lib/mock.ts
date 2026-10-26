import "server-only";

import type { NextRequest } from "next/server";

/**
 * `?mock=<scenario>` on the Personal tab's live routes (`/api/teams`,
 * `/api/steam`): answered from fixtures in development, and in a production
 * build only when it was started with `PERSONAL_MOCKS=1` (for screenshots).
 * On the live site it is ignored. The page forwards its own `?mock=` to them.
 */
export function mockParam(request: NextRequest): string | null {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.PERSONAL_MOCKS !== "1"
  ) {
    return null;
  }
  return request.nextUrl.searchParams.get("mock");
}

export const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
};
