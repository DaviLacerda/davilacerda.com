#!/usr/bin/env node
/**
 * Tells IndexNow (Bing, which also feeds Copilot, plus Yandex, Seznam, Naver
 * and others) which pages changed, so they are recrawled in minutes instead of
 * whenever the crawler comes back. Reads the live sitemap and submits the URLs
 * whose `lastmod` is recent.
 *
 *   yarn indexnow                    # URLs changed today or yesterday (UTC)
 *   yarn indexnow --since 2026-10-01 # URLs changed on or after that day
 *   yarn indexnow --all              # every URL (first submission)
 *   yarn indexnow --dry-run          # print what would be sent
 *
 * The key is the file `public/<key>.txt` (its name and content are the key;
 * it is public by design, it only proves the site owns the submissions). The
 * GitHub workflow `.github/workflows/indexnow.yml` runs this after every
 * successful production deployment. Pass another origin as the last argument
 * to point it elsewhere (default https://davilacerda.com).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const positional = args.filter(
  (arg, i) => !arg.startsWith("--") && args[i - 1] !== "--since",
);
const origin = (positional[0] ?? "https://davilacerda.com").replace(/\/$/, "");

const keyFile = (await readdir(path.join(root, "public"))).find((name) =>
  /^[0-9a-f]{32}\.txt$/.test(name),
);
if (!keyFile) throw new Error("No IndexNow key file (public/<32 hex>.txt).");
const key = (await readFile(path.join(root, "public", keyFile), "utf8")).trim();

/** "YYYY-MM-DD" of yesterday in UTC: covers a deploy just after midnight. */
function yesterday() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

const since = flag("--all") ? "" : (option("--since") ?? yesterday());

const response = await fetch(`${origin}/sitemap.xml`);
if (!response.ok) throw new Error(`sitemap.xml: HTTP ${response.status}`);
const xml = await response.text();

const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
  .map(([, entry]) => ({
    loc: /<loc>([^<]+)<\/loc>/.exec(entry)?.[1]?.trim(),
    lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(entry)?.[1]?.trim() ?? "",
  }))
  .filter((url) => url.loc && url.lastmod.slice(0, 10) >= since)
  .map((url) => url.loc);

if (urls.length === 0) {
  console.log(`IndexNow: nothing changed since ${since}.`);
  process.exit(0);
}

const body = {
  host: new URL(origin).host,
  key,
  keyLocation: `${origin}/${keyFile}`,
  urlList: urls,
};

if (flag("--dry-run")) {
  console.log(JSON.stringify(body, null, 2));
  process.exit(0);
}

const result = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
// 200 = accepted, 202 = accepted while the key is being verified.
if (result.status !== 200 && result.status !== 202) {
  throw new Error(
    `IndexNow: HTTP ${result.status} ${await result.text().catch(() => "")}`,
  );
}
console.log(
  `IndexNow: submitted ${urls.length} URL(s) (HTTP ${result.status}).`,
);
