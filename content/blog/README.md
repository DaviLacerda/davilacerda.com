# Blog posts

Posts are Markdown files, one per language:

```
content/blog/
  en/<slug>.md       -> https://davilacerda.com/en/personal/blog/<slug>
  pt-br/<slug>.md    -> https://davilacerda.com/pt-br/personal/blog/<slug>
```

The file name is the URL slug: lowercase, words separated by hyphens (`my-first-agent.md`).
Files starting with `_` are ignored (handy for scratch notes).

## Frontmatter

```yaml
---
title: "Building my first agent"           # required
description: "What I learned wiring tools into an LLM loop."  # required, ~120-160 chars (SEO, RSS, social cards)
date: "2026-11-02"                         # required, YYYY-MM-DD (quote it)
updated: "2026-11-10"                      # optional, last meaningful update
tags: ["agents", "llms"]                   # optional, lowercase kebab-case
draft: false                               # optional; true = visible in `yarn dev` only, never in production
translationKey: "first-agent"              # optional; same value in the en and pt-br files of the same post
---
```

`translationKey` links the two language versions of a post. It powers the
`hreflang` alternates, the header's language switcher and the "also available
in" link. Posts without a translation are fine; they simply have no alternate.

## Writing

- Start the body with prose, not a heading: the page renders `title` as the `<h1>`.
  Use `##` and `###` for sections (they get anchor links and feed the table of contents).
- GitHub Flavored Markdown works: tables, task lists, footnotes, strikethrough, autolinks.
- Raw HTML is not rendered.
- Code blocks are highlighted with Shiki (light and dark themes). Optional meta:
  ````md
  ```ts title="agent.ts" {3-5} /tools/
  ```
  ````
  `title` adds a file name, `{3-5}` highlights lines, `/word/` highlights characters.
- Images go in `public/images/blog/<slug>/` and are referenced as `/images/blog/<slug>/file.png`
  (always with alt text).
- External links open in a new tab automatically.

## Checklist

1. Create `content/blog/en/<slug>.md` (and the `pt-br` version if you have one, with the same `translationKey`).
2. Run `yarn dev` and open `/en/personal/blog/<slug>`.
3. Set `draft: false` and commit. Sitemap, RSS, `llms.txt` and structured data pick it up automatically.
