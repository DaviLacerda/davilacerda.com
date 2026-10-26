# Architecture

Personal site of Davi Lacerda (AI Engineer). Bilingual (`en`, `pt-br`), light/dark,
statically generated, deployed on Vercel. Read this before adding pages.

**Stack:** Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript 6 (strict +
`noUncheckedIndexedAccess`), Tailwind CSS v4 (CSS-first config), next-themes, Motion
(`motion/react`), Phosphor icons, Iconify brand logos (inlined at build time),
unified/remark/rehype + Shiki for Markdown, @vercel/analytics. Package manager: **yarn** (v1).

Next 16 differs from older versions: check `node_modules/next/dist/docs/` before using an API
(`params` are Promises, `middleware` is now `proxy`, `next lint` is gone).

```bash
yarn dev          # http://localhost:3000 (redirects to /en or /pt-br)
yarn build        # production build (also type-checks)
yarn lint         # eslint . (flat config: next core-web-vitals + typescript + prettier)
yarn typecheck    # tsc --noEmit
yarn format       # prettier --write . (with the Tailwind class sorter)
yarn logos        # regenerate src/lib/logos/icons.json after editing the logo registry
```

## Layout

```
content/blog/<locale>/<slug>.md   Markdown posts (see content/blog/README.md)
scripts/logos.mjs                 `yarn logos`: copies the registry's icons out of the Iconify sets
scripts/spotify-refresh-token.mjs `yarn spotify:token`: one-time Spotify refresh token (README, "Spotify now playing")
public/                           favicons, images/logo.png (brand mark, violet #5b21b6), images/davi.{webp,png} (portrait),
                                  certificates/*.png (certificate prints), logos/ (company and school logos)
src/
  proxy.ts                        locale redirect (cookie > Accept-Language > "en")
  app/
    globals.css                   design tokens + Tailwind theme + motion + .markdown prose
    fonts.ts                      next/font: Geist (everything) / Geist Mono (code only)
    [lang]/layout.tsx             ROOT layout: <html lang>, providers, header, <main id="main">, footer
    [lang]/(assistant)/layout.tsx the Work tab's split pane: left pane (name, line, composer, chips) + canvas
    [lang]/(assistant)/page.tsx   Work home: the overview on the canvas (award, 3x Microsoft Certified, current role)
    [lang]/(assistant)/work/[topic]/  one answer on the canvas, e.g. /en/work/experience (static, 7 topics)
    [lang]/(assistant)/work/page.tsx  /en/work -> 308 to /en
    [lang]/(assistant)/ask/page.tsx   the composer's no-JS form target: "nothing on that yet" (noindex)
    [lang]/personal/page.tsx      Personal tab: portrait, hello, interests, now playing on Spotify, writing (blog index), elsewhere
    [lang]/personal/blog/[slug]/  Blog post
    [lang]/not-found.tsx          localized 404 (the way back and the topics as links)
    [lang]/[...rest]/page.tsx     sends unknown /<lang>/* paths to the 404
    api/now-playing/route.ts      what Davi is listening to on Spotify (dynamic, CDN-cached 30s; see Spotify now playing)
  components/
    chat/                         the Work assistant: assistant (provider, Canvas, Identity, AskLink), context,
                                  composer, question, reply, piece, copy-email-button
    chat/answers/                 one server component per answer (overview, experience, sales-copilot,
                                  certifications, skills, education, faq, contact) + parts (Panel, fit()...)
    motion/                       motion-provider (LazyMotion + MotionConfig), reveal (scroll entrance), features
    layout/                       site-header, nav-tabs, locale-switcher, theme-toggle, site-footer
    personal/                     interests, now-playing (the Spotify card, client), elsewhere
    blog/                         post-list, post-header, table-of-contents, author-card, post-pager, rss-link
    providers/                    theme-provider (next-themes), alternate-links (locale switcher targets)
    seo/json-ld.tsx               <JsonLd data={...} />
    ui/                           container, button, tag, text-link, prose, logo (BrandLogo, LogoTile),
                                  copy-button, image-lightbox
    brand-mark.tsx                Davi's pixel "d" mark (BRAND_MARK geometry, shared with OG/icons)
  config/site.ts                  url, name, theme colors, shared SEO keywords
  content/profile.ts              ALL facts about Davi (typed, bilingual). Single source of truth.
  i18n/                           config, negotiate, dictionaries/{en,pt-br}.ts, index (t, getDictionary), format (dates)
  lib/
    routes.ts                     URL builders + tab logic. Never hand-write internal paths.
    blog.ts                       post loader (server-only)
    markdown.ts                   markdown -> HTML pipeline (server-only)
    code-theme.ts                 Shiki theme in the site palette (monochrome: ink, greys, italic muted comments)
    work/topics.ts                topic ids + keyword matcher (dependency-free; client, proxy, server)
    work/answers.ts               topic copy, leads and intros, composer/reply strings, stackLogos() (server-only)
    logos/                        brand logo registry, generated icons.json subset, getLogoSvg() (server-only)
    spotify/                      now-playing.ts (Spotify Web API, server-only), types.ts (the JSON shape, shared)
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

Monochrome, clean and direct. White and near-black with a disciplined grey ramp; hierarchy comes
from type weight, size and space only. The only colour on the site is a brand's own logo (and the
album cover on the Spotify card). No self-referential copy (nothing about how the site works or that answers are pre-written): the page
says what Davi did, in as few words as possible. The long versions live in the machine-readable
layer (see Agent readiness). The Work tab is a split-pane assistant whose answers are pictures
first (oversized figures, big logo marks, an ink panel for the headline fact); Personal and the
blog are a reading layout. Tokens are CSS variables in `src/app/globals.css` (`:root` = light,
`.dark` = dark; next-themes toggles the class, system preference by default) mapped to Tailwind
colors:

| Utility (`bg-*`, `text-*`)  | Light (dark)      | Use                                                           |
| --------------------------- | ----------------- | ------------------------------------------------------------- |
| `background` / `foreground` | #ffffff / #0a0a0a | page and body text (dark: #000000 / #ededed)                  |
| `surface`                   | #f4f4f4 (#181818) | panels, the composer, chips, tags, logo tiles, code           |
| `surface-strong`            | #e8e8e8 (#272727) | hover on a surface, past jobs on the timeline                 |
| `muted-foreground`          | #666666 (#a1a1a1) | secondary lines only (>= 5.2:1 on page and surface)           |
| `border`                    | #dcdcdc (#313131) | form fields and real tables only                              |
| `ink` / `on-ink`            | #0a0a0a / #ffffff | the headline panel, primary button, active chip (dark: white) |
| `on-ink-muted`              | #a3a3a3 (#5c5c5c) | secondary lines on an ink panel (>= 5.6:1)                    |
| `ring`                      | ink               | focus outline (global `:focus-visible`: 2px, 3px offset)      |

Rules: ink inverts with the theme (black panels and buttons in light, white in dark), so the one
emphasis on a screen is always the strongest contrast. Each answer has at most one ink panel (the
award, the current job, UFU, the email); everything else sits on the page or on a `surface` fill.
Surfaces are a fill one tone step from the page, never an outline or a shadow; lines only on form
fields and real tables. Dark surfaces use only the neutral steps #000000, #181818, #272727 and
#313131. Backgrounds are always flat; the one gradient on the site is `text-hero`, a left to right
fade on the letters of a page title (Davi's name, Personal, a post, the 404): #000 to #666 in
light, #fff to #9b9b9b in dark. No italics anywhere (prose `em` is set in weight 500, code
comments are plain muted grey). Never hard-code hex colors in components (the OG template mirrors the
light tokens in `ogColors`). Davi's own violet favicons (`public/`) are kept as his brand; the UI
draws the same mark in ink (`<BrandMark />`) and the generated app icons reproduce the favicon.

**Fonts** (`fonts.ts`): `font-sans` Geist (variable, Latin and Latin Extended) for everything,
kept on purpose: its tight, even grotesque shapes hold up at the oversized display sizes the answers
now use ("2×", "UFU", the award) and stay crisp at 14px; it has tabular figures and full Portuguese
coverage. Headings at 600 with tight negative tracking, body at 400, emphasis at 500, sentence
case. `font-mono` Geist Mono only for literal code. No uppercase labels, no eyebrows above
headings, no letter-spaced captions.

**Type scale** (fluid 360px to 1440px, line-height and tracking included): `text-figure` 72 to
128px (oversized numbers: "2×"), `text-display` 44 to 72px (Personal and 404 h1), `text-name` 40 to
52px (Davi's name in the left pane, the Work h1), `text-title` 34 to 52px (post h1), `text-answer`
32 to 42px (an answer's h1), `text-heading` 22 to 28px (section h2), `text-lead` 18 to 21px,
`text-body` 16 to 17px (set on `body`), `text-small` 14 to 15px (meta lines, chips, tags). The
headline of an ink panel is sized to its container with `fit()` (`answers/parts.tsx`: a `cqi`
size from the text length, clamped, so "Best AI Project in LATAM" and its longer Portuguese title
both fill two lines); put `@container` on an unpadded wrapper, not on the padded panel.

**Layout:** `--container-wide: 80rem` (header, footer and the Work tab) and `--container-column:
48rem` (Personal, posts, 404), both with a `clamp(1rem, 4vw, 2.5rem)` gutter (`--gutter`), via
`<Container wide?>`.

- Work, from 1024px: two panes. The left column (20rem, 23rem from `xl`) sticks to the top and
  holds the name, one line, the composer and the chips (they wrap). The canvas on the right shows
  the answer large. The home's canvas is the overview: the award on an ink panel across the top,
  the Azure mark with "3×" Microsoft Certified ("2 Expert, 1 Associate"), the current role, and a contact row.
- Work, below 1024px: the chat-app pattern. The answer fills the page and the composer plus a
  horizontally scrolling chip row are docked to the bottom (`position: fixed`, frosted
  `bg-background/90` + `backdrop-blur`, safe-area aware with `env(safe-area-inset-bottom)` and
  `viewportFit: "cover"`). The dock measures itself into `--dock-h`; `body:has([data-dock])` gets
  that much bottom padding and `scroll-padding-bottom`, so focused elements are never hidden
  under it. On an answer the name steps aside so the question starts at the top. Answers always
  appear above the input, never under it.
- Radii: controls are fully round (chips, buttons, tabs, the composer, the question bubble);
  answer panels `rounded-panel` (28px), hovered rows `rounded-surface` (20px), logo tiles
  `rounded-tile` (14px).

**Logos** (`src/lib/logos/`): brand marks from `@iconify-json/logos` (full colour) and
`@iconify-json/simple-icons` (single colour), listed in `registry.ts` (`id`, Iconify `icon`,
`label`, the profile `names` that map to it). `yarn logos` copies only those icons into
`icons.json` (about 30KB, committed), so the multi-MB sets stay dev dependencies. `getLogoSvg()`
builds the SVG on the server and `<BrandLogo>` inlines it: no client JavaScript, no requests.
Colour rule, the same everywhere: a logo keeps its brand colours, except marks whose brand colour
is black or white (GitHub, Next.js, Vercel, Instagram's glyph, MCP), which use the simple-icons
version in `currentColor` so they follow the theme. Logos are decorative next to their name
(`aria-hidden`); a logo standing alone gets `label` (role `img` + `aria-label`). Gradient ids are
scoped per instance (`scopeSvgIds`). Company and school logos are files: set `logo:
"/logos/<name>.svg"` on the entry in `profile.ts` and `<LogoTile>` renders it; without one it shows
a monogram on the tile (Algar, Brain, UFU, Rocketseat and Alura are monograms until the files are
added; see the `TODO(davi)` notes). Only technologies already in `profile.ts` get a logo. On
an ink panel a tile turns `tone="ink"` (translucent on-ink fill) and the logo keeps its colours.

**Pictures:** the portrait is black and white, its original violet backdrop keyed out, on a
`bg-surface` disc, so it follows the theme like everything else. Certificate prints are cropped to
the certificate (transparent rounded corners), served through next/image (AVIF/WebP, `quality={90}`,
allowed in `next.config.ts` `images.qualities`) and dimmed to 90% brightness in dark mode. No
labels on top of pictures; captions go under them. The album cover on the Spotify card is the one
remote picture: a plain `<img>` straight from Spotify's CDN (the ~300px size it already serves; the
optimizer would only re-encode an ever-changing URL), 8px corners, never cropped, blurred or
covered (Spotify's design guidelines), with the Spotify logo beside it.

**Icons:** Phosphor, regular weight (bold only on the send arrow), imported per icon from
`@phosphor-icons/react/dist/ssr/<Name>` (works in server and client components). Always
`aria-hidden="true"`; the control carries the label.

**Utilities:** `container-column`, `container-wide`, `link-underline` (currentColor underline at
30% that goes solid on hover), `pressable` (scale 0.97 on `:active`) and `pressable-panel` (0.99,
for whole panels), `no-scrollbar` (the docked chip row), `.markdown` (blog prose: no rules or borders;
blockquote as larger text; code blocks on the surface with the ink theme in `src/lib/code-theme.ts`
and dual light/dark CSS variables; each code `figure` is marked `data-ui`).

## Motion

Motion (`motion/react`) in small client leaves, loaded through `LazyMotion` (`domMax`, lazy) with
`strict` (so only `m.*` components) and `MotionConfig reducedMotion="user"`, both in
`src/components/motion/motion-provider.tsx`. Principles (Emil Kowalski): fast, interruptible,
motivated by a state change; ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for arrivals, never animate
from `scale(0)`, transform and opacity only.

| What                                   | Where                                      | Timing                                                                                                                                            |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-paint entrance (`data-enter`)    | globals.css (CSS, works without JS)        | 450ms ease-out, rise 8px, 50ms stagger via `--i`                                                                                                  |
| Answer entrance on load (`data-piece`) | globals.css (CSS, works without JS)        | 520ms ease-out, rise 12px out of a 4px blur, 60ms apart via `--p`                                                                                 |
| Canvas swap (chip, link or composer)   | `Canvas` + `arrive()` (Motion `animate()`) | 360ms ease-out, same rise and blur, `stagger(0.045)`, interruptible                                                                               |
| "Thinking" while the next answer loads | `leave()` on `open()`                      | the answer on screen dims to 0.35 and blurs 2px in 140ms                                                                                          |
| Chip pill                              | `Composer` (`layoutId="chip-pill"`)        | spring 0.32s, no bounce, moves on click; instant while typing                                                                                     |
| Timeline bars (`data-bar`)             | globals.css (clip-path reveal)             | 640ms ease-out, 140ms apart, on every mount                                                                                                       |
| Scroll reveal                          | `<Reveal stagger? enter?>` (`inView`)      | 800ms `--ease-fluid`, rise 64px out of a 12px blur, 60ms stagger                                                                                  |
| Disclosure (`details.disclosure`)      | globals.css (`::details-content`)          | open 240ms, close 160ms, ease-out; caret turns with it                                                                                            |
| Header tab pill (in the tab island)    | `NavTabs` (`layoutId`)                     | spring 0.3s, no bounce, moves on click (optimistic)                                                                                               |
| Theme icon swap (System, Light, Dark)  | `ThemeToggle`                              | 200ms ease-out crossfade, scale 0.6 and 4px blur                                                                                                  |
| Copy confirmation (email, credential)  | `CopyButton` (`CopyEmailButton` wraps it)  | 150ms blur crossfade of icon and label, width reserved                                                                                            |
| Certificate viewer open / close        | `ImageLightbox` (Motion `animate()`)       | FLIP from the print's own place: spring 0.42s no bounce (close 0.34s), page fades behind in 240ms, caption 140ms later; reduced motion: fade only |
| Now playing: song change               | `NowPlayingCard` (`AnimatePresence`)       | new cover and text rise 6px out of a 4px blur in 250ms ease-out once the cover has loaded; the old one blurs out in 150ms; reduced motion: fade   |
| Now playing: equalizer (`data-eq`)     | globals.css (CSS keyframes)                | four bars, scaleY from the bottom, 0.8s to 1.3s loops out of phase, ease-in-out; reduced motion: still bars of different heights                  |
| Press feedback                         | `pressable` / `pressable-panel`            | scale 0.97 (panels 0.99), 120ms ease-out                                                                                                          |
| Hover fills, arrow nudges, fields      | Tailwind transitions                       | 200ms ease-out (never shorter, never a default curve)                                                                                             |

The canvas swap is the assistant's signature: a chip click lights its chip at once (optimistic),
the answer on screen steps back, and when the new route has rendered `Canvas` composes it in
front of the visitor in its `--p` order (bubble, title, then the pictures). Motion runs it on the
compositor (opacity, transform, filter); a new swap stops the one in flight, and the inline styles
are removed afterwards (a lingering `filter` would make every panel a containing block).

The certificate viewer is the other picture moment: the print lifts off the page (it hides and
the large copy starts at exactly its rect, then grows to the centre), the page fades to the
surface tone behind it, and Escape, a click anywhere or the close button run it back into its
slot. It is a native modal `<dialog>` (focus moves to Close and returns to the print; the page is
inert), and while it is open `html` stops scrolling and keeps the classic scrollbar's width as
padding (`--scrollbar-gap`), so nothing shifts. Without JavaScript the print's link opens the PNG.

Not animated on purpose: typing and the live match (instant), the locale switch. The CSS
entrances only play on a full load: `data-nav` is set on `<html>` at the first in-site navigation,
and from then on the canvas runs the Motion version. Reduced motion: every hidden starting state
lives inside `prefers-reduced-motion: no-preference`, the canvas swap only fades (200ms), `Reveal`
returns early and Motion skips transforms.

## Work assistant

The Work tab is a guided assistant over the verified profile. Each suggestion is a real static
URL, `/[lang]/work/<topic>` with topics `experience`, `sales-copilot`, `certifications`, `skills`,
`education`, `faq`, `contact`. The pages live in the `(assistant)` route group, whose layout keeps
the left pane mounted, so moving between answers only swaps the canvas.

- **Layout** (`src/app/[lang]/(assistant)/layout.tsx`): `AssistantProvider` around the split pane:
  `Identity` (the name is the page's `h1` on the home and a paragraph on an answer) and `Composer`
  on the left, `Canvas` on the right. Every page under it renders only its answer.
- **Shared state** (`src/components/chat/assistant.tsx`, `context.ts`): `open({ href, question?,
focus? })` marks the chip (`pendingHref`), remembers what was typed (`asked`) and runs `leave()`;
  `reply(question)` shows "Nothing on that yet." on the canvas for a question no answer covers;
  `dismiss()` closes it. Derived values reset themselves when the route changes (no clearing
  effects). `AskLink` is the next/link every chip and in-answer link uses: a plain click calls
  `open()` first.
- **Answers** (`src/components/chat/answers/`, server components): `AnswerHeader` (the question as
  a right-aligned bubble, then the `h1#answer-title`) and one component per topic, each a picture
  first, built only from `profile.ts`:
  - overview (home): award ink panel, Azure mark + "3×" Microsoft Certified with the tiers, current role
    with its tile and "Since Aug 2024", contact row; each panel links to its answer;
  - experience: the career as one bar (Brain, then Algar in ink up to "Today"), one panel per job
    (the current one in ink) with its stack and highlights in a disclosure, then other Algar work;
  - sales-copilot: "Best AI Project in LATAM" filling an ink panel, a facts row (company, year,
    role, access), the three layers it was built in (AI tools in ink) and the stack;
  - certifications: an oversized "3×" with the tiers (`certificationsSummary()`), then one panel per
    credential whose picture is the print of its certificate (the newest across the canvas, the
    others side by side; a tap opens it in `ImageLightbox`), its tier and date, the credential ID
    with a copy button and, once `credentialUrl` is set, a Verify link; courses;
  - skills: a logo wall of the stack (`stackLogos()`), then the groups as short inline lists;
  - education: "UFU" set huge on an ink panel, coursework, languages as large type;
  - faq: one disclosure per question; contact: the email as the headline of an ink panel, the two
    actions, then LinkedIn, GitHub and the time zone.
    Every part is a `<Piece i>` (`data-piece`, order `--p`) so the entrance composes it in order.
    Topic pages keep their own title, description, canonical, hreflang, JSON-LD (FAQPage on `faq`),
    OG image and Markdown rendition. `topicLead()` is the longer factual paragraph: Markdown,
    llms.txt and MCP use it.
