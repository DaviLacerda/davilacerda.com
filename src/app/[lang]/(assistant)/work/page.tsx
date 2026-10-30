import { notFound, permanentRedirect } from "next/navigation";

import { isLocale } from "@/i18n";
import { routes } from "@/lib/routes";

/** `/[lang]/work` has no page of its own: the Work tab is `/[lang]`. */
export default async function WorkIndex({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  permanentRedirect(routes.work(lang));
}
