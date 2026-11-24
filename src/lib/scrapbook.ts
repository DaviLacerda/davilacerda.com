import "server-only";

import type { Element, ElementContent, Root, RootContent } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toString } from "hast-util-to-string";

import { getBrand } from "@/content/brands";
import type { Locale } from "@/i18n";
import { t } from "@/i18n";
import { getLogoSvg, scopeSvgIds } from "@/lib/logos";

/*
 * The notebook look of a blog post, from plain Markdown (raw HTML stays off):
 *
 * - `[Claude](brand:claude)`: a chip with the brand's icon and a small card
 *   on hover or focus (see `src/content/brands.ts`).
 * - `[criar](scribble:underline)` (or `circle`, `double`): the words with a
 *   hand-drawn stroke that draws itself when it scrolls into view.
 * - `[7 nov, 2h da manhã](note:)`: a few words in handwriting.
 * - A paragraph holding only images: prints taped to the page, side by side
 *   when there are two or three, each image's title as its handwritten
 *   caption: `![What it shows](/images/x.webp "the caption")`.
 * - `> [!note] Title` on the first line of a quote: a taped note on lined
 *   paper. Any other quote: a pull quote in handwriting.
 *
 * Elements that animate carry `data-reveal` or `data-scribble`; the client
 * script in `ScrapbookMotion` plays them once, and without it they simply
 * show (reduced motion too).
 */

type Options = {
  lang: Locale;
  /**
   * For feed readers: chips become plain links, scribbles and notes plain
   * words (prints and quotes keep their markup, which degrades to an image
   * and a quote).
   */
  plain?: boolean;
};

const SCRIBBLES: Record<string, { viewBox: string; paths: string[] }> = {
  underline: {
    viewBox: "0 0 100 12",
    paths: ["M2 8.5 C 22 5.5, 48 10.5, 72 6.5 S 92 6, 98 7"],
  },
  double: {
    viewBox: "0 0 100 14",
    paths: ["M2 6 C 26 3.5, 52 8, 98 4.5", "M6 11 C 30 9, 60 12.5, 94 9.5"],
  },
  circle: {
    viewBox: "0 0 100 40",
    paths: [
      "M56 4.5 C 80 3, 98 10, 97 20 C 96 32, 66 37.5, 42 36.5 C 16 35.5, 2.5 28, 3.5 18 C 4.5 8, 28 3, 62 6.5",
    ],
  },
};

/** Gentle tilts for prints, in turn: never two the same way in a row. */
const TILTS = [-1.4, 1.1, -0.6, 1.6, -1.1, 0.8];

type Props = Record<string, string | number | boolean | string[] | undefined>;

function el(
  tagName: string,
  properties: Props,
  children: ElementContent[] = [],
): Element {
  return {
    type: "element",
    tagName,
    properties: properties as Element["properties"],
    children,
  };
}

function text(value: string): ElementContent {
  return { type: "text", value };
}

function svgFromString(svg: string): Element {
  const root = fromHtml(svg, { fragment: true, space: "svg" });
  const node = root.children.find(
    (child): child is Element => child.type === "element",
  );
  if (!node) throw new Error("[scrapbook] empty SVG");
  return node;
}

let uid = 0;

function brandChip(id: string, label: ElementContent[], lang: Locale): Element {
  const brand = getBrand(id);
  if (!brand) {
    throw new Error(`[blog] unknown brand "${id}" (see src/content/brands.ts)`);
  }
  const cardId = `brand-${id}-${++uid}`;
  const href = brand.url.startsWith("/") ? `/${lang}${brand.url}` : brand.url;
  const external = !href.startsWith("/");

  const icon = (size: "chip" | "card"): Element => {
    if (brand.logo) {
      const svg = getLogoSvg(brand.logo);
      return svgFromString(
        `<svg viewBox="${svg.viewBox}" class="brand-icon brand-icon-${size}" aria-hidden="true" focusable="false">${scopeSvgIds(svg.body, `${cardId}-${size}-`)}</svg>`,
      );
    }
    if (brand.image) {
      return el("img", {
        src: brand.image,
        alt: "",
        width: 64,
        height: 64,
        loading: "lazy",
        className: ["brand-icon", `brand-icon-${size}`, "brand-icon-image"],
      });
    }
    return el(
      "span",
      {
        ariaHidden: "true",
        className: ["brand-icon", `brand-icon-${size}`, "brand-icon-initial"],
      },
      [text(brand.name.charAt(0))],
    );
  };

  const by = brand.by ? t(brand.by, lang) : null;
  const host = external ? new URL(href).hostname.replace(/^www\./, "") : null;

  return el(
    "span",
    {
      className: ["brand-chip"],
      style: `--brand:${brand.color};--on-brand:${brand.onColor ?? "#fff"}`,
    },
    [
      el(
        "a",
        {
          href,
          className: ["brand-chip-link"],
          ariaDescribedBy: cardId,
          ...(external
            ? { target: "_blank", rel: ["noopener", "noreferrer"] }
            : {}),
        },
        [icon("chip"), el("span", { className: ["brand-chip-name"] }, label)],
      ),
      el("span", { id: cardId, role: "tooltip", className: ["brand-card"] }, [
        el("span", { className: ["brand-card-head"], ariaHidden: "true" }, [
          icon("card"),
        ]),
        el("span", { className: ["brand-card-body"] }, [
          ...(by
            ? [el("span", { className: ["brand-card-by"] }, [text(by)])]
            : []),
          el("span", { className: ["brand-card-name"] }, [text(brand.name)]),
          el("span", { className: ["brand-card-desc"] }, [
            text(t(brand.description, lang)),
          ]),
          ...(host
            ? [
                el("span", { className: ["brand-card-host"] }, [
                  text(`${host} ↗`),
                ]),
              ]
            : []),
        ]),
      ]),
    ],
  );
}

