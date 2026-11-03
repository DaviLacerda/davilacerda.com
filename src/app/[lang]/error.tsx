"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { crashed } from "@/components/error/art";
import { ErrorScreen } from "@/components/error/error-screen";
import { errorLabels } from "@/components/error/labels";
import { defaultLocale, isLocale } from "@/i18n/config";

/**
 * Localized error boundary for every page under the [lang] layout: only the
 * status (500) and an ASCII art (a cracked screen), between the site's header
 * and footer. Client Components cannot export metadata, so `noindex` is a
 * React `<meta>`, which React hoists into <head>.
 */
export default function ErrorPage({ error }: { error: unknown }) {
  const params = useParams<{ lang?: string }>();
  const lang = isLocale(params.lang) ? params.lang : defaultLocale;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <meta name="robots" content="noindex" />
      <ErrorScreen
        status={500}
        label={errorLabels[lang].server}
        art={crashed}
      />
    </>
  );
}
