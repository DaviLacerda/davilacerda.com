# Architecture

Personal site of Davi Lacerda (AI Engineer). Bilingual (`en`, `pt-br`), light/dark,
statically generated, deployed on Vercel. Read this before adding pages.

**Stack:** Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript 6 (strict +
`noUncheckedIndexedAccess`), Tailwind CSS v4 (CSS-first config), next-themes, Motion
(`motion/react`), Phosphor icons, unified/remark/rehype + Shiki for Markdown, @vercel/analytics.
Package manager: **yarn** (v1).

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
    globals.css                   design tokens + Tailwind theme + motion + .markdown prose
    fonts.ts                      next/font: Jost (everything) / Geist Mono (code only)
    [lang]/layout.tsx             ROOT layout: <html lang>, providers, header, <main id="main">, footer
    [lang]/page.tsx               Work tab: the guided assistant (name, composer, TL;DR, topics, contact)
    [lang]/work/[topic]/          one answer of the assistant, e.g. /en/work/experience (static, 7 topics)
    [lang]/work/page.tsx          /en/work -> 308 to /en
    [lang]/ask/page.tsx           the composer's no-JS form target: "no written answer" reply (noindex)
    [lang]/personal/page.tsx      Personal tab: intro, writing (blog index), side projects, elsewhere
    [lang]/personal/blog/[slug]/  Blog post
    [lang]/not-found.tsx          localized 404 (offers the composer)
    [lang]/[...rest]/page.tsx     sends unknown /<lang>/* paths to the 404
  components/
    chat/                         the Work assistant: composer, turn, answers (predefined panels), widget, ask-link, copy-email-button
    motion/                       motion-provider (LazyMotion + MotionConfig), reveal (scroll entrance), features
    layout/                       site-header, nav-tabs, locale-switcher, theme-toggle, site-footer
    personal/                     side-projects, elsewhere
    blog/                         post-list, post-header, table-of-contents, author-card, post-pager, rss-link
    providers/                    theme-provider (next-themes), alternate-links (locale switcher targets)
    seo/json-ld.tsx               <JsonLd data={...} />
    ui/                           container, button, tag, text-link, prose
    brand-mark.tsx                Davi's pixel "d" mark (BRAND_MARK geometry, shared with OG/icons)
  config/site.ts                  url, name, brand/theme colors, shared SEO keywords
  content/profile.ts              ALL facts about Davi (typed, bilingual). Single source of truth.
  i18n/                           config, negotiate, dictionaries/{en,pt-br}.ts, index (t, getDictionary), format (dates)
  lib/
    routes.ts                     URL builders + tab logic. Never hand-write internal paths.
    blog.ts                       post loader (server-only)
    markdown.ts                   markdown -> HTML pipeline (server-only)
    code-theme.ts                 Shiki theme in the site palette (ink, grey, signal red)
    work/topics.ts                topic ids + keyword matcher (dependency-free; client, proxy, server)
    work/answers.ts               topic copy, answer leads, composer strings (server-only)
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
  -> "Aug 2024", `formatLongPartialDate()` -> "August 2024", `formatDateRange(start, end, lang)` ->
  "Dec 2023 to Aug 2024" or, with `end: null`, "Since Aug 2024" (no dashes in visible text),
  `toIsoDate()` for `<time dateTime>`. All UTC.
- `@/lib/routes`: `routes.work(lang)` `/en`, `routes.topic(lang, "experience")` `/en/work/experience`,
  `routes.ask(lang)` `/en/ask`, `routes.personal(lang)`, `routes.blog(lang)`
  (`/en/personal#blog`, so give the blog section `id="blog"`), `routes.post(lang, slug)`,
  `routes.rss(lang)` (`/en/personal/blog/rss.xml`), plus `tabs`, `activeTab()`, `switchLocalePath()`.
- Locale switcher: swaps the prefix by default. Pages whose URL differs per locale (blog posts)
  render `<LocaleAlternates links={getPostAlternates(post)} />` (client, renders nothing). It also
  sets a `NEXT_LOCALE` cookie the proxy honours.

## Design system

Minimal, one column, one typeface, white and near-black with one signal red. The Work tab is a
guided assistant; Personal and the blog are a reading layout. Tokens are CSS variables in
`src/app/globals.css` (`:root` = light, `.dark` = dark; next-themes toggles the class, system
preference by default) mapped to Tailwind colors:

| Utility (`bg-*`, `text-*`)     | Light / dark      | Use                                                       |
| ------------------------------ | ----------------- | --------------------------------------------------------- |
| `background` / `foreground`    | #ffffff / #0a0a0a | page and body text (dark: #0d0d0d / #ededed)              |
| `surface`                      | #f2f2f2 (#1b1b1b) | panels: composer, answer widgets, code, tags, hover fills |
| `surface-strong`               | #e8e8e8 (#262626) | hover on a surface, highlighted code lines                |
| `muted-foreground`             | #666666 (#a3a3a3) | secondary lines only (>= 5.1:1 on page and surface)       |
| `border`                       | #d4d4d4 (#3a3a3a) | form fields and real tables only                          |
| `accent` / `accent-foreground` | #d92b21 / white   | signal red: the send button and the one email action      |
| `accent-text`                  | #c4251c (#ff5a50) | red text, link hover underline (>= 4.9:1)                 |
| `ring`                         | ink               | focus outline (global `:focus-visible`: 2px, 3px offset)  |

Rules: surfaces are a fill one tone step from the page, never a 1px outline, never a shadow.
Lines only on form fields and real tables. Red is spent on one action per screen. Never hard-code
hex colors in components (the OG template mirrors the light tokens in `ogColors`). Davi's own
violet favicons (`public/`) are kept as his brand; the UI draws the same mark in ink
(`<BrandMark />`) and the generated app icons reproduce the favicon (violet on #09090b).

**Fonts** (`fonts.ts`): `font-sans` Jost (variable, 400 to 600) for everything, display at weight
500 in sentence case; `font-mono` Geist Mono only for literal code (`pre`, `code`, `kbd`), never for
labels, dates or metadata. No uppercase labels, no eyebrows, no letter-spaced captions.

**Type scale** (fluid 360px to 1440px, line-height and tracking included; Jost has a small
x-height, so the steps run a little large): `text-display` 52 to 112px (page h1 on Work and
Personal), `text-title` 40 to 80px (answer and post h1), `text-heading` 28 to 44px (section h2),
`text-lead` 20 to 26px, `text-body` 17 to 19px (set on `body`), `text-small` 15 to 16px (secondary
lines, chips, tags). Text is never smaller than 15px.

**Layout:** one column, `--container-column: 48rem` (768px) plus a `clamp(1rem, 4vw, 2rem)` gutter,
via `<Container>`; header, pages and footer share it so every edge lines up. Section gap 112px on a
phone, 144px from `sm`. Sections that open with a heading get `pt-2` (Jost's glyph box rises above
a tight line box). Indexes (topics, side projects, elsewhere) go two columns from `lg`/`sm`.
Radii: controls are fully round (chips, buttons, tabs, the composer, the question bubble); panels
use `rounded-surface` (20px).

**Icons:** Phosphor, regular weight (bold only on the send arrow), imported per icon from
`@phosphor-icons/react/dist/ssr/<Name>` (works in server and client components). Always
`aria-hidden="true"`; the control carries the label.

**Utilities:** `container-column`, `link-underline` (ink underline at 40% that turns red on hover),
`pressable` (scale 0.97 on `:active`, see Motion), `.markdown` (blog prose: no rules or borders;
blockquote as larger text; code blocks on the surface with the ink theme in `src/lib/code-theme.ts`
and dual light/dark CSS variables; each code `figure` is marked `data-ui`).

## Motion

Motion (`motion/react`) in small client leaves, loaded through `LazyMotion` (`domMax`, lazy) with
`strict` (so only `m.*` components) and `MotionConfig reducedMotion="user"`, both in
`src/components/motion/motion-provider.tsx`. Principles (Emil Kowalski): fast, interruptible,
motivated by a state change; ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for arrivals, never animate
from `scale(0)`, transform and opacity only.

| What                                | Where                                         | Timing                                                      |
| ----------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| First-paint entrance (`data-enter`) | globals.css (CSS, works without JS)           | 450ms ease-out, rise 8px, 50ms stagger via `--i`            |
| Answer build-in (`data-build`)      | globals.css, first block of an answer         | 450ms ease-out, parts 60ms apart after the block            |
| Scroll reveal                       | `<Reveal stagger?>` (`animateMini`, `inView`) | 500ms ease-out, rise 16px, 60ms stagger, once               |
| Chat turn (question bubble)         | `TurnQuestion`                                | 200ms ease-out, scale 0.96 and 8px from the bottom right    |
| Chat turn (answer parts)            | `TurnPart`                                    | 320ms ease-out, 10px, from 120ms, 60ms apart                |
| Header tab pill                     | `NavTabs` (`layoutId`)                        | spring 0.3s, no bounce, moves on click (optimistic)         |
| Theme icon swap                     | `ThemeToggle`                                 | 200ms ease-out crossfade, scale 0.6 and 4px blur            |
| Copy email confirmation             | `CopyEmailButton`                             | 150ms blur crossfade of icon and label, width reserved      |
| Composer fallback reply             | `Composer`                                    | in 200ms (6px), out 150ms; chips follow with `layout` 200ms |
| Press feedback                      | `pressable` (chips, buttons, send, TOC)       | scale 0.97, 120ms ease-out                                  |
| Hover fills, arrow nudges, fields   | Tailwind transitions                          | 150ms ease-out                                              |

Not animated on purpose: typing and the live match (instant), the locale switch, page
transitions. The CSS entrance only plays on a full load: `data-nav` is set on `<html>` at the first
in-site navigation. Reduced motion: every hidden starting state lives inside
`prefers-reduced-motion: no-preference`, `Reveal` returns early, Motion skips transforms, and the
blur is dropped.

## Work assistant

The Work tab is a guided assistant over the verified profile, not a live model (the composer says
so in its note). Each suggestion is a real static URL, `/[lang]/work/<topic>` with topics
`experience`, `sales-copilot`, `certifications`, `skills`, `education`, `faq`, `contact`.

- **Topic page** (`src/app/[lang]/work/[topic]/page.tsx`): server-rendered question bubble, `h1`,
  a direct first paragraph (`topicLead()`), then the predefined panels from `topicBlocks()`
  (`src/components/chat/answers.tsx`), then "Ask something else" with the composer. Own title,
  description, canonical, hreflang, JSON-LD (FAQPage on `faq`), OG image, Markdown rendition.
- **Composer** (client): a GET form to `/[lang]/ask` with `name="q"`. With JS, `matchTopic()`
  (`src/lib/work/topics.ts`, weighted en and pt keywords, accent-insensitive) runs on every
  keystroke: the best match is announced ("Best match: Experience") and its chip fills with ink.
  Submitting a match starts a chat turn (`startTurn()`, the typed question shows in the bubble and
  focus moves to the answer's `h1`); no match shows the fallback reply with Davi's email.
  Without JS the proxy answers `/en/ask?q=...` with a 303 to the matched topic, or the static
  "no written answer" page.
- **Add a topic:** add the id to `topicIds` and its keywords in `topics.ts`, its copy under
  `chat.topics` in both dictionaries, a lead in `topicLead()`, blocks in `topicBlocks()`, Markdown
  in `topicBody()` (`src/lib/agents/markdown.ts`) and search mapping in `search.ts`. Routes,
  sitemap, llms.txt and OG pick it up from `topicIds`.

## Components

| Component                                                              | Notes                                                                                                       |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `<Container as?>`                                                      | the 48rem column with its gutter                                                                            |
| `<ButtonLink href variant? size?>` / `buttonVariants()`                | variants `primary` (ink), `accent` (red), `quiet` (surface), `raised` (page on a surface); sizes `md`, `lg` |
| `<TextLink href arrow? newTabLabel?>`                                  | inline link with `link-underline`; external opens a new tab with a Phosphor ↗                               |
| `<Tag tone?>` / `<TagList items label? tone?>`                         | filled pills; `tone="surface"` inside a panel                                                               |
| `<Widget>` / `<Facts items>`                                           | answer panel (`data-ui`, surface, 20px corners) and a two-ended fact list                                   |
| `<Composer action topics strings email current? enterFrom?>`           | the assistant's input, live match, fallback and chips (client)                                              |
| `<TurnProvider>`, `<TurnQuestion>`, `<TurnPart index build?>`          | the chat turn on a topic page (client)                                                                      |
| `<AskLink href>`                                                       | next/link that starts a chat turn on a plain click                                                          |
| `<Reveal as? stagger?>`                                                | scroll entrance for content below the fold (client)                                                         |
| `<CopyEmailButton email label copiedLabel variant?>`                   | copy with a short crossfade confirmation (client)                                                           |
| `<Prose html>`                                                         | renders `post.html` with `.markdown`                                                                        |
| `<BrandMark>`                                                          | the pixel "d" in `currentColor`                                                                             |
| `<JsonLd data={node \| node[]}>`                                       | adds `@context`; arrays become one `@graph`                                                                 |
| `<LocaleAlternates links>`                                             | per-page locale switcher targets                                                                            |
| `SiteHeader`, `SiteFooter`, `NavTabs`, `LocaleSwitcher`, `ThemeToggle` | wired in the layout; the header is static (not sticky)                                                      |

Client components: the chat leaves (composer, turn, ask-link, copy-email-button), `reveal`,
`motion-provider`, `nav-tabs`, `locale-switcher`, `theme-toggle`, the providers. Pages and answer
panels stay Server Components.

## Content model (`src/content/profile.ts`)

`profile` holds name/fullName, `headline`, `tagline`, `valueProp`, `summary` (first person),
`tldr` (third person, factual: put it near the top of Work for answer engines), `location`,
`email`, `availability`, `currentEmployer`, `socials[]`, `highlights[]` (hero stats),
`experience[]` (`company, role, start, end|null, employmentType, workModel, location, description,
highlights, stack`), `projects[]` (`kind: "work" | "side"`, `featured`, `role?`, `award?`,
`repoUrl?`, `liveUrl?`, `stars?`), `skills[]` (groups `llm, rag, ml, backend, frontend, infra`),
`knowsAbout[]`, `certifications[]` (`kind: "certification" | "course"`, `level?`),
`education[]`, `achievements[]` (`featured` ones: the Conecta Latam award and the Microsoft
Expert certifications), `languages[]`, `faq[]` (rendered on the FAQ topic, `/[lang]/work/faq`, and
used for its FAQPage JSON-LD; the other answers' first paragraphs reuse FAQ answers).
Helpers: `allSkills()`, `getSocial(id)`, `getCertifications(kind?)`.

Rules: only verified facts; anything unknown has a `TODO(davi)` comment. No seniority levels or
formal titles for Algar (the role is "AI Engineer", since Aug 2024). Dates are strings
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

- The layout already renders `<main id="main">`, header and footer. Pages render a `<Container>`
  with sections, exactly **one `<h1>`**, section titles as `<h2 className="text-heading">`.
- All UI copy from the dictionary, all facts from `profile`, all internal URLs from `routes`.
- Semantic HTML: `<section>`, `<article>`, `<time dateTime>`, lists for lists; label icon-only links.
- Keep pages static (no `headers()`/`cookies()`); client JS only in the small leaves listed above.
- No dashes or middle dots in visible text: commas, "to" in ranges, spacing between items.

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

| Path                                                                                                                   | What                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/robots.txt`                                                                                                          | RFC 9309. `*` group plus an explicit AI crawler/agent group, both `Allow: /` with `Content-Signal: search=yes, ai-input=yes, ai-train=yes`; `Sitemap:` line.                                                                                   |
| `/sitemap.xml`                                                                                                         | Every page in every locale (including the seven Work answers) and every post, with `xhtml:link` hreflang (incl. `x-default`) and `lastmod` (last git commit of the profile sources; post `updated ?? date`).                                   |
| `/manifest.webmanifest`, `/icons/{icon-192,icon-512,maskable-512}.png`                                                 | Web app manifest and generated icons (the brand mark).                                                                                                                                                                                         |
| `opengraph-image` / `twitter-image`                                                                                    | Per locale for Work (`/[lang]`, with the composer), each Work answer (question bubble, title, lead), Personal and each post (title, description, date, reading time).                                                                          |
| `/llms.txt`, `/llms-full.txt`                                                                                          | [llmstxt.org](https://llmstxt.org) index; full text of both profiles, both Personal pages and every post.                                                                                                                                      |
| `/{lang}.md` (`/{lang}/index.md`), `/{lang}/work/{topic}.md`, `/{lang}/personal.md`, `/{lang}/personal/blog/{slug}.md` | Markdown renditions (Work reads like a résumé; each answer has its own). Also served for `Accept: text/markdown` on the HTML URL and on `/`.                                                                                                   |
| `/api/profile.json`, `/api/posts.json`, `/api/{lang}/{profile,posts,resume}.json`                                      | JSON (profile localized per language; posts with Markdown URLs).                                                                                                                                                                               |
| `/resume.json`                                                                                                         | [JSON Resume](https://jsonresume.org) v1.0.0 (English; Portuguese at `/api/pt-br/resume.json`).                                                                                                                                                |
| `/api/openapi.json`, `/api/status.json`                                                                                | OpenAPI 3.1 description of the read-only HTTP API; status document for the API catalog.                                                                                                                                                        |
| `/mcp`                                                                                                                 | MCP server, Streamable HTTP, stateless, read-only, no auth. Tools `get_profile`, `list_posts`, `get_post`, `search`; resources (both profiles, both Personal pages, llms.txt, every post via a `{lang}/{slug}` template); prompt `assess_fit`. |
| `/.well-known/api-catalog`                                                                                             | RFC 9727 linkset (`application/linkset+json`), each API with `service-desc`, `service-doc`, `status`.                                                                                                                                          |
| `/.well-known/mcp/server-card.json`, `/.well-known/mcp.json`                                                           | MCP server card (SEP-1649 draft): transport, capabilities, tools with JSON Schemas, resources, prompts.                                                                                                                                        |
| `/.well-known/agent-skills/index.json`, `.../about-davi-lacerda/SKILL.md`                                              | Agent Skills discovery index (v0.2.0, with `sha256` digest) and the skill itself.                                                                                                                                                              |
| `/.well-known/ai-catalog.json` (`ard.json` alias), `/.well-known/poppy.json`                                           | Agent Resource Discovery catalog; Poppy manifest.                                                                                                                                                                                              |

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
- `src/lib/agents/markdown.ts`: Work/topic/Personal/post Markdown, `llms.txt` (with a "Work answers"
  section), `llms-full.txt`.
- `src/lib/agents/json.ts`: profile/posts JSON, JSON Resume, status, OpenAPI document.
- `src/lib/agents/search.ts`: keyword search over profile sections and post sections (MCP `search`);
  profile hits point at the Work answer that shows them (`/en/work/certifications`...).
- `src/lib/agents/mcp.ts`: the MCP server factory; `well-known.ts`: API catalog, server card,
  SKILL.md + index, ARD and Poppy documents.
- `src/lib/agents/labels.ts`: strings only machines read (Markdown labels), kept out of the dictionaries.
- `src/lib/agents/{posts,dates,localize,http}.ts`: raw post bodies, git-based `lastmod`,
  `{ en, "pt-br" }` resolution, response helpers (CORS, `x-markdown-tokens`, `Content-Signal`).
- `src/lib/og/`: OG template (`OgFrame`, `OgTitle`, `OgLead`, `OgQuestion`, `OgComposer`, `OgMeta`,
  `clampText`) and fonts (Jost 400 and 500 static TTFs, Latin and Latin Extended, OFL licence
  alongside). Satori cannot read woff2, hence the separate TTFs.
- `src/app/markdown/**`: internal Markdown routes. Only reached through proxy rewrites; requested
  directly they get a locale prefix and 404.

### Proxy (`src/proxy.ts`)

1. `*.md` -> rewrite to `/markdown/...` (unknown page: 404).
2. `/{lang}/ask?q=...` (the composer without JS): 303 to the matched `/{lang}/work/<topic>`; no
   match falls through to the static "no written answer" page.
3. `/{lang}/...`: if `Accept` explicitly prefers `text/markdown` (q above zero and at least the
   HTML q; `*/*` never counts) and the path is a known page, rewrite to its Markdown with
   `Vary: Accept`. Otherwise pass through with the `Link` header.
4. Wrong-cased prefix -> 308 to the canonical one.
5. Anything else -> 307 to the negotiated locale (cookie, then `Accept-Language`) with
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
curl -s https://davilacerda.com/en/work/experience.md | head
curl -sI 'https://davilacerda.com/en/ask?q=algar' | grep -i '^location'
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
