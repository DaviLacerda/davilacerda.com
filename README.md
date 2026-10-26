# davilacerda.com

Personal site of Davi Lacerda, AI Engineer. Bilingual (English and Brazilian Portuguese),
light and dark themes, statically generated with Next.js and deployed on Vercel.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) and React 19
- TypeScript (strict)
- [Tailwind CSS v4](https://tailwindcss.com/) and next-themes
- Markdown blog with unified, remark, rehype and Shiki

## Getting started

```bash
yarn install
yarn dev        # http://localhost:3000
yarn build      # production build
yarn lint       # ESLint
yarn typecheck  # TypeScript
```

## Spotify now playing

The Personal tab shows what Davi is listening to on Spotify (or the last song played). The page
asks `/api/now-playing` every 30 seconds while it is open, and that route asks the Spotify Web API
with a refresh token. Without the three variables below the card is a link to the Spotify profile
and the route answers `{"status":"unconfigured"}`, so local builds and previews work as they are.

One-time setup:

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   (any name; tick "Web API"). Since February 2026, apps in Development Mode only work while the
   app owner has Spotify Premium.
2. In the app's settings, add the redirect URI `http://127.0.0.1:8888/callback` exactly (Spotify
   no longer accepts `localhost`) and copy the Client ID and Client Secret.
3. Run the helper with them (or put them in `.env.local`; see `.env.example`):

   ```bash
   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... yarn spotify:token
   ```

   Open the URL it prints, sign in with the Spotify account to show and accept. It prints
   `SPOTIFY_REFRESH_TOKEN` (scopes `user-read-currently-playing` and `user-read-recently-played`).

4. In Vercel, Project Settings > Environment Variables, add `SPOTIFY_CLIENT_ID`,
   `SPOTIFY_CLIENT_SECRET` and `SPOTIFY_REFRESH_TOKEN` for Production and Preview (mark them
   Sensitive), then redeploy.

Check it with `curl https://davilacerda.com/api/now-playing`: `playing` or `recent` means it works,
`offline` means Spotify refused (check the function logs), `unconfigured` means a variable is missing.
Responses are cached on the CDN for 30 seconds. To revoke access, remove the app at
[spotify.com/account/apps](https://www.spotify.com/account/apps/).

## Writing posts

See [content/blog/README.md](content/blog/README.md).

## For agents

Every page has a Markdown version (append `.md`, or send `Accept: text/markdown`). The site also
publishes `/llms.txt`, `/llms-full.txt`, JSON and JSON Resume under `/api` and `/resume.json`, a
read-only MCP server at `/mcp`, and discovery documents under `/.well-known` (API catalog, MCP
server card, agent skill). See "Agent readiness" in [ARCHITECTURE.md](ARCHITECTURE.md).

## Project structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for folders, design tokens, components and conventions.
