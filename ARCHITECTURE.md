# Architecture

Personal site of Davi Lacerda (AI Engineer). Bilingual (`en`, `pt-br`), light/dark,
statically generated, deployed on Vercel. Read this before adding pages.

**Stack:** Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript 6 (strict +
`noUncheckedIndexedAccess`), Tailwind CSS v4 (CSS-first config), next-themes, unified/remark/rehype

- Shiki for Markdown, lucide-react, @vercel/analytics. Package manager: **yarn** (v1).

Next 16 differs from older versions: check `node_modules/next/dist/docs/` before using an API
(`params` are Promises, `middleware` is now `proxy`, `next lint` is gone).

```bash
yarn dev          # http://localhost:3000 (redirects to /en or /pt-br)
yarn build        # production build (also type-checks)
yarn lint         # eslint . (flat config: next core-web-vitals + typescript + prettier)
yarn typecheck    # tsc --noEmit
yarn format       # prettier --write . (with the Tailwind class sorter)
```

## Layout

```
content/blog/<locale>/<slug>.md   Markdown posts (see content/blog/README.md)
public/                           favicons, images/logo.png (brand mark, violet #5b21b6)
src/
  proxy.ts                        locale redirect (cookie > Accept-Language > "en")
  app/
    globals.css                   design tokens + Tailwind theme + .markdown prose
    fonts.ts                      next/font: Instrument Serif / Instrument Sans / Geist Mono
    [lang]/layout.tsx             ROOT layout: <html lang>, providers, header, <main id="main">, footer
    [lang]/page.tsx               Work tab        (placeholder, to be built)
    [lang]/personal/page.tsx      Personal tab    (placeholder, to be built)
    [lang]/personal/blog/[slug]/  Blog post       (placeholder: renders title + body)
    [lang]/not-found.tsx          localized 404
    [lang]/[...rest]/page.tsx     sends unknown /<lang>/* paths to the 404
  components/
    layout/                       site-header, nav-tabs, locale-switcher, theme-toggle, monogram, site-footer
    providers/                    theme-provider (next-themes), alternate-links (locale switcher targets)
    seo/json-ld.tsx               <JsonLd data={...} />
    ui/                           container, section, eyebrow, button, tag, text-link, prose
    icons.tsx                     GitHub/LinkedIn/Instagram/Discord marks + <SocialIcon id />
  config/site.ts                  url, name, brand/theme colors, shared SEO keywords
  content/profile.ts              ALL facts about Davi (typed, bilingual). Single source of truth.
  i18n/                           config, negotiate, dictionaries/{en,pt-br}.ts, index (t, getDictionary), format (dates)
  lib/
    routes.ts                     URL builders + tab logic. Never hand-write internal paths.
    blog.ts                       post loader (server-only)
    markdown.ts                   markdown -> HTML pipeline (server-only)
    seo.ts                        buildMetadata() + JSON-LD builders
    utils.ts                      cn(), absoluteUrl(), isExternalUrl()
```

Import alias: `@/*` -> `src/*`.

## Routing and i18n

- Every page lives under `src/app/[lang]/`. `[lang]/layout.tsx` is the root layout (there is no
  `app/layout.tsx`). Root-level route handlers/metadata routes (`app/robots.ts`, `app/sitemap.ts`,
  `app/llms.txt/route.ts`, `app/manifest.ts`) are fine without a layout.
