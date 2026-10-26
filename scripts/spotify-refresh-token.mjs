#!/usr/bin/env node
/**
 * One-time helper for the Personal tab's "now playing" card: gets the
 * Spotify refresh token that `/api/now-playing` uses (README, "Spotify now
 * playing").
 *
 *   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... yarn spotify:token
 *
 * (or put both in .env.local). It prints the Spotify authorize URL, waits on
 * http://127.0.0.1:8888/callback (add that exact redirect URI to the app in
 * the Spotify dashboard), exchanges the code and prints SPOTIFY_REFRESH_TOKEN.
 * Scopes: user-read-currently-playing user-read-recently-played.
 */
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

const HOST = "127.0.0.1";
const PORT = 8888;
const REDIRECT_URI = `http://${HOST}:${PORT}/callback`;
const SCOPES = "user-read-currently-playing user-read-recently-played";
const TIMEOUT_MS = 5 * 60 * 1000;

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: the variables come from the environment.
}

const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
if (!clientId || !clientSecret) {
  console.error(
    "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET (from your app at https://developer.spotify.com/dashboard), in the environment or in .env.local.",
  );
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
authorizeUrl.search = new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  scope: SCOPES,
  redirect_uri: REDIRECT_URI,
  state,
}).toString();

function page(title, body) {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1 style="font-size:1.25rem">${title}</h1><p>${body}</p></body>`;
}

async function exchange(code) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.refresh_token) {
    throw new Error(
      `Token exchange failed (${response.status}): ${data.error_description ?? data.error ?? "no refresh token"}`,
    );
  }
  return data;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", REDIRECT_URI);
  if (url.pathname !== "/callback") {
    response.writeHead(404).end();
    return;
  }
  const finish = (status, title, body, exitCode) => {
    response
      .writeHead(status, { "Content-Type": "text/html; charset=utf-8" })
      .end(page(title, body));
    server.close();
    clearTimeout(timeout);
    process.exitCode = exitCode;
  };

  if (url.searchParams.get("state") !== state) {
    finish(400, "State mismatch", "Run the script again.", 1);
    console.error("State mismatch: ignoring this callback.");
    return;
  }
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error || !code) {
    finish(400, "Not authorized", `Spotify said: ${error ?? "no code"}.`, 1);
    console.error(`Authorization failed: ${error ?? "no code"}`);
    return;
  }

  try {
    const tokens = await exchange(code);
    finish(
      200,
      "Done",
      "The refresh token is in your terminal. You can close this tab.",
      0,
    );
    console.log(`\nScopes granted: ${tokens.scope}`);
    console.log(
      "\nAdd these to Vercel (Settings > Environment Variables, Production and Preview), then redeploy:\n",
    );
    console.log(`SPOTIFY_CLIENT_ID=${clientId}`);
    console.log("SPOTIFY_CLIENT_SECRET=<the client secret you used>");
    console.log(`SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (caught) {
    finish(500, "Token exchange failed", "See the terminal.", 1);
    console.error(
      caught instanceof Error
        ? `${caught.message}${caught.cause instanceof Error ? ` (${caught.cause.message})` : ""}`
        : caught,
    );
  }
});

const timeout = setTimeout(() => {
  console.error("Timed out after 5 minutes without a callback.");
  server.close();
  process.exitCode = 1;
}, TIMEOUT_MS);

server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${PORT} is busy: free it and run the script again.`
      : error.message,
  );
  clearTimeout(timeout);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(
    `Redirect URI (must be listed in your Spotify app): ${REDIRECT_URI}`,
  );
  console.log("\nOpen this URL, sign in to Spotify and accept:\n");
  console.log(`${authorizeUrl}\n`);
  console.log("Waiting for Spotify...");
});
