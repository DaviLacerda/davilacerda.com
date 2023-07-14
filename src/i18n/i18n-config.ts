export const i18n = {
    defaultLocale: "pt-br",
    locales: ["en", "pt-br"],
} as const;

export type Locale = (typeof i18n)["locales"][number];
