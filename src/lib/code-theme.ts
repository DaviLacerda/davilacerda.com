import type { ThemeRegistrationRaw } from "shiki";

/*
 * Code highlighting in the site's monochrome palette: ink for code, weight
 * for keywords, a softer grey for strings and literals, the muted grey for
 * comments (no italics anywhere on the site), and muted punctuation. Every
 * colour passes WCAG AA on the code block's surface (#f4f4f4 light, #181818
 * dark).
 */

type Palette = {
  ink: string;
  /** Strings and literals: between ink and muted. */
  soft: string;
  muted: string;
  surface: string;
};

function inkTheme(name: string, type: "light" | "dark", c: Palette) {
  return {
    name,
    type,
    colors: {
      "editor.foreground": c.ink,
      "editor.background": c.surface,
    },
    settings: [
      { settings: { foreground: c.ink } },
      {
        scope: ["comment", "punctuation.definition.comment"],
        settings: { foreground: c.muted, fontStyle: "" },
      },
      {
        scope: [
          "punctuation",
          "meta.brace",
          "keyword.operator",
          "meta.tag punctuation.definition.tag",
        ],
        settings: { foreground: c.muted, fontStyle: "" },
      },
      {
        scope: [
          "keyword",
          "storage",
          "storage.type",
          "storage.modifier",
          "keyword.control",
          "variable.language",
        ],
        settings: { foreground: c.ink, fontStyle: "bold" },
      },
      {
        scope: [
          "string",
          "string.template",
          "punctuation.definition.string",
          "constant.numeric",
          "constant.language",
          "constant.character",
          "markup.inline.raw",
        ],
        settings: { foreground: c.soft },
      },
      {
        scope: ["markup.heading", "markup.bold"],
        settings: { fontStyle: "bold" },
      },
      {
        scope: ["markup.deleted"],
        settings: { foreground: c.muted },
      },
    ],
  } satisfies ThemeRegistrationRaw;
}

export const codeThemes = {
  light: inkTheme("davi-ink-light", "light", {
    ink: "#0a0a0a",
    soft: "#454545",
    muted: "#666666",
    surface: "#f4f4f4",
  }),
  dark: inkTheme("davi-ink-dark", "dark", {
    ink: "#ededed",
    soft: "#c2c2c2",
    muted: "#a1a1a1",
    surface: "#181818",
  }),
};