- `src/proxy.ts` redirects any path without a locale (`/`, `/personal`) to `/<locale>/...` and fixes
  wrong casing (`/pt-BR` -> `/pt-br`). It skips `_next/`, `api/`, any path with a dot
  (`robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, `rss.xml`, `manifest.webmanifest`,
  images) and `opengraph-image` / `twitter-image` / `icon` / `apple-icon`.
- `@/i18n`:
  - `locales = ["en", "pt-br"]`, `type Locale`, `defaultLocale = "en"`, `isLocale()` (type guard for params)
  - `localeMeta[lang]` -> `{ htmlLang: "pt-BR", hreflang, ogLocale: "pt_BR", intl, label, short }`
  - `getDictionary(lang)` (sync) -> typed UI strings. `en.ts` defines the shape (`Dictionary`);
    `pt-br.ts` must match it. **Add new keys to both files.**
  - `t(value, lang)` resolves an `L10n` (`{ en, "pt-br" }`) or passes a plain string through.
  - `interpolate("{minutes} min read", { minutes: 4 })`.
- `@/i18n/format`: `formatDate("2026-10-24", lang, "long" | "short")`, `formatPartialDate("2024-08", lang)`
  -> "Aug 2024", `formatDateRange(start, end, lang)` -> "Aug 2024 – Present" (`end: null` = present),
  `toIsoDate()` for `<time dateTime>`. All UTC.
- `@/lib/routes`: `routes.work(lang)` `/en`, `routes.personal(lang)`, `routes.blog(lang)`
  (`/en/personal#blog`, so give the blog section `id="blog"`), `routes.post(lang, slug)`,
  `routes.rss(lang)` (`/en/personal/blog/rss.xml`), plus `tabs`, `activeTab()`, `switchLocalePath()`.
- Locale switcher: swaps the prefix by default. Pages whose URL differs per locale (blog posts)
  render `<LocaleAlternates links={getPostAlternates(post)} />` (client, renders nothing). It also
  sets a `NEXT_LOCALE` cookie the proxy honours.

## Design system

Tokens are CSS variables in `src/app/globals.css` (`:root` = light, `.dark` = dark; next-themes
toggles the class, system preference by default) mapped to Tailwind colors:

| Utility (`bg-*`, `text-*`, `border-*`) | Use                                                   |
| -------------------------------------- | ----------------------------------------------------- |
| `background` / `foreground`            | page / primary text (warm paper #fbfaf7, ink #17171f) |
| `surface`                              | cards, code blocks (slightly lighter/darker than bg)  |
| `muted` / `muted-foreground`           | subtle fills / secondary text (>= 6:1 contrast)       |
| `border` / `border-strong`             | hairlines / hover and input borders                   |
| `accent` / `accent-foreground`         | brand violet (logo #5b21b6), AA in both themes        |
| `accent-subtle`                        | tinted fills (badges, highlighted code lines)         |
| `ring`                                 | focus outline (global `:focus-visible` already set)   |

Use opacity modifiers freely (`bg-background/70`, `border-accent/25`). Never hard-code hex colors.

**Fonts** (`fonts.ts`, variables on `<html>`): `font-display` Instrument Serif (headlines; only weight
400, use `italic` for emphasis, never bold), `font-sans` Instrument Sans (default body/UI),
`font-mono` Geist Mono (eyebrows, metadata, code).

**Type scale** (fluid, line-height/tracking included): `text-display` (hero name), `text-h1`,
`text-h2` (section titles), `text-h3`, `text-lead` (intro paragraphs), `text-eyebrow` (mono labels).
Pair display sizes with `font-display`. Body text is the default `1rem/1.6`.

**Layout:** `max-w-content` (42rem, reading), `max-w-page` (70rem, default), `max-w-wide` (80rem).
Prefer `<Container size>`; it adds the responsive gutter `clamp(1.25rem, 4vw, 2.5rem)`.
Section rhythm: `<Section>` uses `py-16 sm:py-24`.

**Motion:** `animate-fade-up`, `animate-fade-in`, easing `ease-editorial`. Stagger with
`style={{ animationDelay: "120ms" }}`. `prefers-reduced-motion` disables animations/transitions
globally; keep motion subtle and decorative.

**Other utilities:** `link-underline` (editorial underline that turns accent on hover),
`.markdown` (blog prose, Shiki code blocks with dual themes, heading anchors), `.site-backdrop`
(top accent glow; the body also has a faint film grain).

## Components

| Component                                                                | Notes                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `<Container as? size?="page">`                                           | centered column with gutter                                              |
| `<Section id eyebrow? title description? action? size?>`                 | `<section aria-labelledby>` + eyebrow + **h2** + description + children  |
| `<Eyebrow>`                                                              | mono uppercase label with an accent dash                                 |
| `<Button variant? size?>` / `<ButtonLink href ...>` / `buttonVariants()` | variants `primary` (ink), `accent`, `outline`, `ghost`; sizes `sm/md/lg` |
| `<TextLink href arrow? newTabLabel?>`                                    | inline link; external -> new tab + ↗                                     |
| `<Tag tone?="neutral" \| "accent">`                                      | stack chips, post tags, badges                                           |
| `<Prose html>`                                                           | renders `post.html` with `.markdown`                                     |
| `<SocialIcon id size?>` and `GitHubIcon`...                              | brand marks (lucide v1 has none); always label the link                  |
| `<JsonLd data={node \| node[]}>`                                         | adds `@context`; arrays become one `@graph`                              |
| `<LocaleAlternates links>`                                               | per-page locale switcher targets                                         |
| `SiteHeader`, `SiteFooter`, `NavTabs`, `LocaleSwitcher`, `ThemeToggle`   | already wired in the layout                                              |

Client components: only `nav-tabs`, `locale-switcher`, `theme-toggle`, the providers. Keep pages
as Server Components; add `"use client"` only for real interactivity (e.g. copy-email button).

## Content model (`src/content/profile.ts`)

`profile` holds name/fullName, `headline`, `tagline`, `valueProp`, `summary` (first person),
`tldr` (third person, factual: put it near the top of Work for answer engines), `location`,
`email`, `availability`, `currentEmployer`, `socials[]`, `highlights[]` (hero stats),
`experience[]` (`company, role, start, end|null, employmentType, workModel, location, description,
highlights, stack`), `projects[]` (`kind: "work" | "side"`, `featured`, `role?`, `award?`,
`repoUrl?`, `liveUrl?`, `stars?`), `skills[]` (groups `llm, rag, ml, backend, frontend, infra`),
`knowsAbout[]`, `certifications[]` (`kind: "certification" | "course"`, `level?`),
`education[]`, `achievements[]` (`featured` ones: the Conecta Latam award and the Microsoft
Expert certifications), `languages[]`, `faq[]` (rendered on Work and used for FAQPage JSON-LD).
Helpers: `allSkills()`, `getSocial(id)`, `getCertifications(kind?)`.

Rules: only verified facts; anything unknown has a `TODO(davi)` comment. No seniority levels or
formal titles for Algar (the role is "AI Engineer", Aug 2024–present). Dates are strings
(`"YYYY"`, `"YYYY-MM"`, `"YYYY-MM-DD"`); omitted = unknown (render nothing).

## Blog (`src/lib/blog.ts`, server-only)

`getAllPosts(lang)` -> `PostMeta[]` newest first (drafts only in dev) ·
`getPost(lang, slug)` -> `Post | null` (`html`, `headings` for a TOC, raw `markdown`) ·
`getPostSlugs(lang)` · `getAllPostParams()` (for `generateStaticParams`) ·
`getPostTranslations(post)` / `getPostAlternates(post)` (by `translationKey`) ·
`findTranslatedPostUrl(lang, slug)` (post page redirects cross-locale slugs) ·
`getAdjacentPosts(post)`. `PostMeta` = frontmatter + `lang, slug, url, readingTime, wordCount`.

## SEO (`src/lib/seo.ts`)

- `buildMetadata({ lang, title?, description, path? | alternates?, type?, keywords?, images?, article?, noIndex? })`
  returns full `Metadata`: canonical, hreflang (`en`, `pt-BR`, `x-default`), RSS alternate,
  OpenGraph (`en_US`/`pt_BR`, `website | article | profile`) and Twitter card. The layout adds the
  title template `"%s | Davi Lacerda"`; omit `title` on Work to get the default title. Always return
  the whole object from `generateMetadata` (Next merges shallowly). Prefer `opengraph-image.tsx`
  files over `images`.
- JSON-LD builders (bare nodes linked by `@id`): `personJsonLd(lang)`, `websiteJsonLd(lang)`,
  `profilePageJsonLd(lang, opts?)`, `breadcrumbJsonLd(items)`, `blogJsonLd(lang, posts)`,
  `blogPostingJsonLd(post, { image?, translations? })`, `faqPageJsonLd(lang, items?)`.
  Render with `<JsonLd data={[personJsonLd(lang), websiteJsonLd(lang), profilePageJsonLd(lang)]} />`.
- Helpers: `localizedPaths("/personal")`, `hreflangAlternates(paths)`, `jsonLdIds`.

## Page conventions

```tsx
type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return buildMetadata({
    lang,
    path: "/personal",
    title: dict.meta.personal.title,
    description: dict.meta.personal.description,
  });
}

export default async function Page({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  return <>{/* sections */}</>;
}
```

- The layout already renders `<main id="main">`, header and footer. Pages render sections only,
  with exactly **one `<h1>`**; `<Section>` titles are `<h2>`.
- All UI copy from the dictionary, all facts from `profile`, all internal URLs from `routes`.
- Semantic HTML: `<section>`, `<article>`, `<time dateTime>`, lists for lists; label icon-only links.
- Keep pages static (no `headers()`/`cookies()`), no client JS beyond small toggles.

## Known notes

- `next dev` (re)writes `AGENTS.md` pointing coding agents at the bundled Next docs; keep it committed.
- `/_vercel/insights/script.js` 404s locally (Vercel Analytics only exists on Vercel).
- For dynamic `notFound()` (unknown slug, `/en/foo`) Next 16 streams the 404 UI via the RSC payload
  (status 404 + `noindex`); the HTML shell itself is minimal. Known static pages are fully prerendered.

## Agent readiness (SEO, AEO, agents)

Goal: search engines, answer engines and AI agents get the same verified facts as people, in the
format they prefer, and can discover every machine-readable surface from any page (target: a top
score on [isitagentready.com](https://isitagentready.com)). Everything below is generated from
`src/content/profile.ts`, the dictionaries and `content/blog`, so nothing needs editing by hand.
All of it is static (`force-static` + `generateStaticParams`) except `/mcp`.

### Public surface

| Path                                                                                        | What                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/robots.txt`                                                                               | RFC 9309. `*` group plus an explicit AI crawler/agent group, both `Allow: /` with `Content-Signal: search=yes, ai-input=yes, ai-train=yes`; `Sitemap:` line.                                                                                   |
| `/sitemap.xml`                                                                              | Every page in every locale and every post, with `xhtml:link` hreflang (incl. `x-default`) and `lastmod` (last git commit of the profile sources; post `updated ?? date`).                                                                      |
| `/manifest.webmanifest`, `/icons/{icon-192,icon-512,maskable-512}.png`                      | Web app manifest and generated monogram icons.                                                                                                                                                                                                 |
| `opengraph-image` / `twitter-image`                                                         | Per locale for Work (`/[lang]`), Personal and each post (post title, description, date, reading time).                                                                                                                                         |
| `/llms.txt`, `/llms-full.txt`                                                               | [llmstxt.org](https://llmstxt.org) index; full text of both profiles, both Personal pages and every post.                                                                                                                                      |
| `/{lang}.md` (`/{lang}/index.md`), `/{lang}/personal.md`, `/{lang}/personal/blog/{slug}.md` | Markdown renditions (Work reads like a résumé). Also served for `Accept: text/markdown` on the HTML URL and on `/`.                                                                                                                            |
| `/api/profile.json`, `/api/posts.json`, `/api/{lang}/{profile,posts,resume}.json`           | JSON (profile localized per language; posts with Markdown URLs).                                                                                                                                                                               |
| `/resume.json`                                                                              | [JSON Resume](https://jsonresume.org) v1.0.0 (English; Portuguese at `/api/pt-br/resume.json`).                                                                                                                                                |
| `/api/openapi.json`, `/api/status.json`                                                     | OpenAPI 3.1 description of the read-only HTTP API; status document for the API catalog.                                                                                                                                                        |
| `/mcp`                                                                                      | MCP server, Streamable HTTP, stateless, read-only, no auth. Tools `get_profile`, `list_posts`, `get_post`, `search`; resources (both profiles, both Personal pages, llms.txt, every post via a `{lang}/{slug}` template); prompt `assess_fit`. |
| `/.well-known/api-catalog`                                                                  | RFC 9727 linkset (`application/linkset+json`), each API with `service-desc`, `service-doc`, `status`.                                                                                                                                          |
| `/.well-known/mcp/server-card.json`, `/.well-known/mcp.json`                                | MCP server card (SEP-1649 draft): transport, capabilities, tools with JSON Schemas, resources, prompts.                                                                                                                                        |
| `/.well-known/agent-skills/index.json`, `.../about-davi-lacerda/SKILL.md`                   | Agent Skills discovery index (v0.2.0, with `sha256` digest) and the skill itself.                                                                                                                                                              |
| `/.well-known/ai-catalog.json` (`ard.json` alias), `/.well-known/poppy.json`                | Agent Resource Discovery catalog; Poppy manifest.                                                                                                                                                                                              |

Every HTML page also carries:

- an RFC 8288 `Link` header (set in the proxy): canonical, hreflang alternates, the Markdown
  alternate, `api-catalog`, `service-desc` (OpenAPI), `service-doc` (SKILL.md), `describedby`
  (llms.txt and the MCP server card), `sitemap` and RSS. Non-ASCII titles use RFC 8187 `title*`
  (header values must be ByteStrings, so a raw "–" throws in the proxy);
- the same discovery `<link>`s in `<head>` (`src/components/agents/agent-discovery.tsx`) plus
  `<link rel="alternate" type="text/markdown">` from `buildMetadata` (`markdownAlternate()` in `seo.ts`);
- WebMCP (`src/components/agents/web-mcp.tsx`): a tiny inline script that, only when the browser
  exposes `document.modelContext` (or the older `navigator.modelContext`), registers read-only
  `get_profile`, `list_posts` and `get_post` tools backed by the same-origin JSON/Markdown.

Both are mounted once in `src/app/[lang]/layout.tsx` via `<AgentDiscovery />`.

### Code map

- `src/lib/agents/discovery.ts`: paths, page parsing (`parsePagePath`, `pagePath`, `markdownPath`),
  `prefersMarkdown(accept)`, Link header builders. Dependency-free (imported by the proxy).
- `src/lib/agents/markdown.ts`: Work/Personal/post Markdown, `llms.txt`, `llms-full.txt`.
- `src/lib/agents/json.ts`: profile/posts JSON, JSON Resume, status, OpenAPI document.
- `src/lib/agents/search.ts`: keyword search over profile sections and post sections (MCP `search`).
- `src/lib/agents/mcp.ts`: the MCP server factory; `well-known.ts`: API catalog, server card,
  SKILL.md + index, ARD and Poppy documents.
- `src/lib/agents/labels.ts`: strings only machines read (Markdown labels), kept out of the dictionaries.
- `src/lib/agents/{posts,dates,localize,http}.ts`: raw post bodies, git-based `lastmod`,
  `{ en, "pt-br" }` resolution, response helpers (CORS, `x-markdown-tokens`, `Content-Signal`).
- `src/lib/og/`: OG template and fonts (Instrument Serif, Geist Mono; TTF subset to Latin and
  Latin-1, OFL licences alongside). Satori cannot read woff2, hence the separate TTFs. A title with
  characters outside that range would need the fonts re-subset with `pyftsubset`.
- `src/app/markdown/**`: internal Markdown routes. Only reached through proxy rewrites; requested
  directly they get a locale prefix and 404.

### Proxy (`src/proxy.ts`)

1. `*.md` -> rewrite to `/markdown/...` (unknown page: 404).
2. `/{lang}/...`: if `Accept` explicitly prefers `text/markdown` (q above zero and at least the
   HTML q; `*/*` never counts) and the path is a known page, rewrite to its Markdown with
   `Vary: Accept`. Otherwise pass through with the `Link` header.
3. Wrong-cased prefix -> 308 to the canonical one.
4. Anything else -> 307 to the negotiated locale (cookie, then `Accept-Language`) with
   `Vary: Accept, Accept-Language, Cookie`. `/` asking for Markdown gets the negotiated Work
   Markdown directly (plus `Content-Location`), and the `/` redirect carries the site-level `Link`s.

The matcher skips `_next`, `api`, `mcp`, paths with a dot (except `.md`) and metadata image routes.

### Changing things

- Facts: edit `profile.ts`; Markdown, JSON, JSON Resume, llms files, MCP, search and OG update.
- Posts: add the Markdown file; sitemap, llms, `posts.json`, MCP (`list_posts`, resources),
  search and the post OG image pick it up at build time.
- A new page: add it to `PageRef`/`parsePagePath`/`pagePath` in `discovery.ts`, a renderer in
  `markdown.ts`, a route under `src/app/markdown/`, and an entry in `sitemap.ts`.
- The skill: edit `skillMarkdown()` in `well-known.ts`; the index digest is computed from it.
- MCP: tools are declared in `mcp.ts` (`toolInputs`, `toolMeta`); the server card reads the same
  declarations. The route serves 2026-07-28 clients through `createMcpHandler` and 2025-era
  clients (`initialize` handshake) through a stateless transport with JSON responses, so plain
  JSON-RPC POSTs work.

### Checking

```bash
curl -s https://davilacerda.com/llms.txt
curl -s -H 'Accept: text/markdown' https://davilacerda.com/en | head
curl -sI https://davilacerda.com/en | grep -i '^link'
curl -s https://davilacerda.com/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# Scanner (also an MCP server at https://isitagentready.com/mcp, tool `scan_site`):
curl -s -X POST https://isitagentready.com/api/scan -H 'content-type: application/json' \
  -d '{"url":"https://davilacerda.com","format":"agent"}'
```

### Checks that do not apply (on purpose)

- **OAuth / OIDC discovery, OAuth Protected Resource (RFC 9728), Auth.md**: everything is public
  and read-only with no authentication. Publishing these would advertise auth that does not exist.
- **Web Bot Auth** (`/.well-known/http-message-signatures-directory`): for operators of bots that
  sign their requests. This site sends no bot traffic (the scanner marks it informational).
- **A2A agent card** (`/.well-known/agent-card.json`): there is no conversational agent to
  delegate to; MCP, OpenAPI and the skill cover tool and data access.
- **Commerce** (x402, MPP, UCP, ACP): nothing is for sale; the scanner scores these only for shops.
- **DNS-AID**: SVCB records under `_agents.davilacerda.com`, signed with DNSSEC. This is DNS
  configuration, not code; add it at the DNS provider if wanted.

### Known limitations

- `next start` replaces the `Vary` header of prerendered HTML (both from the proxy and from
  `next.config` `headers()`), so the HTML variant does not show `Vary: Accept` locally; the
  Markdown variant does. On Vercel the proxy runs before the CDN cache and each variant is cached
  under its own rewritten route, so they never mix there. A third-party cache in front of the
  site could still serve cached HTML to a Markdown request; the `.md` URLs avoid that entirely.
- `.md` and JSON renditions are not `noindex`; they send `Link: <html>; rel="canonical"` instead.
- The RSS URLs advertised in Link headers and llms.txt (`/{lang}/personal/blog/rss.xml`) come
  from the blog work.
