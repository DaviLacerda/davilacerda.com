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
