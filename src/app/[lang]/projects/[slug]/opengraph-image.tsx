import { ImageResponse } from "next/og";

import { getProjectPage, getProjectPages, profile } from "@/content/profile";
import { defaultLocale, isLocale } from "@/i18n";
import { OgProject } from "@/lib/og/projects";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  loadOgFonts,
} from "@/lib/og/template";

/**
 * Social card for one project: its name, its result on the ink panel (the
 * award, or the figure) and the outlets that covered it.
 */
export const alt = `A project by ${profile.name}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getProjectPages().map((project) => ({ slug: project.id }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: value, slug } = await params;
  const lang = isLocale(value) ? value : defaultLocale;
  const project = getProjectPage(slug) ?? getProjectPages()[0];

  return new ImageResponse(
    <OgFrame>
      {project ? <OgProject project={project} lang={lang} /> : null}
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
