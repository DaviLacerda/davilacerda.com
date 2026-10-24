/**
 * Site-wide constants that are not localized. Localized copy lives in the
 * dictionaries (`src/i18n/dictionaries`), facts about Davi in
 * `src/content/profile.ts`.
 */
export const siteConfig = {
  name: "Davi Lacerda",
  /** Canonical origin, no trailing slash. */
  url: "https://davilacerda.com",
  /** Brand violet, used for `theme-color`, manifest and OG images. */
  brandColor: "#5b21b6",
  themeColor: {
    light: "#fbfaf7",
    dark: "#0e0e12",
  },
  /** Keywords shared by every page (pages may add their own). */
  keywords: [
    "Davi Lacerda",
    "AI Engineer",
    "LLM Engineer",
    "Generative AI",
    "RAG",
    "Retrieval-Augmented Generation",
    "AI agents",
    "Agentic AI",
    "Multi-agent systems",
    "Model Context Protocol",
    "LLM applications",
    "Azure",
    "AI SDK",
    "Machine Learning",
    "TypeScript",
    "Python",
    "Next.js",
    "Uberlândia",
    "Brazil",
    "Engenheiro de IA",
    "IA Generativa",
  ],
} as const;

export type SiteConfig = typeof siteConfig;
