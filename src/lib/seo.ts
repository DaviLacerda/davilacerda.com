import type { Metadata } from "next";
import type {
  BlogLeaf,
  BlogPostingLeaf,
  BreadcrumbListLeaf,
  EducationalOccupationalCredential,
  FAQPageLeaf,
  PersonLeaf,
  ProfilePageLeaf,
  WebSiteLeaf,
} from "schema-dts";

import { siteConfig } from "@/config/site";
import { allSkills, profile, type FaqItem } from "@/content/profile";
import { getDictionary, localeMeta, locales, t, type Locale } from "@/i18n";
import { toIsoDate } from "@/i18n/format";
import { markdownPathFor } from "@/lib/agents/discovery";
import type { PostMeta } from "@/lib/blog";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/utils";

/* ==========================================================================
 * Metadata
 * ======================================================================== */

/** Locale -> locale-prefixed path, e.g. { en: "/en/personal", "pt-br": "/pt-br/personal" }. */
export type AlternatePaths = Partial<Record<Locale, string>>;

/**
 * Paths for a page that exists in every locale under the same locale-less path.
 * `localizedPaths("/personal")` -> { en: "/en/personal", "pt-br": "/pt-br/personal" }
 * `localizedPaths("/")` -> { en: "/en", "pt-br": "/pt-br" }
 */
export function localizedPaths(path: string): Record<Locale, string> {
  const tail =
    path === "/" || path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  return Object.fromEntries(
    locales.map((lang) => [lang, `/${lang}${tail}`]),
  ) as Record<Locale, string>;
}

/**
 * `alternates.languages` for Next metadata: absolute URLs keyed by hreflang
 * ("en", "pt-BR") plus "x-default" (English, or the first available locale).
 */
export function hreflangAlternates(
  paths: AlternatePaths,
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const lang of locales) {
    const path = paths[lang];
    if (path) languages[localeMeta[lang].hreflang] = absoluteUrl(path);
  }
  const fallback = paths.en ?? locales.map((l) => paths[l]).find(Boolean);
  if (fallback) languages["x-default"] = absoluteUrl(fallback);
  return languages;
}

/**
 * `<link rel="alternate" type="text/markdown">` for pages that have a Markdown
 * rendition (Work, Personal, posts; see `@/lib/agents/discovery`).
 */
export function markdownAlternate(
  path: string,
  noIndex?: boolean,
): Record<string, string> {
  const markdown = noIndex ? null : markdownPathFor(path);
  return markdown ? { "text/markdown": absoluteUrl(markdown) } : {};
}

export type OgImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type PageMetadataInput = {
  lang: Locale;
  /**
   * Page title. The root layout template renders it as "<title> | Davi Lacerda".
   * Omit on the Work (home) page to use the dictionary's default title.
   */
  title?: string;
  description: string;
  /** Locale-less path for pages that exist in every locale ("/", "/personal"). */
  path?: string;
  /** Explicit per-locale paths (blog posts have different slugs). Takes precedence over `path`. */
  alternates?: AlternatePaths;
  /** OpenGraph type. Default "website". */
  type?: "website" | "article" | "profile";
  /** Extra keywords, merged with the site-wide list. */
  keywords?: string[];
  /**
   * Explicit OG/Twitter images. Usually omit: an `opengraph-image.tsx` file in
   * the route segment is picked up automatically and takes precedence.
   */
  images?: OgImage[];
  /** For `type: "article"`. */
  article?: { publishedTime: string; modifiedTime?: string; tags?: string[] };
  noIndex?: boolean;
};

/**
 * Builds a complete `Metadata` object for a page: title, description,
 * canonical, hreflang alternates, OpenGraph and Twitter card.
 *
 * Always return the full object from `generateMetadata`: Next merges metadata
 * shallowly, so a page-level `openGraph` replaces the layout's entirely.
 *
 * @example
 * export async function generateMetadata({ params }): Promise<Metadata> {
 *   const { lang } = await params; // after isLocale() check
 *   const dict = getDictionary(lang);
 *   return buildMetadata({ lang, path: "/personal", title: dict.meta.personal.title, description: dict.meta.personal.description });
 * }
 */
