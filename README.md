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

## Writing posts

See [content/blog/README.md](content/blog/README.md).

## For agents

Every page has a Markdown version (append `.md`, or send `Accept: text/markdown`). The site also
publishes `/llms.txt`, `/llms-full.txt`, JSON and JSON Resume under `/api` and `/resume.json`, a
read-only MCP server at `/mcp`, and discovery documents under `/.well-known` (API catalog, MCP
server card, agent skill). See "Agent readiness" in [ARCHITECTURE.md](ARCHITECTURE.md).

## Project structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for folders, design tokens, components and conventions.