- **Composer** (client): a GET form to `/[lang]/ask` with `name="q"`, labelled input, chips below
  it. With JS, `matchTopic()` (`src/lib/work/topics.ts`, weighted en and pt keywords,
  accent-insensitive) runs on every keystroke: the best match is announced ("Best match:
  Experience", `aria-live`) and the pill jumps to its chip. Submitting a match calls `open()` and
  `router.push()`; the typed question shows in the bubble and focus moves to the answer's `h1`. No
  match shows the reply on the canvas (beside the composer on desktop, above it on a phone);
  Escape closes it. Without JS the proxy answers `/en/ask?q=...` with a 303 to the matched topic,
  or the static `ask` page.
- **Add a topic:** add the id to `topicIds` and its keywords in `topics.ts`, its copy (with an
  `intro`) under `chat.topics` in both dictionaries, an answer component in
  `src/components/chat/answers/` wired in `answers/index.tsx`, its OG picture in
  `src/lib/og/answers.tsx`, a lead in `topicLead()`, Markdown in `topicBody()`
  (`src/lib/agents/markdown.ts`) and search mapping in `search.ts`. Routes, chips, sitemap and
  llms.txt pick it up from `topicIds`.

## Components

| Component                                                                   | Notes                                                                                                           |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `<Container as? wide?>`                                                     | the 48rem column, or with `wide` the 80rem frame, with the gutter                                               |
| `<ButtonLink href variant? size?>` / `buttonVariants()`                     | `primary` (ink), `quiet` (surface), `raised` (page on a surface), `inverse` / `ghost-inverse` (on an ink panel) |
| `<TextLink href arrow? newTabLabel?>`                                       | inline link with `link-underline`; external opens a new tab with a Phosphor ↗                                   |
| `<Tag tone? logo?>` / `<TagList items label? tone? logos?>`                 | filled pills, `tone` `page`, `surface` or `ink`; `logos` puts the brand mark before each technology             |
| `<BrandLogo id label?>` / `<LogoTile logo? name size? tone?>`               | an inline brand logo (server); a tile up to `xl` (64px) with the logo, a `/public` file or a monogram           |
| `<AssistantProvider>`, `<Canvas reply>`, `<Identity home name lead>`        | the Work tab's shared state, the swapping canvas, the name in the left pane (client)                            |
| `<Composer action topics strings enterFrom?>`                               | input, live match, chips with the sliding pill; docked below 1024px (client)                                    |
| `<AskLink href>`                                                            | next/link that calls `open()` on a plain click (client)                                                         |
| `<Piece i as?>`                                                             | one part of an answer, in entrance order (server or client)                                                     |
| `<Question text label>` / `<Reply question strings>`                        | the question bubble; the "nothing on that yet" reply (client)                                                   |
| `<Panel as? tone?>`, `fit()`, `<BlockTitle>`, `<Disclosure>`                | answer building blocks in `answers/parts.tsx` (server)                                                          |
| `<Reveal as? stagger? enter?>`                                              | scroll entrance below the fold; with `enter`, part of the load entrance (client)                                |
| `<CopyButton value label copiedLabel variant? size? iconOnly?>`             | copy with a short crossfade confirmation (client); `CopyEmailButton` is the email preset                        |
| `<ImageLightbox src width height alt caption detail? openLabel closeLabel>` | a link around a thumbnail that opens the image in a modal `<dialog>` (client; see Motion)                       |
| `<Interests lang enter>`                                                    | the Personal tab's interest chips (Phosphor icon + label)                                                       |
| `<NowPlayingCard profileUrl handle strings logo>`                           | the Spotify card under the hello (client; see Spotify now playing)                                              |
| `<SocialList lang ids reveal?>` / `<Elsewhere lang>`                        | network rows with logo, name and handle (Contact answer, Personal)                                              |
| `<Prose html enter?>`                                                       | renders `post.html` with `.markdown`                                                                            |
| `<BrandMark>`                                                               | the pixel "d" in `currentColor`                                                                                 |
| `<JsonLd data={node \| node[]}>`                                            | adds `@context`; arrays become one `@graph`                                                                     |
| `<LocaleAlternates links>`                                                  | per-page locale switcher targets                                                                                |
| `SiteHeader`, `SiteFooter`, `NavTabs`, `LocaleSwitcher`, `ThemeToggle`      | wired in the layout; static header, tabs in a round island, theme cycles System, Light, Dark                   |

Client components: the chat leaves (assistant, composer, question, reply, copy-email-button),
`reveal`, `motion-provider`, `nav-tabs`, `locale-switcher`, `theme-toggle`, `now-playing`, the
providers. Pages, answers and logos stay Server Components.

## Content model (`src/content/profile.ts`)

`profile` holds name/fullName, `headline`, `tagline`, `valueProp`, `summary` (first person),
`tldr` (third person, factual: in the JSON-LD, Markdown, llms.txt and MCP; on screen it is one
line and the overview), `location`,
`email`, `availability`, `currentEmployer`, `socials[]` (GitHub, LinkedIn, Instagram, Spotify,
Discord, email; `sameAs` ones go into the Person JSON-LD), `highlights[]` (hero stats),
`experience[]` (`company, role, start, end|null, employmentType, workModel, location, description,
highlights, stack`), `projects[]` (work built at Algar: `context?`, `role?`, `award?`,
`isPrivate?`, `year?`), `skills[]` (groups `llm, rag, ml, backend, frontend, infra`),
`knowsAbout[]`, `certifications[]` (`kind: "certification" | "course"`, `level?` ("Expert", "Associate"),
`credentialId?`, `certificationNumber?`, `expires?`, `credentialUrl?` (the Verify link renders only
when set), `image?` `{ src, width, height }`: a PNG print cropped to the certificate),
`education[]` (experience, certifications and education take an optional `logo`: a registry id
such as `"azure"` or a `/public` path such as `"/logos/algar.svg"`), `achievements[]` (`featured` ones: the Conecta Latam award and the Microsoft
Expert certifications), `languages[]`, `faq[]` (rendered on the FAQ topic, `/[lang]/work/faq`, and
used for its FAQPage JSON-LD; the other answers' first paragraphs reuse FAQ answers).
`image` (the portrait, `/images/davi.webp`, with a PNG twin for the OG card) and `interests[]`
(`{ id, label }`, the Personal chips; inferred from GitHub, see the `TODO(davi)`).
Helpers: `allSkills()`, `getSocial(id)`, `getCertifications(kind?)`, `certificationTiers()`.

Rules: only verified facts; anything unknown has a `TODO(davi)` comment. No seniority levels or
formal titles for Algar (the role is "AI Engineer", since Aug 2024). Dates are strings
(`"YYYY"`, `"YYYY-MM"`, `"YYYY-MM-DD"`); omitted = unknown (render nothing).

## Spotify now playing

The Personal tab's one live element: under the hello, a card with what Davi is listening to on
Spotify (the cover, the song, the artists, and a small equalizer while it plays) or the last song
played, linking to the track.

- **Server:** `src/lib/spotify/now-playing.ts` exchanges `SPOTIFY_REFRESH_TOKEN` (with
  `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`) for an access token at
  `accounts.spotify.com/api/token` (kept in memory until a minute before it expires), asks
  `GET /v1/me/player/currently-playing` and, when nothing is playing (204), a podcast or an ad
  is, falls back to the paused song or `GET /v1/me/player/recently-played?limit=1`. It returns
  `status` `"playing"` or `"recent"` with `title`, `artists[]`, `album`, `albumArt`, `url` (and
  `progressMs`, `durationMs` while playing), `"offline"` on any failure (logged without secrets)
  or `"unconfigured"` without the env vars. `src/app/api/now-playing/route.ts` serves it
  with `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` and `X-Robots-Tag: noindex`,
  always 200, so builds and previews never depend on Spotify.
- **Client:** `NowPlayingCard` fetches it on mount and every 30 seconds while the tab is visible
  (a `visibilitychange` listener stops it when hidden and catches up on return; no scroll
  listeners). One card of fixed size (88px) in every state, so nothing shifts: a skeleton, the
  song, or, for `offline` and `unconfigured`, "On Spotify" and the handle linking to the profile
  (also what renders without JavaScript, via the `noscript:` variant). A song change is
  announced in a polite live region (not the first one). The Spotify logo comes from the server
  as a prop, so the logo registry stays out of the client bundle.
- **Not machine-readable on purpose:** the song is ephemeral, so it is not in the Markdown,
  llms.txt, MCP, search or OpenAPI. The Spotify profile is a regular social (Elsewhere, Markdown,
  JSON, `sameAs`).
- **Setup:** README, "Spotify now playing" (`yarn spotify:token`, `.env.example`).

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
- Metadata image routes inside a route group get a hashed segment: a Work answer's card is
  `/en/work/<topic>/opengraph-image-<hash>`. The page metadata points at it automatically; never
  hand-write that URL. The Work home declares its card again inside `(assistant)/` (re-exporting
  `[lang]/opengraph-image`): a page's own `openGraph` metadata replaces the card it would inherit
  from a parent segment.
- OG cards read pictures from `public/` with `ogPublicImage()` (PNG or JPEG only: the card
  renderer draws nothing for WebP); those files are listed in `outputFileTracingIncludes`.
- Taste inspector rules allowed on purpose (`--allow`): `few-pictures` and `empty-screens` (a
  portfolio without photography), `covered-text` (the docked composer covers the page as it
  scrolls, which is the point), `edge-text` (the docked chip row scrolls sideways), `body-size`
  (the answers carry little running text; paragraphs stay at 16 to 17px).
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
| `opengraph-image` / `twitter-image`                                                                                    | Monochrome, like the site. Per locale for Work (headline, award ink panel, Azure "3×" panel), each Work answer (question bubble + the answer's picture; Certifications shows the newest print), Personal (portrait + hello) and each post.     |
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
- `src/lib/og/`: OG template (`OgFrame`, `OgTitle`, `OgLead`, `OgQuestion`, `OgMeta`, `OgPanel`,
  `OgLogo` (a registry logo as an SVG data URI), `OgTrophy`, `clampText`), the per-answer pictures
  (`answers.tsx`: `OgHome`, `OgAnswer`; titles split into balanced lines, since Satori breaks
  greedily) and fonts (Geist 400, 500 and 600 static TTFs, Latin and Latin Extended, with the
  `kern` and `liga` features removed because Satori mis-spaces words after kerned glyphs; OFL
  licence alongside). Satori cannot read woff2, hence the separate TTFs.
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
