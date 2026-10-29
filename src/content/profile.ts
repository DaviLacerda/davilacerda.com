/**
 * Single source of truth for facts about Davi. Pages, JSON-LD, llms.txt, the
 * sitemap and OG images all read from here; never hard-code these facts in
 * components.
 *
 * Rules:
 * - Only verified facts (LinkedIn, GitHub, Davi himself). Anything inferred or
 *   unknown carries a `TODO(davi): confirm` comment and a neutral placeholder.
 *   Never invent employers, certificates, dates or metrics.
 * - Human-readable text is `L10n` ({ en, "pt-br" }) or a plain string for
 *   names that do not translate (resolve both with `t()` from `@/i18n`).
 * - Dates are strings: "YYYY", "YYYY-MM" or "YYYY-MM-DD" (see `@/i18n/format`).
 *   For ranges, `end: null` means "present" and an omitted field means unknown
 *   (render nothing for it).
 * - Logos (`logo`): a bundled brand logo id (see `src/lib/logos/registry.ts`)
 *   or a file you add under /public, e.g. `logo: "/logos/algar.svg"` (an SVG,
 *   or a square PNG of at least 96px). Without one the UI shows the name's
 *   initial on a tile.
 */
import type { L10n, Localizable } from "@/i18n";
import type { PartialDate } from "@/i18n/format";
import type { LogoSource } from "@/lib/logos";

export type SocialId =
  "github" | "linkedin" | "instagram" | "spotify" | "discord" | "email";

export type Social = {
  id: SocialId;
  /** Display handle, e.g. "@DaviLacerda". */
  handle: string;
  url: string;
  /** Include in schema.org `sameAs` (public profile pages only). */
  sameAs: boolean;
};

export type Highlight = {
  /** Short, scannable value ("Best AI Project", "2×", "2+ years"). */
  value: L10n;
  label: L10n;
};

export type Experience = {
  id: string;
  company: Localizable;
  companyUrl?: string;
  /** Company logo (see the rules above). */
  logo?: LogoSource;
  /** Role for the whole tenure (e.g. "AI Engineer"). No seniority levels or formal titles. */
  role: L10n;
  /** Whole tenure at the company. Omitted = unknown. */
  start?: PartialDate;
  /** `null` = present, omitted = unknown. */
  end?: PartialDate | null;
  employmentType: L10n;
  /** On-site, hybrid or remote. */
  workModel: L10n;
  location: L10n;
  description: L10n;
  highlights: L10n<string[]>;
  stack: string[];
};

/** A news article about a project. Only links that were opened and checked. */
export type PressLink = {
  /** The publication, as it writes its own name ("Mobile Time"). */
  outlet: string;
  /** The headline as published (not translated). */
  title: string;
  url: string;
  date: PartialDate;
  /** BCP 47 language of the article ("pt-BR"). */
  lang: string;
};

/** A result beside the headline one, on the project's page: "Millions", "saved in operating costs". */
export type ProjectResult = {
  /** Set large. A leading number ("40%") counts up on screen; words ("Millions") stay as they are. */
  value: Localizable;
  label: L10n;
};

/**
 * The case study told on a project's own page. Only facts Davi stated (his
 * CV, LinkedIn); nothing here may add a metric, a client or a claim.
 */
export type ProjectStory = {
  /** What was hard before, in one or two sentences. */
  problem: L10n;
  /** What the product does, one short point per line. */
  solution: L10n<string[]>;
  /**
   * How it is built, part by part, each with the technologies in it (their
   * logos come from the registry). Omit when the split is not known.
   */
  build?: { part: L10n; stack: string[] }[];
};

/**
 * Something Davi built at a job (it may be private). A project with a
 * `story` gets its own page, `/[lang]/projects/<id>`, and a large card on the
 * Projects tab; the others are told by their result on that tab.
 */
export type Project = {
  /** Also the URL slug of its page (`/en/projects/sales-copilot`): lowercase, hyphens. */
  id: string;
  name: Localizable;
  /** One line for the project's card (the full story is `description`). */
  summary?: L10n;
  description: L10n;
  stack: string[];
  /** Organization the project was built for, if any. */
  context?: string;
  /** Davi's role on the project, when it matters (e.g. "Main developer"). */
  role?: L10n;
  /** Award or recognition, displayed as a badge. */
  award?: L10n;
  /** The `achievements` entry behind `award` (its issuer, date, category and link). */
  achievement?: string;
  /** The headline result, set large on the card: "96%" and what it measures. */
  metric?: { value: string; label: L10n };
  /** More results, beside the headline on the project's page. */
  results?: ProjectResult[];
  /** Press coverage, newest first. */
  press?: PressLink[];
  /** What the project is about, in plain English (schema.org `about` and page keywords). */
  topics?: string[];
  /** The case study; with it the project gets its own page. */
  story?: ProjectStory;
  isPrivate?: boolean;
  year?: PartialDate;
};

export type SkillGroupId =
  "llm" | "rag" | "ml" | "backend" | "frontend" | "infra";

export type SkillGroup = {
  id: SkillGroupId;
  title: L10n;
  skills: string[];
};

export type Certification = {
  id: string;
  name: Localizable;
  issuer: string;
  issuerUrl?: string;
  /** "certification" = formal credential (feature these), "course" = training/bootcamp. */
  kind: "certification" | "course";
  /** The tier, as the issuer names it: "Expert" or "Associate" for Microsoft Certified. */
  level?: string;
  /** Logo shown beside it: the product line or the issuer. */
  logo?: LogoSource;
  /** Completion/issue date. Omitted = unknown. */
  date?: PartialDate;
  /** Expiry date printed on the certificate. Omitted = does not expire, or unknown. */
  expires?: PartialDate;
  /** The "Credential ID" printed on the certificate. */
  credentialId?: string;
  /** The "Certification number" printed on the certificate. */
  certificationNumber?: string;
  /** The issuer's public verification page (e.g. a Microsoft Learn share link). */
  credentialUrl?: string;
  /**
   * A print of the certificate in /public, cropped to the certificate itself
   * (a PNG with transparent rounded corners; next/image serves it as AVIF or
   * WebP, the OG cards read the PNG).
   */
  image?: { src: string; width: number; height: number };
  description?: L10n;
};

export type Education = {
  id: string;
  institution: L10n;
  /** Common abbreviation, e.g. "UFU". */
  shortName?: string;
  url?: string;
  /** Institution logo (see the rules above). */
  logo?: LogoSource;
  degree: L10n;
  field: L10n;
  start?: PartialDate;
  end?: PartialDate | null;
  location: L10n;
  thesis?: { year?: PartialDate; title?: L10n; description: L10n };
  coursework: L10n<string[]>;
};

