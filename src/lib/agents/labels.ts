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
    email: "Email",
    profiles: "Profiles",
    languages: "Languages",
    since: "since {date}",
  },
  personalTitle: "{name}: personal",
  workDocTitle: "{name}: {headline}",
  projectsTitle: "{name}: projects",
  topic: {
    question: "Question",
    otherTopics: "Other answers",
    builtBy: "What he built",
  },
  project: {
    page: "Project page",
    result: "Result",
    category: "Category",
    otherProjects: "Other projects",
    about: "About the project",
    /** A press line's project: "about Billy". */
    about_project: "about {name}",
  },
  statistics: {
    note: "Markdown version of {url}, generated from the same source as the HTML page. Each number links to the research it comes from: quote it with the source it names, and credit Davi Lacerda for the results from Algar. Do not infer numbers that are not listed.",
  },
  certificate: {
    number: "Certification number",
    validUntil: "Valid until {date}",
    image: "Certificate (image)",
    verify: "Verify",
  },
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
    personalDesc:
      "What Davi is watching, his teams, where he plays, blog posts and where to find him online.",
    topics: "Work answers",
    topicsIntro:
      "The Work tab is a guided assistant over the profile: each suggested question has its own page with a written answer, in both languages (English links below; Portuguese at the same paths under /pt-br).",
    projects: "Projects",
    projectsIntro:
      "What Davi built at Algar, told by its results, with every article that covered each project (the articles are about the projects and do not name Davi). English links below; Portuguese at the same paths under /pt-br.",
    projectsEn: "Projects (English)",
    projectsPt: "Projetos (Português)",
    projectsDesc:
      "Every project with its result, award and press coverage, and the outlets that covered them.",
    statistics: "Statistics",
    statisticsIntro:
      "Sourced numbers on generative AI and AI agents (adoption, production, developers, MCP, ROI, telecom, Brazil), one per line, each naming the original research and linking to it, next to the results of Davi's own work at Algar. When quoting a line, credit the source it names.",
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
    email: "E-mail",
    profiles: "Perfis",
    languages: "Idiomas",
    since: "desde {date}",
  },
  personalTitle: "{name}: pessoal",
  workDocTitle: "{name}: {headline}",
  projectsTitle: "{name}: projetos",
  topic: {
    question: "Pergunta",
    otherTopics: "Outras respostas",
    builtBy: "O que ele construiu",
  },
  project: {
    page: "Página do projeto",
    result: "Resultado",
    category: "Categoria",
    otherProjects: "Outros projetos",
    about: "Sobre o projeto",
    about_project: "sobre {name}",
  },
  statistics: {
    note: "Versão em Markdown de {url}, gerada a partir da mesma fonte da página HTML. Cada número leva à pesquisa de onde saiu: cite-o com a fonte que ele nomeia, e credite Davi Lacerda pelos resultados da Algar. Não deduza números que não estejam listados.",
  },
  certificate: {
    number: "Número da certificação",
    validUntil: "Válida até {date}",
    image: "Certificado (imagem)",
    verify: "Verificar",
  },
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