function scribble(kind: string, label: ElementContent[]): Element {
  const shape = SCRIBBLES[kind];
  if (!shape) throw new Error(`[blog] unknown scribble "${kind}"`);
  return el(
    "span",
    { className: ["scribble", `scribble-${kind}`], dataScribble: "" },
    [
      ...label,
      el(
        "svg",
        {
          viewBox: shape.viewBox,
          preserveAspectRatio: "none",
          ariaHidden: "true",
          focusable: "false",
        },
        shape.paths.map((d, i) =>
          el("path", {
            d,
            pathLength: 1,
            style: `--delay:${i * 180}ms`,
          }),
        ),
      ),
    ],
  );
}

/** Links with the `brand:`, `scribble:` and `note:` schemes. */
function transformInline(node: Root | Element, lang: Locale, plain: boolean) {
  node.children = node.children.map((child) => {
    if (child.type !== "element") return child;
    const href = child.properties.href;
    if (child.tagName === "a" && typeof href === "string") {
      const [scheme, value = ""] = href.split(":", 2) as [string, string?];
      const label = child.children;
      if (plain && scheme === "brand") {
        const brand = getBrand(value);
        if (!brand) return el("span", {}, label);
        child.properties.href = brand.url.startsWith("/")
          ? `/${lang}${brand.url}`
          : brand.url;
        return child;
      }
      if (plain && (scheme === "scribble" || scheme === "note")) {
        return el("span", {}, label);
      }
      if (scheme === "brand") return brandChip(value, label, lang);
      if (scheme === "scribble") return scribble(value || "underline", label);
      if (scheme === "note") {
        return el("span", { className: ["hand-note"] }, label);
      }
    }
    transformInline(child, lang, plain);
    return child;
  }) as typeof node.children;
}

function isBlank(node: ElementContent | RootContent) {
  return node.type === "text" && !node.value.trim();
}

/** A paragraph of nothing but images -> taped prints. */
function prints(p: Element, start: number): Element | null {
  const content = p.children.filter((child) => !isBlank(child));
  const images = content.filter(
    (child): child is Element =>
      child.type === "element" && child.tagName === "img",
  );
  if (!images.length || images.length !== content.length) return null;
  return el(
    "div",
    { className: ["prints"], dataPrints: String(images.length) },
    images.map((img, i) => {
      const caption =
        typeof img.properties.title === "string" ? img.properties.title : "";
      delete img.properties.title;
      img.properties.loading = "lazy";
      img.properties.decoding = "async";
      const src = String(img.properties.src ?? "");
      return el(
        "figure",
        {
          className: ["print"],
          dataReveal: "",
          style: `--tilt:${TILTS[(start + i) % TILTS.length]}deg;--i:${i}`,
        },
        [
          el("span", { className: ["tape"], ariaHidden: "true" }),
          el(
            "a",
            {
              href: src,
              className: ["print-image"],
              target: "_blank",
              rel: ["noopener"],
            },
            [img],
          ),
          ...(caption ? [el("figcaption", {}, [text(caption)])] : []),
        ],
      );
    }),
  );
}

/** `> [!note] Title` -> a taped note; other quotes -> handwriting. */
function quote(node: Element): Element {
  const first = node.children.find(
    (child): child is Element => child.type === "element",
  );
  const lead = first?.children[0];
  if (first?.tagName === "p" && lead?.type === "text") {
    const match = /^\[!note\][ \t]*([^\n]*)\n?/i.exec(lead.value);
    if (match) {
      lead.value = lead.value.slice(match[0].length);
      if (!toString(first).trim()) {
        node.children = node.children.filter((child) => child !== first);
      }
      return el("aside", { className: ["taped-note"], dataReveal: "" }, [
        el("span", { className: ["tape"], ariaHidden: "true" }),
        ...(match[1]?.trim()
          ? [
              el("p", { className: ["taped-note-title"] }, [
                text(match[1].trim()),
              ]),
            ]
          : []),
        ...node.children,
      ]);
    }
  }
  node.properties.className = ["hand-quote"];
  node.properties.dataReveal = "";
  return node;
}

export function rehypeScrapbook({ lang, plain = false }: Options) {
  return (tree: Root) => {
    transformInline(tree, lang, plain);
    let printCount = 0;
    tree.children = tree.children.map((child) => {
      if (child.type !== "element") return child;
      if (child.tagName === "p") {
        const result = prints(child, printCount);
        if (result) {
          printCount += result.children.length;
          return result;
        }
      }
      if (child.tagName === "blockquote") return quote(child);
      return child;
    });
  };
}

/**
 * The same Markdown for readers that are not this page (llms-full.txt, the
 * Markdown versions, RSS): chips become plain links to the brand, scribbles
 * and notes plain words.
 */
export function plainScrapbookMarkdown(markdown: string, lang: Locale): string {
  return markdown
    .replace(/\[([^\]]+)\]\(brand:([a-z0-9-]+)\)/g, (_, label, id) => {
      const brand = getBrand(id);
      if (!brand) return label;
      const href = brand.url.startsWith("/")
        ? `/${lang}${brand.url}`
        : brand.url;
      return `[${label}](${href})`;
    })
    .replace(/\[([^\]]+)\]\((?:scribble:[a-z]*|note:)\)/g, "$1")
    .replace(/^>\s*\[!note\][ \t]*(.*)$/gim, (_, title) =>
      title.trim() ? `> **${title.trim()}**\n>` : ">",
    );
}