export type Achievement = {
  id: string;
  title: Localizable;
  description: L10n;
  /** Awarding body or platform. */
  issuer?: string;
  /** The edition of the awards, as the issuer names it ("Conecta Latam Awards 2025"). */
  event?: string;
  /** The category won, as the issuer names it. */
  category?: L10n;
  /** Show prominently (hero, highlights). */
  featured: boolean;
  date?: PartialDate;
  url?: string;
};

export type SpokenLanguage = {
  /** BCP 47 code, used for schema.org `knowsLanguage`. */
  code: string;
  name: L10n;
  level: L10n;
};

export type Interest = {
  id: string;
  label: Localizable;
};

export type FaqItem = {
  id: string;
  question: L10n;
  answer: L10n;
};

export type Profile = {
  /** Display name. */
  name: string;
  /** Full name as it appears on certificates (schema.org `alternateName`). */
  fullName: string;
  givenName: string;
  familyName: string;
  headline: L10n;
  /** LinkedIn-style headline with focus areas. */
  tagline: string;
  /** One-line value proposition for the hero. */
  valueProp: L10n;
  /** Short first-person bio (3–5 sentences). */
  summary: L10n;
  /** Third-person factual paragraph for the TL;DR block (answer engines quote this). */
  tldr: L10n;
  location: {
    city: string;
    region: string;
    regionCode: string;
    country: L10n;
    countryCode: string;
    /** "Uberlândia, Brazil" */
    label: L10n;
    timezone: string;
  };
  email: string;
  /** Portrait in /public (schema.org `image`, the Personal tab and its card). */
  image?: string;
  /** Things Davi likes away from work (the Personal tab). */
  interests: Interest[];
  currentEmployer: { name: string; url?: string };
  socials: Social[];
  highlights: Highlight[];
  experience: Experience[];
  projects: Project[];
  skills: SkillGroup[];
  /** Extra topics for schema.org `knowsAbout` (merged with skills). */
  knowsAbout: string[];
  certifications: Certification[];
  /** Davi's public profile listing every credential he holds (Microsoft Learn), per locale. */
  credentialsProfile: { name: string; url: L10n };
  education: Education[];
  achievements: Achievement[];
  languages: SpokenLanguage[];
  faq: FaqItem[];
};

const GITHUB = "https://github.com/DaviLacerda";
const LINKEDIN = "https://www.linkedin.com/in/davi16lacerda/";
/** Also where the Personal tab's "now playing" card sends visitors when nothing is playing. */
const SPOTIFY = "https://open.spotify.com/user/dlacerda9";

