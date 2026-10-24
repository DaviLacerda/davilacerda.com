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
 */
import type { L10n, Localizable } from "@/i18n";
import type { PartialDate } from "@/i18n/format";

export type SocialId =
  "github" | "linkedin" | "instagram" | "discord" | "email";

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

export type Project = {
  id: string;
  name: Localizable;
  description: L10n;
  /** "work" = built at a job (may be private), "side" = personal/open source. */
  kind: "work" | "side";
  featured: boolean;
  stack: string[];
  /** Organization the project was built for, if any. */
  context?: string;
  /** Davi's role on the project, when it matters (e.g. "Main developer"). */
  role?: L10n;
  /** Award or recognition, displayed as a badge. */
  award?: L10n;
  repoUrl?: string;
  liveUrl?: string;
  isPrivate?: boolean;
  /** GitHub stars at the time of writing. */
  stars?: number;
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
  /** e.g. "Expert" for Microsoft Certified: ... Expert. */
  level?: string;
  /** Completion/issue date. Omitted = unknown. */
  date?: PartialDate;
  credentialUrl?: string;
  description?: L10n;
};

export type Education = {
  id: string;
  institution: L10n;
  /** Common abbreviation, e.g. "UFU". */
  shortName?: string;
  url?: string;
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
  /** Path to a portrait in /public, when available. */
  image?: string;
  /** Open to new roles, and on which terms. */
  availability: { open: boolean; modes: L10n };
  currentEmployer: { name: string; url?: string };
  socials: Social[];
  highlights: Highlight[];
  experience: Experience[];
  projects: Project[];
  skills: SkillGroup[];
  /** Extra topics for schema.org `knowsAbout` (merged with skills). */
  knowsAbout: string[];
  certifications: Certification[];
  education: Education[];
  achievements: Achievement[];
  languages: SpokenLanguage[];
  faq: FaqItem[];
};

