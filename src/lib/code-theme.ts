import type { ThemeRegistrationRaw } from "shiki";

/*
 * Code highlighting in the site's palette: ink for code, grey for comments
 * and punctuation, signal red for strings and literals, weight for keywords.
 * Every colour is a token from globals.css and passes WCAG AA on the code
 * block's surface (#f2f2f2 light, #1b1b1b dark).
 */

type Palette = {
  ink: string;
  muted: string;
  accent: string;
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
        settings: { foreground: c.muted },
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
        settings: { foreground: c.accent },
      },
      {
        scope: ["markup.heading", "markup.bold"],
        settings: { fontStyle: "bold" },
      },
      {
        scope: ["markup.deleted"],
        settings: { foreground: c.accent },
      },
    ],
  } satisfies ThemeRegistrationRaw;
}

export const codeThemes = {
  light: inkTheme("davi-ink-light", "light", {
    ink: "#0a0a0a",
    muted: "#666666",
    accent: "#c4251c",
    surface: "#f2f2f2",
  }),
  dark: inkTheme("davi-ink-dark", "dark", {
    ink: "#ededed",
    muted: "#a3a3a3",
    accent: "#ff5a50",
    surface: "#1b1b1b",
  }),
};
