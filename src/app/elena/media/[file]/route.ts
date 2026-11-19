import { isUnlocked, readMedia } from "@/lib/elena/server";

/** The /elena page's photos, videos and texts, decrypted after the PIN. */
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  png: "image/png",
  mp4: "video/mp4",
  m4a: "audio/mp4",
  json: "application/json; charset=utf-8",
};

const BASE_HEADERS = {
  "Cache-Control": "private, max-age=86400",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Accept-Ranges": "bytes",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  if (!(await isUnlocked())) {
    return new Response("Not found", { status: 404 });
  }
  const { file } = await params;
  const data = await readMedia(file);
  if (!data) return new Response("Not found", { status: 404 });

  const type = TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream";
  const headers = { ...BASE_HEADERS, "Content-Type": type };

  // Safari only plays <video> served with byte ranges.
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range) {
    const size = data.length;
    let start = range[1] ? Number(range[1]) : NaN;
    let end = range[2] ? Number(range[2]) : size - 1;
    if (Number.isNaN(start)) {
      start = Math.max(0, size - end);
      end = size - 1;
    }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${size}` },
      });
    }
    return new Response(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new Response(new Uint8Array(data), {
    headers: { ...headers, "Content-Length": String(data.length) },
  });
}
