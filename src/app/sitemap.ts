import type { MetadataRoute } from "next";

import { locales } from "@/i18n";
import { profileLastModified, siteLastModified } from "@/lib/agents/dates";
import { getAllPosts, getPostAlternates } from "@/lib/blog";
import { routes } from "@/lib/routes";
import { hreflangAlternates, localizedPaths } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";
import { topicIds } from "@/lib/work/topics";

/**
 * Every HTML page in every locale (Work, its answers, Personal, posts), with
 * hreflang alternates (`xhtml:link`, including x-default) and `lastmod`. Markdown/JSON renditions are discovered
 * through Link headers, llms.txt and the API catalog instead.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const profileUpdated = profileLastModified();
  const personalUpdated = siteLastModified();

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

  const topics: MetadataRoute.Sitemap = locales.flatMap((lang) =>
    topicIds.map((topic) => ({
      url: absoluteUrl(routes.topic(lang, topic)),
      lastModified: profileUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.9,
      alternates: {
        languages: hreflangAlternates(localizedPaths(`/work/${topic}`)),
      },
    })),
  );

  const posts: MetadataRoute.Sitemap = locales.flatMap((lang) =>
    getAllPosts(lang).map((post) => ({
      url: absoluteUrl(post.url),
      lastModified: post.updated ?? post.date,
      changeFrequency: "yearly",
      priority: 0.7,
      alternates: { languages: hreflangAlternates(getPostAlternates(post)) },
    })),
  );

  return [...pages, ...topics, ...posts];
}
