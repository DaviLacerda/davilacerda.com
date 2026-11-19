/**
 * `yarn elena:pack <dir>`: encrypts every file of <dir> (the prepared photos,
 * videos and content.json of the /elena page) into private/elena/<name>.enc
 * with AES-256-GCM. The key is ELENA_MEDIA_KEY (32 bytes, base64), read from
 * the environment or .env.local. The repository is public, so only ciphertext
 * is committed; /elena/media/<name> decrypts on the server after the PIN.
 *
 * File layout: 12-byte IV | 16-byte auth tag | ciphertext.
 * New key: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
import { createCipheriv, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const NAME = /^[a-z0-9-]+\.(webp|jpg|png|mp4|m4a|json)$/;

function loadKey() {
  let raw = process.env.ELENA_MEDIA_KEY;
  if (!raw && existsSync(".env.local")) {
    const line = readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("ELENA_MEDIA_KEY="));
    raw = line?.slice("ELENA_MEDIA_KEY=".length).trim();
  }
  const key = raw ? Buffer.from(raw, "base64") : null;
  if (!key || key.length !== 32) {
    console.error(
      "ELENA_MEDIA_KEY must be 32 bytes, base64 (env or .env.local).",
    );
    process.exit(1);
  }
  return key;
}

const input = process.argv[2];
if (!input) {
  console.error("Usage: yarn elena:pack <dir>");
  process.exit(1);
}

const key = loadKey();
const out = join("private", "elena");
mkdirSync(out, { recursive: true });

let count = 0;
for (const file of readdirSync(input)) {
  if (!NAME.test(file)) continue;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(readFileSync(join(input, file))),
    cipher.final(),
  ]);
  writeFileSync(
    join(out, `${file}.enc`),
    Buffer.concat([iv, cipher.getAuthTag(), data]),
  );
  count++;
}
console.log(`Encrypted ${count} files into ${out}/`);
