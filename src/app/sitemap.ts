import type { MetadataRoute } from "next";

import { locales } from "@/i18n";
import { latestPostDate, profileLastModified } from "@/lib/agents/dates";
import { getAllPosts, getPostAlternates } from "@/lib/blog";
import { routes } from "@/lib/routes";
import { hreflangAlternates, localizedPaths } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

/**
 * Every HTML page in every locale, with hreflang alternates (`xhtml:link`,
 * including x-default) and `lastmod`. Markdown/JSON renditions are discovered
 * through Link headers, llms.txt and the API catalog instead.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const profileUpdated = profileLastModified();
  const personalUpdated =
    [profileUpdated, latestPostDate() ?? ""].sort().at(-1) ?? profileUpdated;

  const pages: MetadataRoute.Sitemap = locales.flatMap((lang) => [
    {
      url: absoluteUrl(routes.work(lang)),
      lastModified: profileUpdated,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: hreflangAlternates(localizedPaths("/")) },
    },
    {
      url: absoluteUrl(routes.personal(lang)),
      lastModified: personalUpdated,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: hreflangAlternates(localizedPaths("/personal")),
      },
    },
  ]);

  const posts: MetadataRoute.Sitemap = locales.flatMap((lang) =>
    getAllPosts(lang).map((post) => ({
      url: absoluteUrl(post.url),
      lastModified: post.updated ?? post.date,
      changeFrequency: "yearly",
      priority: 0.7,
      alternates: { languages: hreflangAlternates(getPostAlternates(post)) },
    })),
  );

  return [...pages, ...posts];
}
