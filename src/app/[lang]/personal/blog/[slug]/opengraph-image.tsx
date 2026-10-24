import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, getDictionary, interpolate, isLocale, t } from "@/i18n";
import { formatDate } from "@/i18n/format";
import { getAllPostParams, getAllPosts } from "@/lib/blog";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  OgLead,
  OgTitle,
  loadOgFonts,
} from "@/lib/og/template";

/** Social card for a blog post: title, description, date and reading time. */
export const alt = `${profile.name}, blog`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getAllPostParams();
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: value, slug } = await params;
  const lang = isLocale(value) ? value : defaultLocale;
  const dict = getDictionary(lang);
  const post = getAllPosts(lang).find((p) => p.slug === slug);

  const title = post?.title ?? dict.blog.title;
  const eyebrow = post
    ? `${dict.nav.blog} · ${formatDate(post.date, lang, "short")}`
    : dict.nav.blog;

  return new ImageResponse(
    <OgFrame
      eyebrow={eyebrow}
      footer={[
        profile.name,
        t(profile.headline, lang),
        ...(post
          ? [interpolate(dict.blog.readingTime, { minutes: post.readingTime })]
          : []),
      ]}
      footerStrong={1}
    >
      <OgTitle text={title} />
      <OgLead>{post?.description ?? dict.blog.description}</OgLead>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