const GITHUB = "https://github.com/DaviLacerda";
const LINKEDIN = "https://www.linkedin.com/in/davi16lacerda/";

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
    en: "I'm an AI Engineer at Algar in Uberlândia, Brazil, focused on Generative AI and AI agents. I was the main developer behind Algar's Sales Copilot, designing and building it end to end, from the back end and front end to the AI tools that power it; it won Best AI Project in LATAM at the Conecta Latam awards. My background spans front-end and back-end development, machine learning, UI/UX design and automation, and I hold Microsoft's Expert-level certifications in multi-agent AI solutions and agentic AI architecture. These days I'm most interested in agents, the Model Context Protocol (MCP) and making GenAI dependable in real products.",
    "pt-br":
      "Sou Engenheiro de IA na Algar, em Uberlândia, com foco em IA Generativa e agentes de IA. Fui o principal desenvolvedor do Sales Copilot da Algar, que projetei e construí de ponta a ponta, do back-end e do front-end às ferramentas de IA que o fazem funcionar; ele venceu como Melhor Projeto de IA da América Latina no prêmio Conecta Latam. Minha experiência passa por desenvolvimento front-end e back-end, machine learning, UI/UX design e automação, e tenho as certificações Microsoft de nível Expert em soluções de IA multiagente e arquitetura de IA agêntica. Hoje me interesso principalmente por agentes, pelo Model Context Protocol (MCP) e por tornar a IA Generativa confiável em produtos reais.",
  },

  tldr: {
    en: "Davi Lacerda (Davi Tobias Lacerda) is an AI Engineer based in Uberlândia, Minas Gerais, Brazil. He has worked as an AI Engineer at Algar since August 2024 and was the main developer of Algar's Sales Copilot, which won Best AI Project in LATAM at the Conecta Latam awards. He holds two Expert-level Microsoft certifications (Multi-Agent AI Solutions Expert and Agentic AI Business Solutions Architect), studied Computer Science at the Federal University of Uberlândia (UFU), and works across Generative AI, AI agents, Azure, the AI SDK and full-stack development. He is open to AI Engineer roles, on-site or hybrid in Uberlândia and remote, and can be reached at davi16lacerda@gmail.com.",
    "pt-br":
      "Davi Lacerda (Davi Tobias Lacerda) é Engenheiro de IA em Uberlândia, Minas Gerais, Brasil. Ele atua como Engenheiro de IA na Algar desde agosto de 2024 e foi o principal desenvolvedor do Sales Copilot da Algar, eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam. Tem duas certificações Microsoft de nível Expert (Multi-Agent AI Solutions Expert e Agentic AI Business Solutions Architect), estudou Ciência da Computação na Universidade Federal de Uberlândia (UFU) e atua com IA Generativa, agentes de IA, Azure, AI SDK e desenvolvimento full-stack. Está aberto a vagas de Engenheiro de IA, presenciais ou híbridas em Uberlândia e remotas, e pode ser contatado em davi16lacerda@gmail.com.",
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

  // TODO(davi): add a portrait (e.g. /images/davi.jpg) for the hero, OG images and schema.org `image`.
  image: undefined,

  availability: {
    open: true,
    modes: {
      en: "On-site or hybrid in Uberlândia, and remote",
      "pt-br": "Presencial ou híbrido em Uberlândia, e remoto",
    },
  },

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
        en: "I design, build and ship Generative AI products and AI agents at Algar, owning them from architecture to production. I was the main developer behind the Sales Copilot, recognized as Best AI Project in LATAM.",
        "pt-br":
          "Projeto, construo e coloco em produção produtos de IA Generativa e agentes de IA na Algar, sendo responsável por eles da arquitetura à produção. Fui o principal desenvolvedor do Sales Copilot, reconhecido como Melhor Projeto de IA da América Latina.",
      },
      highlights: {
        en: [
          "Led Algar's Sales Copilot as main developer and owned it end to end, from architecture and back end to the front end and the AI tools that power it. It won Best AI Project in LATAM at the Conecta Latam awards.",
          "Design and build multi-agent and agentic AI systems that take Generative AI from prototype to production.",
          "Architect enterprise-grade AI solutions on Microsoft Azure with security, governance and business outcomes in mind.",
          "Work full-stack across back-end services, user-facing interfaces and the AI tooling between them, with TypeScript, Python and the AI SDK.",
          "Contributed to pricing, data and FinOps initiatives alongside Generative AI projects.",
        ],
        "pt-br": [
          "Liderei o Sales Copilot da Algar como principal desenvolvedor, de ponta a ponta: da arquitetura e do back-end ao front-end e às ferramentas de IA que o fazem funcionar. Ele venceu como Melhor Projeto de IA da América Latina no prêmio Conecta Latam.",
          "Projeto e construo sistemas de IA multiagente e agêntica que levam a IA Generativa do protótipo à produção.",
          "Arquiteto soluções de IA de nível corporativo no Microsoft Azure, com foco em segurança, governança e resultados de negócio.",
          "Atuo no stack inteiro, entre serviços de back-end, interfaces para usuários e as ferramentas de IA no meio, com TypeScript, Python e AI SDK.",
          "Contribuí para iniciativas de precificação, dados e FinOps junto aos projetos de IA Generativa.",
        ],
      },
      // TODO(davi): add the specific models, frameworks and data stores you use at Algar.
      stack: [
        "Generative AI",
        "AI agents",
        "Multi-agent systems",
        "Azure",
        "AI SDK",
        "TypeScript",
        "Python",
      ],
    },
    {
      id: "brain",
      company: "Brain – Centro de Inovação em Negócios Digitais",
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
        en: "Researched telecommunications, technology and AI topics, and strategically supported the Center of Excellence for Automations.",
        "pt-br":
          "Pesquisei temas de telecomunicações, tecnologia e IA, e apoiei estrategicamente o Centro de Excelência em Automações.",
      },
      highlights: {
        en: [
          "Researched telecommunications, technology and AI topics.",
          "Strategically supported the Center of Excellence for Automations.",
        ],
        "pt-br": [
          "Pesquisei temas de telecomunicações, tecnologia e IA.",
          "Apoiei estrategicamente o Centro de Excelência em Automações.",
        ],
      },
      stack: ["Artificial Intelligence", "Automation", "Research"],
    },
  ],

  projects: [
    {
      id: "sales-copilot",
      name: "Sales Copilot",
      kind: "work",
      featured: true,
      context: "Algar",
      role: { en: "Main developer", "pt-br": "Principal desenvolvedor" },
      award: {
        en: "Best AI Project in LATAM · Conecta Latam",
        "pt-br": "Melhor Projeto de IA da América Latina · Conecta Latam",
      },
      isPrivate: true,
      year: "2025",
      description: {
        en: "An AI copilot for Algar's sales teams. I designed and built it end to end, from the back end and front end to the AI tools that power it. Named Best AI Project in LATAM at the Conecta Latam awards.",
        "pt-br":
          "Um copiloto com IA para os times de vendas da Algar. Projetei e construí de ponta a ponta, do back-end e do front-end às ferramentas de IA que o fazem funcionar. Eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam.",
      },
      // TODO(davi): confirm the stack (models, AI SDK / Azure services, front-end framework, data stores).
      stack: ["TypeScript", "Generative AI", "AI agents", "Azure", "AI SDK"],
    },
    {
      id: "pricing",
      name: {
        en: "Pricing and data initiatives",
        "pt-br": "Iniciativas de precificação e dados",
      },
      kind: "work",
      featured: false,
      context: "Algar",
      isPrivate: true,
      year: "2024",
      // TODO(davi): describe the pricing project in one or two sentences if you can share it.
      description: {
        en: "Python work on pricing and data initiatives, alongside Generative AI projects at Algar.",
        "pt-br":
          "Trabalho em Python em iniciativas de precificação e dados, junto aos projetos de IA Generativa na Algar.",
      },
      stack: ["Python", "Data analysis", "Generative AI"],
    },
    {
      id: "figma-jam-clone",
      name: "figma-jam-clone",
      kind: "side",
      featured: true,
      repoUrl: `${GITHUB}/figma-jam-clone`,
      stars: 10,
      description: {
        en: "A FigJam-inspired whiteboard built with React Flow.",
        "pt-br":
          "Um quadro branco inspirado no FigJam, construído com React Flow.",
      },
      // TODO(davi): confirm stack.
      stack: ["React", "React Flow", "TypeScript"],
    },
    {
      id: "randomify",
      name: "randomify",
      kind: "side",
      featured: true,
      repoUrl: `${GITHUB}/randomify`,
      liveUrl: "https://randomify.davilacerda.com",
      description: {
        en: "Picks a random episode of a TV series for you. Born from my habit of rewatching random episodes of favorite shows.",
        "pt-br":
          "Sorteia um episódio aleatório de uma série. Nasceu do meu hábito de rever episódios aleatórios das séries favoritas.",
      },
      // TODO(davi): confirm stack.
      stack: ["Next.js", "TypeScript"],
    },
    {
      id: "davi-lacerda-themes",
      name: "davi-lacerda-themes",
      kind: "side",
      featured: false,
      repoUrl: `${GITHUB}/davi-lacerda-themes`,
      description: {
        en: "My own color themes for Visual Studio Code.",
        "pt-br": "Meus próprios temas de cores para o Visual Studio Code.",
      },
      stack: ["VS Code", "JSON"],
    },
    {
      id: "notetaker",
      name: "notetaker",
      kind: "side",
      featured: false,
      repoUrl: `${GITHUB}/notetaker`,
      description: {
        en: "A note-taking app built with the T3 stack.",
        "pt-br": "Um app de anotações construído com o T3 stack.",
      },
      stack: ["Next.js", "TypeScript", "T3 stack"],
    },
    {
      id: "disneyplus-nextjs",
      name: "disneyplus-nextjs",
      kind: "side",
      featured: false,
      repoUrl: `${GITHUB}/disneyplus-nextjs`,
      description: {
        en: "A Disney+ interface clone built with Next.js.",
        "pt-br": "Um clone da interface do Disney+ construído com Next.js.",
      },
      stack: ["Next.js", "React"],
    },
    {
      id: "cashcard",
      name: "cashcard",
      kind: "side",
      featured: false,
      repoUrl: `${GITHUB}/cashcard`,
      description: {
        en: "A REST API built with Java and Spring.",
        "pt-br": "Uma API REST construída com Java e Spring.",
      },
      stack: ["Java", "Spring"],
    },
    {
      id: "nlw-journey",
      name: "nlw-journey",
      kind: "side",
      featured: false,
      repoUrl: `${GITHUB}/nlw-journey`,
      description: {
        en: "A Python project built during Rocketseat's NLW Journey event.",
        "pt-br":
          "Um projeto em Python construído durante o evento NLW Journey da Rocketseat.",
      },
      stack: ["Python"],
    },
    {
      id: "davilacerda-com",
      name: "davilacerda.com",
      kind: "side",
      featured: false,
      repoUrl: `${GITHUB}/davilacerda.com`,
      liveUrl: "https://davilacerda.com",
      description: {
        en: "This site: bilingual, statically generated and structured for search and answer engines.",
        "pt-br":
          "Este site: bilíngue, gerado estaticamente e estruturado para buscadores e motores de resposta.",
      },
      stack: ["Next.js", "TypeScript", "Tailwind CSS"],
    },
  ],

  // Verified on LinkedIn: Generative AI, AI agents, Azure, AI SDK, front-end and back-end
  // development, machine learning, UI/UX design, automation, FinOps, Agile, MCP (interest).
  // TODO(davi): confirm the remaining items and add tools you use (vector DB, eval tooling, cloud services).
  skills: [
    {
      id: "llm",
      title: { en: "LLMs & agents", "pt-br": "LLMs e agentes" },
      skills: [
        "Generative AI",
        "AI agents",
        "Multi-agent systems",
        "Model Context Protocol (MCP)",
        "AI SDK",
        "Prompt engineering",
        "Tool calling",
      ],
    },
    {
      id: "rag",
      title: { en: "RAG & retrieval", "pt-br": "RAG e recuperação" },
      skills: ["Retrieval-Augmented Generation", "Embeddings", "Vector search"],
    },
    {
      id: "ml",
      title: { en: "Machine learning", "pt-br": "Machine learning" },
      skills: [
        "Machine learning",
        "Python",
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
        "TypeScript",
        "Tailwind CSS",
        "UI/UX design",
        "Figma",
      ],
    },
    {
      id: "infra",
      title: { en: "Cloud & delivery", "pt-br": "Cloud e entrega" },
      skills: [
        "Microsoft Azure",
        "Vercel",
        "Automation",
        "FinOps",
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
      date: "2026-10",
      // TODO(davi): add the credential URL.
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
      date: "2026-08",
      // TODO(davi): add the credential URL.
      description: {
        en: "Expert-level certification in enterprise AI solution architecture: strategy, architecture, implementation, security, governance and business outcomes.",
        "pt-br":
          "Certificação de nível Expert em arquitetura de soluções corporativas de IA: estratégia, arquitetura, implementação, segurança, governança e resultados de negócio.",
      },
    },
    // TODO(davi): a third certification was announced in June 2026; add its name, issuer and credential URL.
    {
      id: "rocketseat-ignite-react",
      name: "Ignite: React",
      issuer: "Rocketseat",
      issuerUrl: "https://www.rocketseat.com.br",
      kind: "course",
      date: "2022-03",
      description: {
        en: "Intensive React specialization track, February to March 2022.",
        "pt-br":
          "Trilha intensiva de especialização em React, de fevereiro a março de 2022.",
      },
    },
    {
      id: "alura-imersao-react",
      name: "Imersão React",
      issuer: "Alura",
      issuerUrl: "https://www.alura.com.br",
      kind: "course",
      date: "2022-01",
      description: {
        en: "Hands-on React immersion, January 2022.",
        "pt-br": "Imersão prática em React, janeiro de 2022.",
      },
    },
    {
      id: "rocketseat-nlw",
      name: {
        en: "Next Level Week (NLW) events",
        "pt-br": "Eventos Next Level Week (NLW)",
      },
      issuer: "Rocketseat",
      issuerUrl: "https://www.rocketseat.com.br",
      kind: "course",
      // TODO(davi): confirm which NLW editions and dates (the nlw-journey repo suggests NLW Journey).
      description: {
        en: "Rocketseat's week-long build events, including NLW Journey (Python).",
        "pt-br":
          "Eventos de uma semana da Rocketseat, incluindo o NLW Journey (Python).",
      },
    },
  ],

  education: [
    {
      id: "ufu",
      institution: {
        en: "Federal University of Uberlândia",
        "pt-br": "Universidade Federal de Uberlândia",
      },
      shortName: "UFU",
      url: "https://ufu.br",
      degree: { en: "Bachelor's degree", "pt-br": "Bacharelado" }, // TODO(davi): confirm degree type.
      field: { en: "Computer Science", "pt-br": "Ciência da Computação" },
      // TODO(davi): confirm start and graduation years.
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
      featured: true,
      // TODO(davi): add the award date (year at least) and a link to the announcement.
      description: {
        en: "Algar's Sales Copilot, which I led as main developer, was named Best AI Project in LATAM at the Conecta Latam awards, a recognition across Latin America.",
        "pt-br":
          "O Sales Copilot da Algar, do qual fui o principal desenvolvedor, foi eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam, um reconhecimento em toda a região.",
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
        en: "Davi Lacerda is an AI Engineer at Algar in Uberlândia, Brazil. He builds Generative AI products and AI agents end to end, from the back end and front end to the AI tools behind them. He was the main developer of Algar's Sales Copilot, named Best AI Project in LATAM at the Conecta Latam awards.",
        "pt-br":
          "Davi Lacerda é Engenheiro de IA na Algar, em Uberlândia. Ele constrói produtos de IA Generativa e agentes de IA de ponta a ponta, do back-end e do front-end às ferramentas de IA por trás deles. Foi o principal desenvolvedor do Sales Copilot da Algar, eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam.",
      },
    },
    {
      id: "open-to-roles",
      question: {
        en: "Is Davi open to AI Engineer roles?",
        "pt-br": "Davi está aberto a vagas de Engenheiro de IA?",
      },
      answer: {
        en: "Yes. Davi is open to AI Engineer roles, on-site or hybrid in Uberlândia, Brazil, and remote. The best way to reach him is by email at davi16lacerda@gmail.com or on LinkedIn.",
        "pt-br":
          "Sim. Davi está aberto a vagas de Engenheiro de IA, presenciais ou híbridas em Uberlândia e remotas. A melhor forma de contato é pelo e-mail davi16lacerda@gmail.com ou pelo LinkedIn.",
      },
    },
    {
      id: "tech-stack",
      question: {
        en: "What is Davi's tech stack?",
        "pt-br": "Qual é o stack de tecnologia do Davi?",
      },
      answer: {
        en: "Generative AI and AI agents built with Microsoft Azure and the AI SDK, in TypeScript and Python; full-stack web development with Next.js, React and Tailwind CSS; plus machine learning, automation and UI/UX design.",
        "pt-br":
          "IA Generativa e agentes de IA construídos com Microsoft Azure e AI SDK, em TypeScript e Python; desenvolvimento web full-stack com Next.js, React e Tailwind CSS; além de machine learning, automação e UI/UX design.",
      },
    },
    {
      id: "sales-copilot",
      question: {
        en: "What is the Sales Copilot Davi built?",
        "pt-br": "O que é o Sales Copilot que Davi construiu?",
      },
      answer: {
        en: "The Sales Copilot is an AI copilot for Algar's sales teams. Davi was its main developer, designing and building it end to end, from the back end and front end to the AI tools that power it. It won Best AI Project in LATAM at the Conecta Latam awards.",
        "pt-br":
          "O Sales Copilot é um copiloto com IA para os times de vendas da Algar. Davi foi o principal desenvolvedor, projetando e construindo de ponta a ponta, do back-end e do front-end às ferramentas de IA que o fazem funcionar. Ele venceu como Melhor Projeto de IA da América Latina no prêmio Conecta Latam.",
      },
    },
    {
      id: "certifications",
      question: {
        en: "What certifications does Davi have?",
        "pt-br": "Quais certificações Davi tem?",
      },
      answer: {
        en: "Davi holds two Expert-level Microsoft certifications: Microsoft Certified: Multi-Agent AI Solutions Expert (October 2026) and Microsoft Certified: Agentic AI Business Solutions Architect (August 2026).",
        "pt-br":
          "Davi tem duas certificações Microsoft de nível Expert: Microsoft Certified: Multi-Agent AI Solutions Expert (outubro de 2026) e Microsoft Certified: Agentic AI Business Solutions Architect (agosto de 2026).",
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
        en: "Davi studied Computer Science at the Federal University of Uberlândia (UFU), with coursework in artificial intelligence, computational intelligence, compilers and distributed systems.",
        "pt-br":
          "Davi estudou Ciência da Computação na Universidade Federal de Uberlândia (UFU), com disciplinas de inteligência artificial, inteligência computacional, compiladores e sistemas distribuídos.",
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
