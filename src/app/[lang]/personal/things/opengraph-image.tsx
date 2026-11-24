import { ImageResponse } from "next/og";

import { things, thingSticker } from "@/content/things";
import { defaultLocale, getDictionary, isLocale, locales } from "@/i18n";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  OgLead,
  OgTitle,
  loadOgFonts,
  ogColors,
  ogPublicImage,
} from "@/lib/og/template";

/** Social card for the Things page: the wall's stickers in a row, the title and the line. */
export const alt = getDictionary(defaultLocale).meta.things.description;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const CELL = { width: 168, height: 126 } as const;
const TILTS = [-3, 2.5, -1.5, 3, -2.5, 1.5];

/** A sticker's size inside a cell, keeping its proportions. */
function fit(width: number, height: number) {
  const scale = Math.min(CELL.width / width, CELL.height / height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const lang = isLocale(value) ? value : defaultLocale;
  const dict = getDictionary(lang);

  return new ImageResponse(
    <OgFrame>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 8,
          marginBottom: 40,
          borderRadius: 28,
          background: ogColors.surface,
          alignSelf: "flex-start",
        }}
      >
        {things.slice(0, 6).map((thing, index) => {
          const sticker = thingSticker(thing.id);
          return (
            <div
              key={thing.id}
              style={{
                display: "flex",
                width: CELL.width,
                height: CELL.height,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={ogPublicImage(sticker.src)}
                alt=""
                {...fit(sticker.width, sticker.height)}
                style={{ transform: `rotate(${TILTS[index]}deg)` }}
              />
            </div>
          );
        })}
      </div>
      <OgTitle text={dict.personal.things.title} />
      <OgLead>{dict.personal.things.lead}</OgLead>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
