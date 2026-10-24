# Blog posts

Posts are plain Markdown files, one file per language. No CMS, no database:
commit a file and the site rebuilds with it.

```
content/blog/
  en/<slug>.md       -> https://davilacerda.com/en/personal/blog/<slug>
  pt-br/<slug>.md    -> https://davilacerda.com/pt-br/personal/blog/<slug>
```

- The **file name is the URL slug**: lowercase letters, digits and hyphens only
  (`my-first-agent.md`). The build fails on anything else.
- Each language has its **own slug**, so it can be written in that language
  (`en/hello-world.md` and `pt-br/ola-mundo.md`). The two files are tied together
  by `translationKey` (see below), not by their names.
- Files starting with `_` are ignored (handy for scratch notes and outlines).

## Frontmatter

Every post starts with a YAML block between `---` lines:

```yaml
---
title: "Building my first agent"
description: "What I learned wiring tools into an LLM loop, and what I would do differently next time."
date: "2026-11-02"
updated: "2026-11-10"
tags: ["agents", "llms"]
draft: false
translationKey: "first-agent"
---
```

| Field            | Required | What it does                                                                                                                                                                                       |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`          | yes      | The post's `<h1>`, page title, RSS item and social card title. Keep it under ~60 characters.                                                                                                       |
| `description`    | yes      | One or two sentences, ideally 120–160 characters. Used under the title, in the post list, in search results, social cards and RSS. Write it for a human skimming a list.                         |
| `date`           | yes      | Publication date, `"YYYY-MM-DD"` (quote it). Posts are sorted newest first by this date.                                                                                                           |
| `updated`        | no       | Last meaningful update, `"YYYY-MM-DD"`. Shown as "Updated on …" and used as `dateModified` for search engines. Skip it for typo fixes.                                                             |
| `tags`           | no       | List of lowercase, kebab-case tags (`["ai-engineering", "rag"]`). Write them in the post's language (`agents` / `agentes`).                                                                        |
| `draft`          | no       | `true` = only visible in `yarn dev`; never built in production (no page, no RSS, no sitemap). Defaults to `false`.                                                                                 |
| `translationKey` | no       | Any string, **identical in the `en` and `pt-br` files of the same post**. Powers the "Also available in …" link, the header's language switcher, `hreflang` alternates and the JSON-LD link. |

Posts without a translation are fine: they simply have no alternate, and the
language switcher falls back to the other language's home page.

## Adding a post in both languages

1. Pick a `translationKey`, e.g. `"first-agent"`.
2. Create the English version, `content/blog/en/building-my-first-agent.md`:

   ```md
   ---
   title: "Building my first agent"
   description: "What I learned wiring tools into an LLM loop, and what I would do differently next time."
   date: "2026-11-02"
   tags: ["agents", "llms"]
   draft: true
   translationKey: "first-agent"
   ---

   The first paragraph is shown slightly larger, as the article's lead.

   ## The loop

   ...
   ```

3. Create the Portuguese version with its own slug, `content/blog/pt-br/construindo-meu-primeiro-agente.md`,
   with the **same `translationKey` and `date`**:

   ```md
   ---
   title: "Construindo meu primeiro agente"
   description: "O que aprendi ligando ferramentas a um loop de LLM, e o que eu faria diferente da próxima vez."
   date: "2026-11-02"
   tags: ["agentes", "llms"]
   draft: true
   translationKey: "first-agent"
   ---
   ```

4. Run `yarn dev` and open both URLs:
   `http://localhost:3000/en/personal/blog/building-my-first-agent` and
   `http://localhost:3000/pt-br/personal/blog/construindo-meu-primeiro-agente`.
   Check the "Also available in …" link and the language switcher in the header.
5. Set `draft: false` in both files and commit. The blog list on the Personal page,
   the RSS feeds, the sitemap, `llms.txt`, the Markdown versions of the pages and the
   structured data all pick the post up automatically.

Publishing in only one language? Skip step 3 (and you can leave out `translationKey`).

## Writing

- **Start with prose, not a heading**: the page renders `title` as the `<h1>`, and the
  first paragraph is styled as the lead.
- Use `##` for sections and `###` for subsections. They get anchor links, and with two
  or more of them the post gets a table of contents ("On this page").
- GitHub Flavored Markdown works: tables, task lists, footnotes, strikethrough, autolinks.
- Raw HTML is **not** rendered (it is stripped for safety).
- `> quote` renders as an italic pull quote; use it sparingly.
- Code blocks are highlighted with Shiki in light and dark themes. Optional meta after the language:

  ````md
  ```ts title="agent.ts" {3-5} /tools/
  ```
  ````

  `title` adds a file name, `{3-5}` highlights lines, `/word/` highlights matching text.

- Images go in `public/images/blog/<slug>/` and are referenced as
  `/images/blog/<slug>/file.png`, always with alt text: `![What the image shows](/images/blog/<slug>/file.png)`.
- Links: external links open in a new tab automatically. Link to other pages with
  site-relative paths (`/en/personal/blog/other-post`); the RSS feed makes them absolute.
- Reading time is estimated automatically (code blocks are not counted).

## Checklist

- [ ] File name is a kebab-case slug, in `content/blog/en/` or `content/blog/pt-br/`.
- [ ] `title`, `description` and a quoted `date` are set.
- [ ] Both language versions share the same `translationKey` (if translated).
- [ ] The body starts with a paragraph and uses `##` / `###` headings.
- [ ] Images have alt text.
- [ ] `draft: false` when it is ready, then commit.
