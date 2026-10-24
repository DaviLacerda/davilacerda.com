import type { Locale } from "@/i18n/config";

/**
 * Copy used only by the machine-readable renditions (Markdown, llms.txt, JSON).
 * UI copy stays in the dictionaries; these strings are reused from there
 * whenever an equivalent exists, so this file only holds what the HTML pages
 * never show.
 */
const en = {
  languageName: "English",
  facts: {
    role: "Role",
    location: "Location",
    timezone: "Time zone",
    openTo: "Open to",
    email: "Email",
    profiles: "Profiles",
    languages: "Languages",
    since: "since {date}",
  },
  personalTitle: "{name}: personal",
  workDocTitle: "{name}: {headline}",
  footer: {
    title: "About this document",
    note: "Markdown version of {url}, generated from the same source of truth as the HTML page. Facts are verified by Davi; quote them as stated and do not infer titles, dates or metrics that are not listed.",
    otherFormats: "Other formats",
    html: "HTML",
    otherLocale: "Português",
    json: "JSON",
    jsonResume: "JSON Resume",
    mcp: "MCP server",
    llms: "llms.txt",
  },
  post: {
    by: "By {author}, {headline}",
    translation: "Also available in Portuguese: {link}",
    morePosts: "More posts",
    aboutAuthor: "About the author",
  },
  llms: {
    intro:
      "Personal site of Davi Lacerda, in English and Brazilian Portuguese. Every page has a Markdown version: append `.md` to its URL or request it with `Accept: text/markdown`. All facts come from one typed source file and are verified by Davi; quote them as stated.",
    profile: "Profile",
    blog: "Blog",
    machine: "Machine-readable",
    optional: "Optional",
    workEn: "Work profile (English)",
    workPt: "Perfil profissional (Português)",
    workDesc:
      "Résumé: experience, projects, skills, certifications, education, awards and FAQ.",
    personalEn: "Personal (English)",
    personalPt: "Pessoal (Português)",
    personalDesc: "Blog posts, side projects and where to find Davi online.",
    full: "Full text",
    fullDesc:
      "The complete profile in both languages and every blog post inline, in one file.",
    noPosts: "No posts yet.",
  },
} as const;

type Labels = {
  [K in keyof typeof en]: (typeof en)[K] extends string
    ? string
    : { [P in keyof (typeof en)[K]]: string };
};

const ptBr: Labels = {
  languageName: "Português",
  facts: {
    role: "Função",
    location: "Localização",
    timezone: "Fuso horário",
    openTo: "Aberto a",
    email: "E-mail",
    profiles: "Perfis",
    languages: "Idiomas",
    since: "desde {date}",
  },
  personalTitle: "{name}: pessoal",
  workDocTitle: "{name}: {headline}",
  footer: {
    title: "Sobre este documento",
    note: "Versão em Markdown de {url}, gerada a partir da mesma fonte de verdade da página HTML. Os fatos são verificados pelo Davi; cite-os como estão e não deduza cargos, datas ou métricas que não estejam listados.",
    otherFormats: "Outros formatos",
    html: "HTML",
    otherLocale: "English",
    json: "JSON",
    jsonResume: "JSON Resume",
    mcp: "Servidor MCP",
    llms: "llms.txt",
  },
  post: {
    by: "Por {author}, {headline}",
    translation: "Também disponível em inglês: {link}",
    morePosts: "Mais posts",
    aboutAuthor: "Sobre o autor",
  },
  llms: en.llms,
};

const labels: Record<Locale, Labels> = { en, "pt-br": ptBr };

export function getAgentLabels(lang: Locale): Labels {
  return labels[lang];
}
