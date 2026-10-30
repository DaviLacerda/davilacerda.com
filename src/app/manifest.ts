import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { profile } from "@/content/profile";
import { defaultLocale, getDictionary, localeMeta } from "@/i18n";

/** Web app manifest (`/manifest.webmanifest`). The icons in /public come from `yarn brand`. */
export default function manifest(): MetadataRoute.Manifest {
  const dict = getDictionary(defaultLocale);
  return {
    id: "/",
    name: dict.meta.defaultTitle,
    short_name: profile.name,
    description: dict.meta.description,
    lang: localeMeta[defaultLocale].htmlLang,
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "minimal-ui",
    background_color: siteConfig.themeColor.light,
    theme_color: siteConfig.themeColor.light,
    categories: ["portfolio", "technology", "education"],
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
