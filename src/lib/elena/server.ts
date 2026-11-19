import "server-only";

import {
  createDecipheriv,
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";

/*
 * The /elena page: a PIN checked on the server, a signed cookie, and the
 * photos, videos and texts kept encrypted in private/elena (the repository is
 * public). See scripts/elena-pack.mjs.
 */

export const ELENA_COOKIE = "elena_session";
export const ELENA_PATH = "/elena";

/** sha256("elena:<pin>"). The PIN can be overridden with ELENA_PIN. */
const PIN_HASH =
  "8e976785d408f0be84bdec19d78a4a8f43a28545bdbc895301ef55a5402824f5";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

let warned = false;

export function mediaKey(): Buffer | null {
  // Tolerate a value pasted with its name, quotes or spaces around it.
  const raw = (process.env.ELENA_MEDIA_KEY ?? "")
    .trim()
    .replace(/^ELENA_MEDIA_KEY=/, "")
    .replace(/^["']|["']$/g, "")
    .trim();
  const key = raw ? Buffer.from(raw, "base64") : null;
  if (key?.length === 32) return key;
  if (!warned) {
    warned = true;
    // Says what is wrong without printing the value.
    console.error(
      raw
        ? `[elena] ELENA_MEDIA_KEY decodes to ${key?.length ?? 0} bytes, expected 32 (value length ${raw.length})`
        : "[elena] ELENA_MEDIA_KEY is not set in this environment",
    );
  }
  return null;
}

export function checkPin(pin: string): boolean {
  const expected = process.env.ELENA_PIN
    ? sha256(`elena:${process.env.ELENA_PIN}`)
    : Buffer.from(PIN_HASH, "hex");
  return safeEqual(sha256(`elena:${pin}`), expected);
}

/** The cookie value: an HMAC only the server (holder of the media key) can make. */
export function sessionToken(): string | null {
  const key = mediaKey();
  if (!key) return null;
  return createHmac("sha256", key)
    .update("elena-session-v1")
    .digest("base64url");
}

export async function isUnlocked(): Promise<boolean> {
  const token = sessionToken();
  const value = (await cookies()).get(ELENA_COOKIE)?.value;
  if (!token || !value) return false;
  return safeEqual(Buffer.from(value), Buffer.from(token));
}

const NAME = /^[a-z0-9-]+\.(webp|jpg|png|mp4|m4a|json)$/;
const cache = new Map<string, Buffer>();

/** Decrypted bytes of private/elena/<name>.enc, or null if missing. */
export async function readMedia(name: string): Promise<Buffer | null> {
  if (!NAME.test(name)) return null;
  const cached = cache.get(name);
  if (cached) return cached;
  const key = mediaKey();
  if (!key) return null;
  let raw: Buffer;
  try {
    raw = await readFile(
      join(process.cwd(), "private", "elena", `${name}.enc`),
    );
  } catch {
    return null;
  }
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  const data = Buffer.concat([
    decipher.update(raw.subarray(28)),
    decipher.final(),
  ]);
  cache.set(name, data);
  return data;
}
