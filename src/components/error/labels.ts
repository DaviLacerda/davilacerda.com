import type { L10n } from "@/i18n";

/**
 * What each error page is, for screen readers and the tab title (the page
 * itself shows only the code). Kept here rather than in the dictionaries
 * because the error boundaries are Client Components and must not pull the
 * whole dictionary into the browser bundle.
 */
export const errorLabels: L10n<{ notFound: string; server: string }> = {
  en: { notFound: "Page not found", server: "Something went wrong" },
  "pt-br": {
    notFound: "Página não encontrada",
    server: "Algo deu errado",
  },
};