export function buildMetadata(input: PageMetadataInput): Metadata {
  const {
    lang,
    title,
    description,
    type = "website",
    keywords = [],
    images,
    noIndex,
  } = input;
  const dict = getDictionary(lang);
  const paths = input.alternates ?? localizedPaths(input.path ?? "/");
  const selfPath = paths[lang] ?? `/${lang}`;
  const url = absoluteUrl(selfPath);
  const fullTitle = title
    ? `${title} | ${dict.meta.siteName}`
    : dict.meta.defaultTitle;
  const meta = localeMeta[lang];
  const alternateLocale = locales
    .filter((l) => l !== lang && paths[l])
    .map((l) => localeMeta[l].ogLocale);

  const base = {
    url,
    title: fullTitle,
    description,
    siteName: dict.meta.siteName,
    locale: meta.ogLocale,
    alternateLocale,
    ...(images ? { images } : {}),
  };

  const openGraph: Metadata["openGraph"] =
    type === "article"
      ? {
          ...base,
          type: "article",
          publishedTime: input.article?.publishedTime,
          modifiedTime: input.article?.modifiedTime,
          tags: input.article?.tags,
          authors: [absoluteUrl(routes.work(lang))],
        }
      : type === "profile"
        ? {
            ...base,
            type: "profile",
            firstName: profile.givenName,
            lastName: profile.familyName,
            username: "DaviLacerda",
          }
        : { ...base, type: "website" };

  return {
    title: title ?? { absolute: dict.meta.defaultTitle },
    description,
    keywords: [...new Set([...siteConfig.keywords, ...keywords])],
    alternates: {
      canonical: url,
      languages: hreflangAlternates(paths),
      types: {
        "application/rss+xml": absoluteUrl(routes.rss(lang)),
        ...markdownAlternate(selfPath, noIndex),
      },
    },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/* ==========================================================================
 * JSON-LD (schema.org)
 *
 * Builders return bare nodes (no @context). Render one or many with
 * <JsonLd data={...} /> from "@/components/seo/json-ld", which adds the
 * context and wraps arrays in an @graph. Nodes reference each other by @id,
 * so the Person/WebSite are defined once and linked from everywhere.
 * ======================================================================== */

export const jsonLdIds = {
  person: `${siteConfig.url}/#person`,
  website: `${siteConfig.url}/#website`,
  employer: `${siteConfig.url}/#employer`,
  blog: (lang: Locale) => `${absoluteUrl(routes.personal(lang))}#blog`,
} as const;

/** De-duplicates strings ignoring case, keeping the first spelling. */
function uniqueCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The Person entity: Davi, with job, education, skills, credentials and profiles. */
export function personJsonLd(lang: Locale): PersonLeaf {
  const education = profile.education[0];
  const credentials: EducationalOccupationalCredential[] =
    profile.certifications.map((cert) => ({
      "@type": "EducationalOccupationalCredential",
      name: t(cert.name, lang),
      credentialCategory:
        cert.kind === "certification"
          ? "Professional certification"
          : "Certificate",
      recognizedBy: {
        "@type": "Organization",
        name: cert.issuer,
        url: cert.issuerUrl,
      },
      ...(cert.date ? { dateCreated: toIsoDate(cert.date) } : {}),
      ...(cert.credentialUrl ? { url: cert.credentialUrl } : {}),
    }));

  return {
    "@type": "Person",
    "@id": jsonLdIds.person,
    name: profile.name,
    alternateName: profile.fullName,
    givenName: profile.givenName,
    familyName: profile.familyName,
    url: absoluteUrl(routes.work(lang)),
    ...(profile.image ? { image: absoluteUrl(profile.image) } : {}),
    email: `mailto:${profile.email}`,
    jobTitle: t(profile.headline, lang),
    description: t(profile.tldr, lang),
    worksFor: {
      "@type": "Organization",
      "@id": jsonLdIds.employer,
      name: profile.currentEmployer.name,
      ...(profile.currentEmployer.url
        ? { url: profile.currentEmployer.url }
        : {}),
    },
    ...(education
      ? {
          alumniOf: {
            "@type": "CollegeOrUniversity",
            name: t(education.institution, lang),
            ...(education.shortName
              ? { alternateName: education.shortName }
              : {}),
            ...(education.url ? { url: education.url } : {}),
          },
        }
      : {}),
    homeLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: profile.location.city,
        addressRegion: profile.location.regionCode,
        addressCountry: profile.location.countryCode,
      },
    },
    knowsAbout: uniqueCaseInsensitive([...profile.knowsAbout, ...allSkills()]),
    knowsLanguage: profile.languages.map((language) => language.code),
    hasCredential: credentials,
    award: profile.achievements
      .filter((achievement) => achievement.featured)
      .map((achievement) =>
        [t(achievement.title, lang), achievement.issuer]
          .filter(Boolean)
          .join(", "),
      ),
    sameAs: profile.socials
      .filter((social) => social.sameAs)
      .map((social) => social.url),
  };
}

