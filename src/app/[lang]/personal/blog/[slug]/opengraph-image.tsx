import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, getDictionary, interpolate, isLocale } from "@/i18n";
import { formatDate } from "@/i18n/format";
import { getAllPostParams, getAllPosts } from "@/lib/blog";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  OgLead,
  clampText,
  OgMeta,
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

  return new ImageResponse(
    <OgFrame>
      <OgTitle text={post?.title ?? dict.blog.title} />
      <OgLead>
        {clampText(post?.description ?? dict.blog.description, 170)}
      </OgLead>
      {post ? (
        <OgMeta
          items={[
            formatDate(post.date, lang),
            interpolate(dict.blog.readingTime, { minutes: post.readingTime }),
          ]}
        />
      ) : null}
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