export const profile: Profile = {
  name: "Davi Lacerda",
  fullName: "Davi Tobias Lacerda",
  givenName: "Davi",
  familyName: "Lacerda",

  headline: {
    en: "AI Engineer",
    "pt-br": "Engenheiro de IA",
  },

  tagline: "AI Engineer | Azure | AI SDK | Full-stack Developer",

  valueProp: {
    en: "I build Generative AI products and AI agents end to end, from the back end and the interface to the AI tools that power them.",
    "pt-br":
      "Construo produtos de IA Generativa e agentes de IA de ponta a ponta, do back-end e da interface às ferramentas de IA que os fazem funcionar.",
  },

  summary: {
    en: "I'm an AI Engineer at Algar in Uberlândia, Brazil, focused on Generative AI and AI agents. I was the main developer behind Algar's Sales Copilot, designing and building it end to end, from the back end and front end to the AI tools that power it; it won Best AI Project in LATAM at the Conecta Latam awards. My other work there includes Billy, a GenAI app that cut manual invoice review time by 96%, and a move to newer models that cut GenAI costs by more than 40%. I also lead the adoption of Claude Code and GitHub Copilot across Algar's engineering teams. I hold three Microsoft certifications: Expert in multi-agent AI solutions and in agentic AI architecture, and Associate in Azure AI apps and agents. These days I'm most interested in agents, the Model Context Protocol (MCP) and making GenAI dependable in real products.",
    "pt-br":
      "Sou Engenheiro de IA na Algar, em Uberlândia, com foco em IA Generativa e agentes de IA. Fui o principal desenvolvedor do Sales Copilot da Algar, que projetei e construí de ponta a ponta, do back-end e do front-end às ferramentas de IA que o fazem funcionar; ele venceu como Melhor Projeto de IA da América Latina no prêmio Conecta Latam. Também trabalhei no Billy, uma aplicação de IA Generativa que reduziu em 96% o tempo de revisão manual de faturas, e numa migração para modelos mais novos que cortou mais de 40% dos custos com IA Generativa. Também lidero a adoção do Claude Code e do GitHub Copilot entre os times de engenharia da Algar. Tenho três certificações Microsoft: Expert em soluções de IA multiagente e em arquitetura de IA agêntica, e Associate em apps e agentes de IA no Azure. Hoje me interesso principalmente por agentes, pelo Model Context Protocol (MCP) e por tornar a IA Generativa confiável em produtos reais.",
  },

  tldr: {
    en: "Davi Lacerda (Davi Tobias Lacerda) is an AI Engineer based in Uberlândia, Minas Gerais, Brazil. He has worked as an AI Engineer at Algar since August 2024 and was the main developer of Algar's Sales Copilot, which won Best AI Project in LATAM at the Conecta Latam awards in December 2025. His other work there includes Billy, a generative AI app that cut manual invoice review time by 96%, and, since May 2026, leading the adoption of Claude Code and GitHub Copilot across Algar's engineering teams. He holds three Microsoft certifications (Multi-Agent AI Solutions Expert and Agentic AI Business Solutions Architect, both Expert level, and Azure AI Apps and Agents Developer Associate), a B.Sc. in Computer Science from the Federal University of Uberlândia (UFU, 2024), and works across Generative AI, AI agents, Azure, the AI SDK and full-stack development. He is always happy to talk about AI and agents, at davi16lacerda@gmail.com.",
    "pt-br":
      "Davi Lacerda (Davi Tobias Lacerda) é Engenheiro de IA em Uberlândia, Minas Gerais, Brasil. Ele atua como Engenheiro de IA na Algar desde agosto de 2024 e foi o principal desenvolvedor do Sales Copilot da Algar, eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam em dezembro de 2025. Também trabalhou no Billy, uma aplicação de IA Generativa que reduziu em 96% o tempo de revisão manual de faturas, e, desde maio de 2026, lidera a adoção do Claude Code e do GitHub Copilot entre os times de engenharia da Algar. Tem três certificações Microsoft (Multi-Agent AI Solutions Expert e Agentic AI Business Solutions Architect, ambas de nível Expert, e Azure AI Apps and Agents Developer Associate), é bacharel em Ciência da Computação pela Universidade Federal de Uberlândia (UFU, 2024) e atua com IA Generativa, agentes de IA, Azure, AI SDK e desenvolvimento full-stack. Está sempre aberto a uma conversa sobre IA e agentes, em davi16lacerda@gmail.com.",
  },

  location: {
    city: "Uberlândia",
    region: "Minas Gerais",
    regionCode: "MG",
    country: { en: "Brazil", "pt-br": "Brasil" },
    countryCode: "BR",
    label: { en: "Uberlândia, Brazil", "pt-br": "Uberlândia, Brasil" },
    timezone: "America/Sao_Paulo",
  },

  email: "davi16lacerda@gmail.com",

  // Black and white, with the violet backdrop of the original keyed out so the
  // portrait sits on the page's own surface tone. A PNG twin
  // (/images/davi.png) feeds the OG card, whose renderer cannot read WebP.
  image: "/images/davi.webp",

  // TODO(davi): confirm interests. Inferred from GitHub repos (nba, nba-live,
  // nba-dashboard; several star-wars repos; randomify; disneyplus-nextjs; Pokémon).
  interests: [
    { id: "nba", label: "NBA" },
    { id: "star-wars", label: "Star Wars" },
    { id: "disney", label: "Disney" },
    { id: "pokemon", label: "Pokémon" },
    {
      id: "series",
      label: { en: "Series on shuffle", "pt-br": "Séries no aleatório" },
    },
  ],

  // TODO(davi): confirm Algar's URL (or the specific Algar company you work for).
  currentEmployer: { name: "Algar", url: "https://www.algar.com.br" },

  socials: [
    { id: "github", handle: "@DaviLacerda", url: GITHUB, sameAs: true },
    { id: "linkedin", handle: "in/davi16lacerda", url: LINKEDIN, sameAs: true },
    {
      id: "instagram",
      handle: "@davi16lacerda",
      url: "https://www.instagram.com/davi16lacerda/",
      sameAs: true,
    },
    {
      id: "spotify",
      handle: "dlacerda9",
      url: SPOTIFY,
      sameAs: true,
    },
    {
      id: "discord",
      // TODO(davi): confirm your Discord username for display.
      handle: "Discord",
      url: "https://discord.com/users/272922827118870541",
      sameAs: false,
    },
    {
      id: "email",
      handle: "davi16lacerda@gmail.com",
      url: "mailto:davi16lacerda@gmail.com",
      sameAs: false,
    },
  ],

  highlights: [
    {
      value: { en: "Best AI Project", "pt-br": "Melhor Projeto de IA" },
      label: {
        en: "in LATAM at the Conecta Latam awards, for Algar's Sales Copilot",
        "pt-br":
          "da América Latina no prêmio Conecta Latam, com o Sales Copilot da Algar",
      },
    },
    {
      value: { en: "96%", "pt-br": "96%" },
      label: {
        en: "less time on manual invoice review with Billy, at Algar",
        "pt-br":
          "menos tempo de revisão manual de faturas com o Billy, na Algar",
      },
    },
    {
      value: { en: "2× Expert", "pt-br": "2× Expert" },
      label: {
        en: "Microsoft certifications in multi-agent and agentic AI",
        "pt-br": "certificações Microsoft em IA multiagente e agêntica",
      },
    },
    {
      value: { en: "End to end", "pt-br": "Ponta a ponta" },
      label: {
        en: "Back end, front end and the AI tools in between",
        "pt-br": "Back-end, front-end e as ferramentas de IA no meio",
      },
    },
    {
      value: { en: "Since 2024", "pt-br": "Desde 2024" },
      label: {
        en: "shipping Generative AI and agents at Algar",
        "pt-br": "entregando IA Generativa e agentes na Algar",
      },
    },
  ],

  experience: [
    {
      id: "algar",
      company: "Algar",
      companyUrl: "https://www.algar.com.br", // TODO(davi): confirm URL.
      // TODO(davi): add /public/logos/algar.svg and set logo: "/logos/algar.svg".
      role: { en: "AI Engineer", "pt-br": "Engenheiro de IA" },
      start: "2024-08",
      end: null,
      employmentType: { en: "Full-time", "pt-br": "Tempo integral" },
      workModel: { en: "Hybrid", "pt-br": "Híbrido" },
      location: {
        en: "Uberlândia, MG, Brazil",
        "pt-br": "Uberlândia, MG, Brasil",
      },
      description: {
        en: "I design, build and ship Generative AI products and AI agents at Algar, owning them from architecture to production.",
        "pt-br":
          "Projeto, construo e coloco em produção produtos de IA Generativa e agentes de IA na Algar, sendo responsável por eles da arquitetura à produção.",
      },
      // From Davi's CV (October 2026). His formal titles there are not shown on purpose.
      highlights: {
        en: [
          "Main developer of Algar's Sales Copilot, built end to end: a Svelte front end, a .NET back end and the AI tools on Azure OpenAI. It listens to sales calls in real time, suggests arguments and offers, and won Best AI Project in LATAM at the Conecta Latam awards.",
          "Billy: a generative AI app that automates telecom invoice analysis and validation with Azure OpenAI and RPA. It cut manual review time by 96% and saved millions in operating costs.",
          "Bud: an agent built with Copilot Studio, Power Automate and a message broker that lets Microsoft Teams users request SAP reports and actions through RPA. It cut the projects team's workload by 40%.",
          "Led the move to newer generative AI models across several projects, cutting costs by more than 40% with no loss in performance or accuracy (GenAI FinOps).",
          "Created an LLM-as-a-judge benchmarking approach, so model decisions rest on measured accuracy and data.",
          "Since May 2026, lead the adoption of AI development tools (Claude Code, GitHub Copilot) across Algar's engineering teams, training developers in Skills, MCP and AI-assisted engineering practices.",
          "Build AI agents and automations for complex workflows with Mastra, LangGraph, CrewAI and the AI SDK, on Azure OpenAI and Azure AI Foundry.",
        ],
        "pt-br": [
          "Principal desenvolvedor do Sales Copilot da Algar, construído de ponta a ponta: front-end em Svelte, back-end em .NET e as ferramentas de IA no Azure OpenAI. Ele escuta as ligações de vendas em tempo real, sugere argumentos e ofertas, e venceu como Melhor Projeto de IA da América Latina no prêmio Conecta Latam.",
          "Billy: aplicação de IA Generativa que automatiza a análise e a validação de faturas de telecom com Azure OpenAI e RPA. Reduziu o tempo de revisão manual em 96% e gerou economia de milhões em custos operacionais.",
          "Bud: agente criado com Copilot Studio, Power Automate e message broker que permite a usuários do Microsoft Teams solicitar relatórios e ações no SAP via RPA. Reduziu em 40% a carga de trabalho da área de projetos.",
          "Liderei a migração para modelos de IA Generativa mais novos em vários projetos, reduzindo custos em mais de 40% sem perda de desempenho nem de acurácia (GenAI FinOps).",
          "Criei uma abordagem de benchmarking com LLM como juiz (LLM-as-a-judge), para que as decisões sobre modelos se apoiem em acurácia medida e em dados.",
          "Desde maio de 2026, lidero a adoção de ferramentas de IA para desenvolvimento (Claude Code e GitHub Copilot) entre os times de engenharia da Algar, capacitando pessoas desenvolvedoras em Skills, MCP e boas práticas de engenharia assistida por IA.",
          "Desenvolvo agentes de IA e automações para fluxos complexos com Mastra, LangGraph, CrewAI e AI SDK, no Azure OpenAI e no Azure AI Foundry.",
        ],
      },
      stack: [
        "Azure OpenAI",
        "Azure AI Foundry",
        "AI SDK",
        "Mastra",
        "LangGraph",
        "Claude Code",
        "TypeScript",
        "Python",
      ],
    },
    {
      id: "brain",
      company: "Brain (Centro de Inovação em Negócios Digitais)",
      // TODO(davi): add /public/logos/brain.svg and set logo: "/logos/brain.svg".
      role: {
        en: "Research & Development Intern",
        "pt-br": "Estagiário de Pesquisa e Desenvolvimento",
      },
      start: "2023-12",
      end: "2024-08",
      employmentType: { en: "Internship", "pt-br": "Estágio" },
      workModel: { en: "Hybrid", "pt-br": "Híbrido" },
      location: {
        en: "Uberlândia, MG, Brazil",
        "pt-br": "Uberlândia, MG, Brasil",
      },
      description: {
        en: "Research and development internship at an innovation center for digital business.",
        "pt-br":
          "Estágio de pesquisa e desenvolvimento em um centro de inovação em negócios digitais.",
      },
      highlights: {
        en: [
          "Researched telecommunications, technology and AI topics.",
          "Strategically supported the Center of Excellence for Automations.",
          "Gave talks on generative AI at high schools in Uberlândia: its history, how it works and how to use it well.",
        ],
        "pt-br": [
          "Pesquisei temas de telecomunicações, tecnologia e IA.",
          "Apoiei estrategicamente o Centro de Excelência em Automações.",
          "Dei palestras sobre IA Generativa em escolas de ensino médio de Uberlândia: história, funcionamento e boas práticas de uso.",
        ],
      },
      stack: ["Artificial Intelligence", "Automation", "Research"],
    },
  ],

  projects: [
    {
      id: "sales-copilot",
      name: "Sales Copilot",
      context: "Algar",
      role: { en: "Main developer", "pt-br": "Principal desenvolvedor" },
      award: {
        en: "Best AI Project in LATAM, Conecta Latam awards",
        "pt-br": "Melhor Projeto de IA da América Latina, prêmio Conecta Latam",
      },
      achievement: "conecta-latam-best-ai-project",
      isPrivate: true,
      year: "2025",
      summary: {
        en: "Listens to sales calls and suggests arguments and offers in real time.",
        "pt-br":
          "Escuta as ligações de vendas e sugere argumentos e ofertas em tempo real.",
      },
      description: {
        en: "An AI copilot for Algar's sales teams (small business and corporate): it listens to calls, reads the conversation in real time and suggests arguments and offers that fit each customer. I designed and built it end to end, from the Svelte front end and the .NET back end to the AI tools on Azure OpenAI. Named Best AI Project in LATAM at the Conecta Latam awards.",
        "pt-br":
          "Um copiloto com IA para os times de vendas da Algar (PMEs e Corporativo): escuta as ligações, analisa a conversa em tempo real e sugere argumentos e ofertas sob medida para cada cliente. Projetei e construí de ponta a ponta, do front-end em Svelte e do back-end em .NET às ferramentas de IA no Azure OpenAI. Eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam.",
      },
      stack: ["Azure OpenAI", "Svelte", ".NET"],
      topics: ["Generative AI", "AI copilot", "Sales", "Telecommunications"],
      // From Davi's CV (October 2026): the copilot reads the conversation's
      // signals in real time and fits arguments and offers to the customer's
      // profile and pain points.
      story: {
        problem: {
          en: "On a sales call, the right argument and the right offer depend on who the customer is and what they need, and they are needed while the customer is still on the line.",
          "pt-br":
            "Numa ligação de vendas, o argumento e a oferta certos dependem de quem é o cliente e do que ele precisa, e precisam chegar enquanto ele ainda está na linha.",
        },
        solution: {
          en: [
            "Listens to the call and reads the conversation in real time.",
            "Suggests arguments and offers that fit the customer's profile and pain points.",
            "Built for Algar's small business and corporate sales teams.",
          ],
          "pt-br": [
            "Escuta a ligação e analisa a conversa em tempo real.",
            "Sugere argumentos e ofertas sob medida para o perfil e as dores do cliente.",
            "Feito para os times de vendas de PMEs e Corporativo da Algar.",
          ],
        },
        build: [
          {
            part: { en: "Front end", "pt-br": "Front-end" },
            stack: ["Svelte"],
          },
          {
            part: { en: "AI tools", "pt-br": "Ferramentas de IA" },
            stack: ["Azure OpenAI"],
          },
          { part: { en: "Back end", "pt-br": "Back-end" }, stack: [".NET"] },
        ],
      },
      // Opened and checked October 2026. Mobile Time describes the copilot
      // (calls, arguments, Azure OpenAI) before it had its name.
      press: [
        {
          outlet: "Tele.Síntese",
          title:
            "Anatel e profissionais brasileiros são reconhecidos em prêmio internacional",
          url: "https://telesintese.com.br/anatel-e-profissionais-brasileiros-sao-reconhecidos-em-premio-internacional/",
          date: "2025-12-05",
          lang: "pt-BR",
        },
        {
          outlet: "Mobile Time",
          title:
            "Algar Telecom amplia uso de inteligência artificial generativa",
          url: "https://www.mobiletime.com.br/noticias/14/06/2024/algar-telecom-amplia-uso-de-inteligencia-artificial-generativa/",
          date: "2024-06-14",
          lang: "pt-BR",
        },
      ],
    },
    {
      id: "billy",
      name: "Billy",
      context: "Algar",
      isPrivate: true,
      // In production since March 2024 (Teletime, September 2024).
      year: "2024",
      summary: {
        en: "Generative AI that analyzes and validates telecom invoices.",
        "pt-br": "IA Generativa que analisa e valida faturas de telecom.",
      },
      metric: {
        value: "96%",
        label: {
          en: "less time on manual review",
          "pt-br": "menos tempo de revisão manual",
        },
      },
      description: {
        en: "A generative AI app that automates the analysis and validation of telecom invoices, extracting and interpreting contract data, with Azure OpenAI and RPA. It cut manual review time by 96% and saved millions in operating costs.",
        "pt-br":
          "Uma aplicação de IA Generativa que automatiza a análise e a validação de faturas de telecom, extraindo e interpretando dados de contratos, com Azure OpenAI e RPA. Reduziu o tempo de revisão manual em 96% e gerou economia de milhões em custos operacionais.",
      },
      results: [
        {
          value: { en: "Millions", "pt-br": "Milhões" },
          label: {
            en: "saved in operating costs",
            "pt-br": "de economia em custos operacionais",
          },
        },
      ],
      stack: ["Azure OpenAI", "RPA"],
      topics: [
        "Generative AI",
        "Invoice processing",
        "Robotic process automation",
        "Telecommunications",
      ],
      // TODO(davi): add your role on Billy (`role`); its page shows it when set.
      story: {
        problem: {
          en: "Telecom invoices were analyzed and validated by hand, against the data in each contract.",
          "pt-br":
            "As faturas de telecom eram analisadas e validadas manualmente, com base nos dados de cada contrato.",
        },
        solution: {
          en: [
            "Extracts and interprets contract data.",
            "Automates the analysis and validation of telecom invoices.",
            "Combines Azure OpenAI with RPA.",
          ],
          "pt-br": [
            "Extrai e interpreta os dados dos contratos.",
            "Automatiza a análise e a validação das faturas de telecom.",
            "Combina Azure OpenAI e RPA.",
          ],
        },
      },
      // Opened and checked October 2026; each names Billy and its numbers.
      press: [
        {
          outlet: "Mobile Time",
          title: "Algar economiza R$ 3 milhões em revisão de faturas usando IA",
          url: "https://www.mobiletime.com.br/noticias/10/02/2025/algar-billy/",
          date: "2025-02-10",
          lang: "pt-BR",
        },
        {
          outlet: "Convergência Digital",
          title:
            "Algar Telecom avança de IA analítica para preditiva e generativa",
          url: "https://convergenciadigital.com.br/mercado/algar-telecom-avanca-de-ia-analitica-para-preditiva-e-generativa/",
          date: "2024-11-21",
          lang: "pt-BR",
        },
        {
          outlet: "Teletime",
          title:
            "Algar Telecom usa inteligência artificial para automação de faturas",
          url: "https://teletime.com.br/16/09/2024/algar-telecom-usa-inteligencia-artificial-para-automacao-de-faturas/",
          date: "2024-09-16",
          lang: "pt-BR",
        },
      ],
    },
    {
      id: "bud",
      name: "Bud",
      context: "Algar",
      isPrivate: true,
      // TODO(davi): add the year Bud went live.
      summary: {
        en: "A Teams agent for SAP reports and actions.",
        "pt-br": "Um agente no Teams para relatórios e ações no SAP.",
      },
      metric: {
        value: "40%",
        label: {
          en: "less workload for the projects team",
          "pt-br": "menos carga de trabalho na área de projetos",
        },
      },
      description: {
        en: "An agent built with Copilot Studio, Power Automate and a message broker that lets Microsoft Teams users request SAP reports and actions through RPA. It cut the projects team's workload by 40%.",
        "pt-br":
          "Um agente criado com Copilot Studio, Power Automate e message broker que permite a usuários do Microsoft Teams solicitar relatórios e ações no SAP via RPA. Reduziu em 40% a carga de trabalho da área de projetos.",
      },
      stack: [
        "Copilot Studio",
        "Power Automate",
        "Microsoft Teams",
        "SAP",
        "RPA",
      ],
    },
    {
      id: "genai-finops",
      name: "GenAI FinOps",
      context: "Algar",
      isPrivate: true,
      // TODO(davi): add the year of the model migration.
      summary: {
        en: "Moved projects to newer generative AI models.",
        "pt-br":
          "Migração dos projetos para modelos de IA Generativa mais novos.",
      },
      metric: {
        value: "40%+",
        label: {
          en: "lower costs, same accuracy",
          "pt-br": "menos custo, mesma acurácia",
        },
      },
      description: {
        en: "Led the move to newer generative AI models across several projects, cutting costs by more than 40% with no loss in performance or accuracy: the most value per token.",
        "pt-br":
          "Liderei a migração para modelos de IA Generativa mais novos em vários projetos, reduzindo custos em mais de 40% sem perda de desempenho nem de acurácia: o máximo valor por token.",
      },
      stack: ["Generative AI", "GenAI FinOps"],
    },
  ],

  // Verified on LinkedIn: Generative AI, AI agents, Azure, AI SDK, front-end and back-end
  // development, machine learning, UI/UX design, automation, FinOps, Agile, MCP (interest).
  // Davi's CV (October 2026) adds the agent frameworks, Azure OpenAI and AI Foundry,
  // Copilot Studio and Power Automate, LLM-as-a-judge, Claude Code and GitHub Copilot,
  // scikit-learn, Svelte and .NET (the Sales Copilot).
  skills: [
    {
      id: "llm",
      title: { en: "LLMs & agents", "pt-br": "LLMs e agentes" },
      skills: [
        "Generative AI",
        "AI agents",
        "Multi-agent systems",
        "Azure OpenAI",
        "Azure AI Foundry",
        "AI SDK",
        "Mastra",
        "LangGraph",
        "LangChain",
        "CrewAI",
        "Model Context Protocol (MCP)",
        "Prompt engineering",
        "Generative UI",
      ],
    },
    {
      id: "rag",
      title: { en: "RAG & evaluation", "pt-br": "RAG e avaliação" },
      skills: [
        "Retrieval-Augmented Generation",
        "Embeddings",
        "Vector search",
        "LLM-as-a-judge",
        "Experiment design",
        "GenAI FinOps",
      ],
    },
    {
      id: "ml",
      title: { en: "Machine learning", "pt-br": "Machine learning" },
      skills: [
        "Machine learning",
        "Python",
        "scikit-learn",
        "Data analysis",
        "Computational intelligence",
      ],
    },
    {
      id: "backend",
      title: { en: "Back end", "pt-br": "Back-end" },
      skills: [
        "Python",
        "TypeScript",
        ".NET",
        "Node.js",
        "Java",
        "Spring",
        "REST APIs",
        "PostgreSQL",
        "Supabase",
      ],
    },
    {
      id: "frontend",
      title: { en: "Front end", "pt-br": "Front-end" },
      skills: [
        "React",
        "Next.js",
        "Svelte",
        "TypeScript",
        "Tailwind CSS",
        "UI/UX design",
        "Figma",
      ],
    },
    {
      id: "infra",
      title: { en: "Cloud & tooling", "pt-br": "Cloud e ferramentas" },
      skills: [
        "Microsoft Azure",
        "Copilot Studio",
        "Power Automate",
        "RPA",
        "Claude Code",
        "GitHub Copilot",
        "Vercel",
        "Git & GitHub",
        "Agile",
      ],
    },
  ],

  knowsAbout: [
    "Artificial Intelligence",
    "Generative AI",
    "Large Language Models",
    "AI Engineering",
    "AI Agents",
    "Multi-agent Systems",
    "Agentic AI",
    "Model Context Protocol",
    "Retrieval-Augmented Generation",
    "LLM Evaluation",
    "AI-assisted Software Engineering",
    "Machine Learning",
    "Microsoft Azure",
    "Full-stack Development",
    "Front-end Development",
    "UI/UX Design",
  ],

  certifications: [
    {
      id: "ms-multi-agent-ai-solutions-expert",
      name: "Microsoft Certified: Multi-Agent AI Solutions Expert",
      issuer: "Microsoft",
      issuerUrl: "https://learn.microsoft.com/credentials/",
      kind: "certification",
      level: "Expert",
      logo: "azure",
      date: "2026-10-02",
      expires: "2027-10-02",
      credentialId: "EC8CEDC7DF459008",
      certificationNumber: "B66FB6-532437",
      credentialUrl:
        "https://learn.microsoft.com/api/credentials/share/en-us/DaviTobiasLacerda/EC8CEDC7DF459008",
      image: {
        src: "/certificates/multi-agent-ai-solutions-expert.png",
        width: 669,
        height: 435,
      },
      description: {
        en: "Expert-level certification in designing and building multi-agent AI solutions.",
        "pt-br":
          "Certificação de nível Expert em projetar e construir soluções de IA multiagente.",
      },
    },
    {
      id: "ms-agentic-ai-business-solutions-architect",
      name: "Microsoft Certified: Agentic AI Business Solutions Architect",
      issuer: "Microsoft",
      issuerUrl: "https://learn.microsoft.com/credentials/",
      kind: "certification",
      level: "Expert",
      logo: "azure",
      date: "2026-08-14",
      expires: "2027-08-14",
      credentialId: "FA07966E5B1A461",
      certificationNumber: "0FE606-E0517X",
      credentialUrl:
        "https://learn.microsoft.com/api/credentials/share/en-us/DaviTobiasLacerda/FA07966E5B1A461",
      image: {
        src: "/certificates/agentic-ai-business-solutions-architect.png",
        width: 768,
        height: 366,
      },
      description: {
        en: "Expert-level certification in enterprise AI solution architecture: strategy, architecture, implementation, security, governance and business outcomes.",
        "pt-br":
          "Certificação de nível Expert em arquitetura de soluções corporativas de IA: estratégia, arquitetura, implementação, segurança, governança e resultados de negócio.",
      },
    },
    {
      id: "ms-azure-ai-apps-and-agents-developer-associate",
      name: "Microsoft Certified: Azure AI Apps and Agents Developer Associate",
      issuer: "Microsoft",
      issuerUrl: "https://learn.microsoft.com/credentials/",
      kind: "certification",
      level: "Associate",
      logo: "azure",
      date: "2026-06-23",
      expires: "2027-06-23",
      credentialId: "7D5DACB2C80D7C0D",
      certificationNumber: "5DA4S7-D97848",
      credentialUrl:
        "https://learn.microsoft.com/api/credentials/share/en-us/DaviTobiasLacerda/7D5DACB2C80D7C0D",
      image: {
        src: "/certificates/azure-ai-apps-and-agents-developer-associate.png",
        width: 923,
        height: 440,
      },
      description: {
        en: "Associate-level certification in building AI apps and agents on Azure.",
        "pt-br":
          "Certificação de nível Associate em construir apps e agentes de IA no Azure.",
      },
    },
    // Shown as a quiet "Also completed" list under the certifications. Only
    // AI work that adds signal: the 2022 React courses (Rocketseat, Alura) and
    // Microsoft Learn module badges are left out on purpose.
    {
      id: "dlai-mcp-rich-context-ai-apps-with-anthropic",
      name: "MCP: Build Rich-Context AI Apps with Anthropic",
      issuer: "DeepLearning.AI",
      issuerUrl: "https://www.deeplearning.ai",
      kind: "course",
      date: "2025-08",
      credentialUrl:
        "https://learn.deeplearning.ai/accomplishments/d90cf952-a2e3-4606-8106-7d852747a30a",
    },
    {
      id: "dlai-pydantic-for-llm-workflows",
      name: "Pydantic for LLM Workflows",
      issuer: "DeepLearning.AI",
      issuerUrl: "https://www.deeplearning.ai",
      kind: "course",
      date: "2025-08",
      credentialUrl:
        "https://learn.deeplearning.ai/accomplishments/112afc35-5e86-4ab8-becf-58da57a30900",
    },
  ],

  credentialsProfile: {
    name: "Microsoft Learn",
    url: {
      en: "https://learn.microsoft.com/en-us/users/davitobiaslacerda/",
      "pt-br": "https://learn.microsoft.com/pt-br/users/davitobiaslacerda/",
    },
  },

  education: [
    {
      id: "ufu",
      institution: {
        en: "Federal University of Uberlândia",
        "pt-br": "Universidade Federal de Uberlândia",
      },
      shortName: "UFU",
      url: "https://ufu.br",
      // TODO(davi): add /public/logos/ufu.svg and set logo: "/logos/ufu.svg".
      degree: {
        en: "Bachelor of Science (B.Sc.)",
        "pt-br": "Bacharelado",
      },
      field: { en: "Computer Science", "pt-br": "Ciência da Computação" },
      // TODO(davi): add the start year.
      end: "2024-11",
      location: { en: "Uberlândia, Brazil", "pt-br": "Uberlândia, Brasil" },
      thesis: {
        year: "2024",
        // TODO(davi): add the thesis (TCC) title and a one-line summary.
        description: {
          en: "Undergraduate thesis (TCC) developed in 2024.",
          "pt-br": "Trabalho de Conclusão de Curso (TCC) desenvolvido em 2024.",
        },
      },
      coursework: {
        en: [
          "Artificial Intelligence",
          "Computational Intelligence",
          "Compilers",
          "Distributed Systems",
        ],
        "pt-br": [
          "Inteligência Artificial",
          "Inteligência Computacional",
          "Compiladores",
          "Sistemas Distribuídos",
        ],
      },
    },
  ],

  achievements: [
    {
      id: "conecta-latam-best-ai-project",
      title: {
        en: "Best AI Project in LATAM",
        "pt-br": "Melhor Projeto de IA da América Latina",
      },
      issuer: "Conecta Latam",
      event: "Conecta Latam Awards 2025",
      category: {
        en: "Best AI Implementation Initiative in Telecommunications",
        "pt-br": "Melhor Iniciativa de Implementação de IA em Telecomunicações",
      },
      featured: true,
      // Winners announced on December 3, 2025, in Panama City (Tele.Síntese).
      date: "2025-12",
      url: "https://telesintese.com.br/anatel-e-profissionais-brasileiros-sao-reconhecidos-em-premio-internacional/",
      description: {
        en: "Algar's Sales Copilot, which I led as main developer, won the Conecta Latam Awards 2025 in the category Best AI Implementation Initiative in Telecommunications, a recognition across Latin America.",
        "pt-br":
          "O Sales Copilot da Algar, do qual fui o principal desenvolvedor, venceu o Conecta Latam Awards 2025 na categoria Melhor Iniciativa de Implementação de IA em Telecomunicações, um reconhecimento em toda a América Latina.",
      },
    },
    {
      id: "microsoft-expert-certifications",
      title: {
        en: "Two Microsoft Certified Expert credentials",
        "pt-br": "Duas certificações Microsoft Certified Expert",
      },
      issuer: "Microsoft",
      featured: true,
      date: "2026-10",
      description: {
        en: "Multi-Agent AI Solutions Expert (October 2026) and Agentic AI Business Solutions Architect (August 2026).",
        "pt-br":
          "Multi-Agent AI Solutions Expert (outubro de 2026) e Agentic AI Business Solutions Architect (agosto de 2026).",
      },
    },
    {
      id: "github-pull-shark",
      title: "Pull Shark",
      issuer: "GitHub",
      featured: false,
      url: `${GITHUB}?tab=achievements`,
      description: {
        en: "GitHub achievement for getting pull requests merged.",
        "pt-br": "Conquista do GitHub por ter pull requests aceitos (merged).",
      },
    },
    {
      id: "github-quickdraw",
      title: "Quickdraw",
      issuer: "GitHub",
      featured: false,
      url: `${GITHUB}?tab=achievements`,
      description: {
        en: "GitHub achievement for closing an issue or pull request within five minutes of opening it.",
        "pt-br":
          "Conquista do GitHub por fechar uma issue ou pull request em até cinco minutos.",
      },
    },
  ],

  languages: [
    {
      code: "pt-BR",
      name: { en: "Portuguese", "pt-br": "Português" },
      level: { en: "Native", "pt-br": "Nativo" },
    },
    {
      code: "en",
      name: { en: "English", "pt-br": "Inglês" },
      level: { en: "Professional", "pt-br": "Profissional" },
    },
  ],

  faq: [
    {
      id: "what-does-davi-do",
      question: {
        en: "What does Davi Lacerda do?",
        "pt-br": "O que Davi Lacerda faz?",
      },
      answer: {
        en: "Davi Lacerda is an AI Engineer at Algar in Uberlândia, Brazil. He builds Generative AI products and AI agents end to end, from the back end and front end to the AI tools behind them. He was the main developer of Algar's Sales Copilot, named Best AI Project in LATAM at the Conecta Latam awards, and his other work there includes Billy, which cut manual invoice review time by 96%.",
        "pt-br":
          "Davi Lacerda é Engenheiro de IA na Algar, em Uberlândia. Ele constrói produtos de IA Generativa e agentes de IA de ponta a ponta, do back-end e do front-end às ferramentas de IA por trás deles. Foi o principal desenvolvedor do Sales Copilot da Algar, eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam, e também trabalhou no Billy, que reduziu em 96% o tempo de revisão manual de faturas.",
      },
    },
    {
      id: "tech-stack",
      question: {
        en: "What is Davi's tech stack?",
        "pt-br": "Qual é o stack de tecnologia do Davi?",
      },
      answer: {
        en: "Generative AI and AI agents on Azure OpenAI and Azure AI Foundry, built with Mastra, LangGraph, CrewAI and the AI SDK, in TypeScript and Python, and evaluated with LLM-as-a-judge benchmarks; Copilot Studio and Power Automate for agents inside Microsoft 365; full-stack web development with Next.js, React, Svelte and .NET; and AI-assisted engineering with Claude Code, GitHub Copilot and MCP.",
        "pt-br":
          "IA Generativa e agentes de IA no Azure OpenAI e no Azure AI Foundry, construídos com Mastra, LangGraph, CrewAI e AI SDK, em TypeScript e Python, e avaliados com benchmarks de LLM como juiz (LLM-as-a-judge); Copilot Studio e Power Automate para agentes dentro do Microsoft 365; desenvolvimento web full-stack com Next.js, React, Svelte e .NET; e engenharia assistida por IA com Claude Code, GitHub Copilot e MCP.",
      },
    },
    {
      id: "sales-copilot",
      question: {
        en: "What is the Sales Copilot Davi built?",
        "pt-br": "O que é o Sales Copilot que Davi construiu?",
      },
      answer: {
        en: "The Sales Copilot is an AI copilot for Algar's sales teams: it listens to calls, reads the conversation in real time and suggests arguments and offers that fit each customer. Davi was its main developer, designing and building it end to end, from the Svelte front end and the .NET back end to the AI tools on Azure OpenAI. It won Best AI Project in LATAM at the Conecta Latam awards in December 2025.",
        "pt-br":
          "O Sales Copilot é um copiloto com IA para os times de vendas da Algar: escuta as ligações, analisa a conversa em tempo real e sugere argumentos e ofertas sob medida para cada cliente. Davi foi o principal desenvolvedor, projetando e construindo de ponta a ponta, do front-end em Svelte e do back-end em .NET às ferramentas de IA no Azure OpenAI. Ele venceu como Melhor Projeto de IA da América Latina no prêmio Conecta Latam, em dezembro de 2025.",
      },
    },
    {
      id: "billy",
      question: {
        en: "What is Billy?",
        "pt-br": "O que é o Billy?",
      },
      answer: {
        en: "Billy is a generative AI app at Algar that automates the analysis and validation of telecom invoices, extracting and interpreting contract data with Azure OpenAI and RPA. It cut manual review time by 96% and saved millions in operating costs.",
        "pt-br":
          "O Billy é uma aplicação de IA Generativa da Algar que automatiza a análise e a validação de faturas de telecom, extraindo e interpretando dados de contratos com Azure OpenAI e RPA. Reduziu o tempo de revisão manual em 96% e gerou economia de milhões em custos operacionais.",
      },
    },
    {
      id: "certifications",
      question: {
        en: "What certifications does Davi have?",
        "pt-br": "Quais certificações Davi tem?",
      },
      answer: {
        en: "Davi holds three Microsoft certifications. Two are Expert level: Microsoft Certified: Multi-Agent AI Solutions Expert (October 2026) and Microsoft Certified: Agentic AI Business Solutions Architect (August 2026). The third is Microsoft Certified: Azure AI Apps and Agents Developer Associate (June 2026). All three are valid for a year and can be verified on Microsoft Learn.",
        "pt-br":
          "Davi tem três certificações Microsoft. Duas são de nível Expert: Microsoft Certified: Multi-Agent AI Solutions Expert (outubro de 2026) e Microsoft Certified: Agentic AI Business Solutions Architect (agosto de 2026). A terceira é a Microsoft Certified: Azure AI Apps and Agents Developer Associate (junho de 2026). As três valem por um ano e podem ser verificadas no Microsoft Learn.",
      },
    },
    {
      id: "location",
      question: {
        en: "Where is Davi based?",
        "pt-br": "Onde Davi mora?",
      },
      answer: {
        en: "Uberlândia, Minas Gerais, Brazil (UTC−3). He works in Portuguese (native) and English (professional).",
        "pt-br":
          "Em Uberlândia, Minas Gerais, Brasil (UTC−3). Ele trabalha em português (nativo) e inglês (profissional).",
      },
    },
    {
      id: "education",
      question: {
        en: "Where did Davi study?",
        "pt-br": "Onde Davi estudou?",
      },
      answer: {
        en: "Davi holds a B.Sc. in Computer Science from the Federal University of Uberlândia (UFU), completed in November 2024, with coursework in artificial intelligence, computational intelligence, compilers and distributed systems.",
        "pt-br":
          "Davi é bacharel em Ciência da Computação pela Universidade Federal de Uberlândia (UFU), com conclusão em novembro de 2024 e disciplinas de inteligência artificial, inteligência computacional, compiladores e sistemas distribuídos.",
      },
    },
    {
      id: "contact",
      question: {
        en: "How can I reach Davi?",
        "pt-br": "Como falar com o Davi?",
      },
      answer: {
        en: "By email at davi16lacerda@gmail.com or on LinkedIn. He is always happy to talk about AI, agents or a good idea.",
        "pt-br":
          "Pelo e-mail davi16lacerda@gmail.com ou pelo LinkedIn. Ele está sempre aberto a uma conversa sobre IA, agentes ou uma boa ideia.",
      },
    },
  ],
};