/** The WebSite entity (one per locale edition). */
export function websiteJsonLd(lang: Locale): WebSiteLeaf {
  const dict = getDictionary(lang);
  return {
    "@type": "WebSite",
    "@id": jsonLdIds.website,
    url: siteConfig.url,
    name: dict.meta.siteName,
    description: dict.meta.description,
    inLanguage: locales.map((l) => localeMeta[l].htmlLang),
    author: { "@id": jsonLdIds.person },
    publisher: { "@id": jsonLdIds.person },
  };
}

/** ProfilePage wrapping the Person (use on the Work page; optionally on Personal). */
export function profilePageJsonLd(
  lang: Locale,
  options: { path?: string; name?: string; description?: string } = {},
): ProfilePageLeaf {
  const dict = getDictionary(lang);
  const url = absoluteUrl(options.path ?? routes.work(lang));
  return {
    "@type": "ProfilePage",
    "@id": `${url}#profilepage`,
    url,
    name: options.name ?? dict.meta.defaultTitle,
    description: options.description ?? dict.meta.description,
    inLanguage: localeMeta[lang].htmlLang,
    isPartOf: { "@id": jsonLdIds.website },
    mainEntity: { "@id": jsonLdIds.person },
    about: { "@id": jsonLdIds.person },
  };
}

export type BreadcrumbItem = { name: string; path: string };

/** BreadcrumbList from ordered items, e.g. [{ name: "Personal", path: "/en/personal" }, ...]. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): BreadcrumbListLeaf {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Blog entity listing the locale's posts (use on the Personal page). */
export function blogJsonLd(lang: Locale, posts: PostMeta[]): BlogLeaf {
  const dict = getDictionary(lang);
  return {
    "@type": "Blog",
    "@id": jsonLdIds.blog(lang),
    url: absoluteUrl(routes.blog(lang)),
    name: `${dict.meta.siteName} | ${dict.meta.blog.title}`,
    description: dict.meta.blog.description,
    inLanguage: localeMeta[lang].htmlLang,
    author: { "@id": jsonLdIds.person },
    publisher: { "@id": jsonLdIds.person },
    isPartOf: { "@id": jsonLdIds.website },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      "@id": `${absoluteUrl(post.url)}#article`,
      headline: post.title,
      url: absoluteUrl(post.url),
      datePublished: post.date,
    })),
  };
}

/** BlogPosting for an article page. `image` is the absolute OG image URL, if known. */
export function blogPostingJsonLd(
  post: PostMeta,
  options: { image?: string; translations?: AlternatePaths } = {},
): BlogPostingLeaf {
  const url = absoluteUrl(post.url);
  const otherVersions = Object.entries(options.translations ?? {})
    .filter(([lang, path]) => lang !== post.lang && path)
    .map(([, path]) => ({ "@id": `${absoluteUrl(path as string)}#article` }));

  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    inLanguage: localeMeta[post.lang].htmlLang,
    keywords: post.tags,
    wordCount: post.wordCount,
    timeRequired: `PT${post.readingTime}M`,
    ...(options.image ? { image: options.image } : {}),
    author: { "@id": jsonLdIds.person },
    publisher: { "@id": jsonLdIds.person },
    isPartOf: { "@id": jsonLdIds.blog(post.lang) },
    ...(otherVersions.length ? { workTranslation: otherVersions } : {}),
  };
}

/** FAQPage from Q&A pairs (defaults to the profile FAQ). Answers must match visible text. */
export function faqPageJsonLd(
  lang: Locale,
  items: FaqItem[] = profile.faq,
): FAQPageLeaf {
  return {
    "@type": "FAQPage",
    inLanguage: localeMeta[lang].htmlLang,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: t(item.question, lang),
      acceptedAnswer: { "@type": "Answer", text: t(item.answer, lang) },
    })),
  };
}
