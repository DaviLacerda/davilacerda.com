"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  checkPin,
  ELENA_COOKIE,
  ELENA_PATH,
  sessionToken,
} from "@/lib/elena/server";

export type UnlockState = { error: boolean; attempt: number };

export async function unlock(
  previous: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const pin = String(formData.get("pin") ?? "").slice(0, 12);
  const token = sessionToken();

  if (!token || !checkPin(pin)) {
    // Slows down guessing a four-digit PIN.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { error: true, attempt: previous.attempt + 1 };
  }

  (await cookies()).set(ELENA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: ELENA_PATH,
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(ELENA_PATH);
}
