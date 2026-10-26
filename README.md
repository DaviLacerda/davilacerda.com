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
with a refresh token. Without the three variables below the tile shows the Spotify logo,
`@dlacerda9` and "Listen on Spotify", linking to the profile, and the route answers
`{"status":"unconfigured"}`, so local builds and previews work as they are.

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

## Currently watching

The Watching tile on the Personal tab reads `watching` in
[`src/content/personal.ts`](src/content/personal.ts). To change the show, edit its one entry:

```ts
{ title: "Georgie & Mandy's First Marriage", year: 2024, network: "CBS", url: "https://en.wikipedia.org/wiki/Georgie_%26_Mandy%27s_First_Marriage" },
```

The poster comes from [TVMaze](https://www.tvmaze.com/api) by the title (no key, cached for a day). To use your own image instead, add `poster: "/images/watching/<file>"`.

`url` (a page about the show) and `network` are optional. Without a poster the tile sets the
title's initials on a dark card; to show a poster, put a file you are allowed to use in `public/`
(2:3, e.g. `public/images/watching/show.webp`) and add `poster: "/images/watching/show.webp"`.
The Personal Markdown and `/llms-full.txt` follow on the next build.

## My teams

"My teams" shows the live, last or next game of each team in `teams` in
[`src/content/personal.ts`](src/content/personal.ts), from ESPN's public site API (no key).
To add or change a team, copy an entry and set:

- `sport`: `basketball`, `football` or `soccer`; `league`: ESPN's slug (`nba`, `nfl`, `bra.1`
  for the Brasileirão; for a club, every competition ESPN has is covered anyway);
- `espnId`: ESPN's team number. For a club it is in the espn.com URL
  (`espn.com/soccer/team/_/id/874/corinthians`); for an NBA or NFL team, open
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/bkn` (or
  `football/nfl/teams/min`) and read `team.id`;
- `logo`: `espnLogo("nba", "bkn")`, `espnLogo("nfl", "min")` or `espnLogo("soccer", "874")`.

Each card is told from Davi's team's side: the team first (big logo, name, competition), then
the result in words ("Lost 136 to 109", "Perdeu de 136 a 109"; live, "Leading 14 to 10"), then
the opponent and where it was played ("vs Pacers" at home, "at Lions" away). In Portuguese a club
whose name is feminine ("a Chapecoense", "da Ponte Preta") must be in the list in `articles()` in
[`src/lib/teams/types.ts`](src/lib/teams/types.ts).

Check it with `curl https://davilacerda.com/api/teams`. When ESPN cannot be read the cards show
the teams and "No game data right now". To preview every state locally, open
`/en/personal?mock=live` (or `final`, `upcoming`, `mixed`, `unavailable`) under `yarn dev`, or
under `yarn start` started with `PERSONAL_MOCKS=1`; the live site ignores `?mock=`.

## Games

The Games tile has Valorant and Rainbow Six Siege (rank, K/D, win rate and level, linking to
Tracker.gg), a Steam card and PlayStation (PSNProfiles); the handles are in `steam` and
`gameProfiles` in [`src/content/personal.ts`](src/content/personal.ts). Every key is optional:
without one, that row is a link to the profile, as before.

| Card              | Shows                                                                   | Setup                       |
| ----------------- | ----------------------------------------------------------------------- | --------------------------- |
| Valorant          | rank with its emblem, RR, K/D and win rate (last 20 competitive), level | `HENRIK_API_KEY` (optional) |
| Rainbow Six Siege | rank, RP, K/D, win rate and level for this season                       | `R6DATA_API_KEY` (optional) |
| Steam             | playing now, the last two weeks, library size                           | `STEAM_API_KEY` (optional)  |
| PlayStation       | a link to PSNProfiles (PlayStation has no public API)                   | none                        |

Tracker.gg has no embed for a website (only stream overlays) and its API does not cover these
two games, so the stats come from two community APIs built on the official data; nothing is
scraped. Riot ID `davi#XVI` (region `br`) and Ubisoft name `Hydroon.` are the `stats` entries in
`gameProfiles`.

Valorant, optional:

1. Open the HenrikDev dashboard at
   [api.henrikdev.xyz/dashboard](https://api.henrikdev.xyz/dashboard/) and sign in.
2. Choose "API Keys" in the sidebar and fill out "Generate New Key" (a basic key is plenty: the
   site asks a few times an hour, whatever the traffic). Copy the key.
3. In Vercel, add `HENRIK_API_KEY` (Sensitive) for Production and Preview and redeploy.

Rainbow Six Siege, optional:

1. Create an account at [r6.arenyze.com](https://r6.arenyze.com) (R6Data, by Arenyze; plans at
   [r6.arenyze.com/pricing](https://r6.arenyze.com/pricing)).
2. Create an API key in the dashboard at [r6.arenyze.com/dashboard](https://r6.arenyze.com/dashboard)
   and copy it. The site asks once every 30 minutes.
3. In Vercel, add `R6DATA_API_KEY` (Sensitive) for Production and Preview and redeploy (the
   page reserves room for the stats of the games whose key is set at build time).

Check them with `curl https://davilacerda.com/api/trackers`: `ok` for a game means it works,
`offline` means the API refused or could not find the player (check the function logs),
`unconfigured` means its key is missing. Responses are cached on the CDN for 10 minutes. Preview
them locally with `/en/personal?mock=ranked` (or any team scenario; `offline` shows the links).

Steam, optional:

1. Get a Web API key at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
   (signed in to Steam; any domain name, e.g. `davilacerda.com`).
2. On Steam, set the profile and its game details to Public (Edit Profile > Privacy Settings),
   or the API answers without games.
3. In Vercel, add `STEAM_API_KEY` (Sensitive) for Production and Preview and redeploy. `STEAM_ID`
   (the 17-digit SteamID64) is optional: without it the server resolves `davi16lacerda` once.

Check it with `curl https://davilacerda.com/api/steam`: `ok` means it works, `offline` means Steam
refused (check the function logs), `unconfigured` means the key is missing. Responses are cached
on the CDN for a minute. Preview the states locally with `/en/personal?mock=playing` (or
`recent`, `idle`, `offline`).

## Writing posts

See [content/blog/README.md](content/blog/README.md).

## For agents

Every page has a Markdown version (append `.md`, or send `Accept: text/markdown`). The site also
publishes `/llms.txt`, `/llms-full.txt`, JSON and JSON Resume under `/api` and `/resume.json`, a
read-only MCP server at `/mcp`, and discovery documents under `/.well-known` (API catalog, MCP
server card, agent skill). See "Agent readiness" in [ARCHITECTURE.md](ARCHITECTURE.md).

## Project structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for folders, design tokens, components and conventions.
