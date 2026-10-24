import "server-only";

import type { Element, Root } from "hast";
import { toString } from "hast-util-to-string";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode, {
  type Options as PrettyCodeOptions,
} from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { siteConfig } from "@/config/site";
import { codeThemes } from "@/lib/code-theme";

export type Heading = {
  /** 2 for `##`, 3 for `###`. */
  depth: 2 | 3;
  /** Slug used as the element id (anchor). */
  id: string;
  text: string;
};

export type RenderedMarkdown = {
  html: string;
  /** h2/h3 outline, for a table of contents. */
  headings: Heading[];
};

const prettyCodeOptions: PrettyCodeOptions = {
  theme: codeThemes,
  keepBackground: false,
  defaultLang: { block: "plaintext" },
};

function walk(node: Root | Element, visit: (el: Element) => void) {
  for (const child of node.children) {
    if (child.type === "element") {
      visit(child);
      walk(child, visit);
    }
  }
}

/** Collects h2/h3 headings (after rehype-slug assigned ids). */
function rehypeCollectHeadings(target: Heading[]) {
  return () => (tree: Root) => {
    walk(tree, (el) => {
      if (
        (el.tagName === "h2" || el.tagName === "h3") &&
        typeof el.properties.id === "string"
      ) {
        target.push({
          depth: el.tagName === "h2" ? 2 : 3,
          id: el.properties.id,
          text: toString(el),
        });
      }
    });
  };
}

/** Opens off-site links in a new tab with safe `rel`. */
function rehypeExternalLinks() {
  return (tree: Root) => {
    walk(tree, (el) => {
      const href = el.properties.href;
      if (el.tagName !== "a" || typeof href !== "string") return;
      if (/^https?:\/\//.test(href) && !href.startsWith(siteConfig.url)) {
        el.properties.target = "_blank";
        el.properties.rel = ["noopener", "noreferrer"];
      }
    });
  };
}

/**
 * Marks each highlighted code block as an interface fragment (`data-ui`):
 * code keeps its own face, surface and horizontal scroll, so page-level
 * layout rules (margins, measure) do not apply inside it.
 */
function rehypeMarkCodeBlocks() {
  return (tree: Root) => {
    walk(tree, (el) => {
      const props = el.properties;
      if (
        el.tagName === "figure" &&
        ("dataRehypePrettyCodeFigure" in props ||
          "data-rehype-pretty-code-figure" in props)
      ) {
        props.dataUi = "";
      }
    });
  };
}

/**
 * Markdown -> HTML: GFM (tables, task lists, footnotes, autolinks), heading ids
 * and self-links, external link handling, and Shiki highlighting with dual
 * light/dark themes. Raw HTML in markdown is NOT rendered (safe by default).
 *
 * Code fences support rehype-pretty-code meta, e.g.
 * ```ts title="agent.ts" {2-3} /tool/
 */
export async function renderMarkdown(
  markdown: string,
): Promise<RenderedMarkdown> {
  const headings: Heading[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeCollectHeadings(headings))
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: { className: ["heading-anchor"] },
    })
    .use(rehypeExternalLinks)
    .use(rehypePrettyCode, prettyCodeOptions)
    .use(rehypeMarkCodeBlocks)
    .use(rehypeStringify)
    .process(markdown);

  return { html: String(file), headings };
}
