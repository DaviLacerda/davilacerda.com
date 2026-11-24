/**
 * Blog series: posts that tell one story in parts. A post joins one with
 * `series: <id>` in its frontmatter; published parts are found by that and
 * ordered by date. `upcoming` lists the parts still to be written, in order,
 * so the series can show what comes next (on the project's page and at the
 * foot of each part). When a part is published, remove it from `upcoming`.
 */
import type { L10n } from "@/i18n";

export type Series = {
  name: L10n;
  /** The project the series is about, by id in `profile.projects`. */
  project?: string;
  /** The series' colour (handwriting, the current part), "#rrggbb". */
  accent?: string;
  upcoming: { title: L10n; summary: L10n }[];
};

export const series = {
  piecet: {
    name: { en: "The piecet series", "pt-br": "Série piecet" },
    project: "piecet",
    accent: "#8b5cf6",
    upcoming: [
      {
        title: {
          en: "Building it with Claude, one pull request at a time",
          "pt-br": "Construindo com o Claude, um pull request por vez",
        },
        summary: {
          en: "773 commits in 17 days: the spec, the workflow and what went wrong.",
          "pt-br":
            "773 commits em 17 dias: a especificação, o jeito de trabalhar e o que deu errado.",
        },
      },
      {
        title: { en: "The tests", "pt-br": "Os testes" },
        summary: {
          en: "Testing on my own iPhone through TestFlight, and what only showed up there.",
          "pt-br":
            "Testando no meu próprio iPhone pelo TestFlight, e o que só apareceu lá.",
        },
      },
      {
        title: {
          en: "Getting it onto the App Store",
          "pt-br": "Colocando na App Store",
        },
        summary: {
          en: "Review, screenshots, privacy and launch day.",
          "pt-br": "Revisão, screenshots, privacidade e o dia do lançamento.",
        },
      },
      {
        title: {
          en: "The launch marketing",
          "pt-br": "O marketing do lançamento",
        },
        summary: {
          en: "The site, the video and how I told people about it.",
          "pt-br": "O site, o vídeo e como eu contei para as pessoas.",
        },
      },
    ],
  },
} satisfies Record<string, Series>;

export type SeriesId = keyof typeof series;

export function isSeries(id: string): id is SeriesId {
  return Object.hasOwn(series, id);
}