/** All skill names, de-duplicated, for schema.org `knowsAbout` and llms.txt. */
export function allSkills(): string[] {
  return [...new Set(profile.skills.flatMap((group) => group.skills))];
}

/** Social entry by id. Throws if missing so typos fail the build. */
export function getSocial(id: SocialId): Social {
  const social = profile.socials.find((s) => s.id === id);
  if (!social) throw new Error(`Unknown social "${id}"`);
  return social;
}

/** Projects with their own page (a `story`), in profile order. */
export function getProjectPages(): Project[] {
  return profile.projects.filter((project) => project.story);
}

/** A project with its own page, by id (= slug), or undefined. */
export function getProjectPage(id: string): Project | undefined {
  return getProjectPages().find((project) => project.id === id);
}

/** The achievement behind a project's award (issuer, date, category, link). */
export function getProjectAchievement(
  project: Project,
): Achievement | undefined {
  return project.achievement
    ? profile.achievements.find((item) => item.id === project.achievement)
    : undefined;
}

export type OutletCoverage = {
  outlet: string;
  /** Its articles, newest first, each with the project it covers. */
  articles: (PressLink & { project: Project })[];
};

/** Every outlet that covered a project, by its newest article (newest first). */
export function getPressOutlets(): OutletCoverage[] {
  const byOutlet = new Map<string, OutletCoverage>();
  for (const project of profile.projects) {
    for (const item of project.press ?? []) {
      const entry = byOutlet.get(item.outlet) ?? {
        outlet: item.outlet,
        articles: [],
      };
      entry.articles.push({ ...item, project });
      byOutlet.set(item.outlet, entry);
    }
  }
  const newest = (entry: OutletCoverage) =>
    entry.articles.reduce((max, a) => (a.date > max ? a.date : max), "");
  return [...byOutlet.values()]
    .map((entry) => ({
      ...entry,
      articles: [...entry.articles].sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    }))
    .sort((a, b) => newest(b).localeCompare(newest(a)));
}

/** Formal credentials first (newest first), then courses. */
export function getCertifications(
  kind?: Certification["kind"],
): Certification[] {
  const list = kind
    ? profile.certifications.filter((c) => c.kind === kind)
    : profile.certifications;
  return [...list].sort(
    (a, b) =>
      (a.kind === b.kind ? 0 : a.kind === "certification" ? -1 : 1) ||
      (b.date ?? "").localeCompare(a.date ?? ""),
  );
}

const tierOrder = ["Expert", "Associate", "Fundamentals"];

/**
 * Formal certifications counted by tier, highest first:
 * [{ level: "Expert", count: 2 }, { level: "Associate", count: 1 }].
 */
export function certificationTiers(): { level: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const cert of getCertifications("certification")) {
    if (cert.level) counts.set(cert.level, (counts.get(cert.level) ?? 0) + 1);
  }
  const rank = (level: string) =>
    tierOrder.includes(level) ? tierOrder.indexOf(level) : tierOrder.length;
  return [...counts]
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => rank(a.level) - rank(b.level));
}
