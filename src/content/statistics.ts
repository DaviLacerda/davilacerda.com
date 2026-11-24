/**
 * The Statistics page (`/[lang]/statistics`): numbers about generative AI
 * and AI agents, each on its own line, each traced to whoever did the
 * original research, next to the results of Davi's own work. The page, its
 * Markdown, llms.txt, the JSON-LD, the OG card and MCP all read from here.
 *
 * Rules:
 * - A number is listed only after its original source was opened and the
 *   figure was found there. A number that cannot be traced is left out.
 * - `text` is one short sentence that makes sense on its own and names the
 *   research and its year ("The 2026 Stack Overflow Developer Survey found
 *   that..."), so whoever quotes the line carries the name with it.
 * - `value` is the same figure the sentence states, set large.
 * - Davi's own numbers come from `profile.ts` (and the press listed there);
 *   nothing here may add a metric the profile does not have.
 * - No year in the URL: the year lives in the title, from `updated`.
 *
 * To update: add or replace entries, add the source to `sources`, and set
 * `updated` to the day the sources were last checked. Each January, check
 * every source for a new edition and replace the numbers it supersedes.
 */
import { profile, type PressLink } from "@/content/profile";
import type { L10n, Localizable } from "@/i18n";
import type { PartialDate } from "@/i18n/format";

export type StatSource = {
  /** Who did the original research, as it writes its own name. */
  publisher: string;
  /** The publication, as published (not translated unless the source is). */
  title: Localizable;
  /** The original page; per locale when the source publishes both. */
  url: Localizable;
  /** When it was published, as precisely as the source states. */
  date: PartialDate;
  /** BCP 47 language of the source (per locale when `url` is). */
  lang: Localizable;
  /** What the numbers rest on: sample and period. */
  method?: L10n;
};

export type Statistic = {
  /** Anchor on the page (`/en/statistics#<id>`): lowercase, hyphens. */
  id: string;
  /** The figure, set large: "57%", "R$ 3M". */
  value: Localizable;
  /** One sentence that stands on its own and names the research and its year. */
  text: L10n;
  /** Key of `sources`. Omitted for a number only Davi's profile states. */
  source?: SourceId;
  /** The `profile.projects` id behind one of Davi's own numbers. */
  project?: string;
};

export type StatSection = {
  /** Anchor on the page: lowercase, hyphens. */
  id: string;
  /** Short name for the page's outline: "Adoption". */
  label: L10n;
  /** The section's `h2`, written as the search it answers. */
  title: L10n;
  /** One or two sentences under the title: what the numbers measure, where sources differ. */
  intro?: L10n;
  /** Davi's own numbers: the ink panel on the page. */
  own?: boolean;
  stats: Statistic[];
};

/** A project's article from the profile, so its headline and link never drift. */
function press(projectId: string, outlet: string): PressLink {
  const item = profile.projects
    .find((project) => project.id === projectId)
    ?.press?.find((entry) => entry.outlet === outlet);
  if (!item) throw new Error(`No ${outlet} article on "${projectId}"`);
  return item;
}

const teletimeBilly = press("billy", "Teletime");
const mobileTimeBilly = press("billy", "Mobile Time");

// Every source below was opened and checked on the `updated` date.
const sources = {
  mckinsey2026: {
    publisher: "McKinsey & Company",
    title: "The state of AI in 2026: On the road to ROI",
    url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
    date: "2026-08-25",
    lang: "en",
    method: {
      en: "Online survey of 1,719 participants in 97 nations, May 4 to June 8, 2026.",
      "pt-br":
        "Pesquisa online com 1.719 participantes de 97 países, de 4 de maio a 8 de junho de 2026.",
    },
  },
  langchain2025: {
    publisher: "LangChain",
    title: "State of Agent Engineering",
    url: "https://www.langchain.com/state-of-agent-engineering",
    date: "2025-12",
    lang: "en",
    method: {
      en: "Survey of 1,340 professionals, November 18 to December 2, 2025.",
      "pt-br":
        "Pesquisa com 1.340 profissionais, de 18 de novembro a 2 de dezembro de 2025.",
    },
  },
  gartner2025: {
    publisher: "Gartner",
    title:
      "Gartner Predicts Over 40% of Agentic AI Projects Will Be Canceled by End of 2027",
    url: "https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027",
    date: "2025-06-25",
    lang: "en",
    method: {
      en: "A prediction, not a measurement.",
      "pt-br": "Uma previsão, não uma medição.",
    },
  },
  stackOverflow2026: {
    publisher: "Stack Overflow",
    title: "2026 Developer Survey: AI",
    url: "https://survey.stackoverflow.co/2026/ai/data",
    date: "2026-10-06",
    lang: "en",
    method: {
      en: "More than 30,000 respondents; 17,464 answered the question on AI tools at work.",
      "pt-br":
        "Mais de 30 mil respondentes; 17.464 responderam à pergunta sobre ferramentas de IA no trabalho.",
    },
  },
  stackOverflow2026Results: {
    publisher: "Stack Overflow",
    title: "The results of the 2026 Developer Survey are here!",
    url: "https://stackoverflow.blog/2026/10/06/the-results-of-the-2026-developer-survey-are-here/",
    date: "2026-10-06",
    lang: "en",
  },
  dora2025: {
    publisher: "DORA (Google Cloud)",
    title: "2025 DORA Report: State of AI-assisted Software Development",
    url: "https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report",
    date: "2025-09-23",
    lang: "en",
    method: {
      en: "Survey of nearly 5,000 technology professionals.",
      "pt-br": "Pesquisa com quase 5 mil profissionais de tecnologia.",
    },
  },
  anthropicMcp2025: {
    publisher: "Anthropic",
    title:
      "Donating the Model Context Protocol and establishing the Agentic AI Foundation",
    url: "https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation",
    date: "2025-12-09",
    lang: "en",
  },
  aiIndex2026: {
    publisher: "Stanford HAI",
    title: "The 2026 AI Index Report",
    url: "https://hai.stanford.edu/ai-index/2026-ai-index-report",
    date: "2026",
    lang: "en",
  },
  aiIndex2026Economy: {
    publisher: "Stanford HAI",
    title: "The 2026 AI Index Report, chapter 4: Economy",
    url: "https://hai.stanford.edu/assets/files/ai_index_report_2026_chapter_4_economy.pdf",
    date: "2026",
    lang: "en",
  },
  nvidiaTelco2026: {
    publisher: "NVIDIA",
    title: "State of AI in Telecommunications: 2026 Trends",
    url: "https://blogs.nvidia.com/blog/ai-in-telco-survey-2026/",
    date: "2026-02-19",
    lang: "en",
    method: {
      en: "Fourth annual survey, about 1,000 responses, a quarter of them from telecom operators.",
      "pt-br":
        "Quarta edição anual, cerca de mil respostas, um quarto delas de operadoras.",
    },
  },
  ceticEmpresas2025: {
    publisher: "Cetic.br (NIC.br)",
    title: "TIC Empresas 2025",
    url: "https://cetic.br/pt/noticia/uso-de-inteligencia-artificial-por-empresas-brasileiras-avanca-e-atinge-17-aponta-pesquisa-do-cetic-br/",
    date: "2026-06",
    lang: "pt-BR",
    method: {
      en: "4,174 Brazilian companies with ten or more employees, interviewed from February 2025 to January 2026.",
      "pt-br":
        "4.174 empresas brasileiras com dez ou mais pessoas ocupadas, entrevistadas de fevereiro de 2025 a janeiro de 2026.",
    },
  },
  ceticDomicilios2025: {
    publisher: "Cetic.br (NIC.br)",
    title: "TIC Domicílios 2025",
    url: "https://cetic.br/pt/noticia/50-milhoes-de-brasileiros-ja-usam-ia-mas-potenciais-beneficios-continuam-limitados-as-camadas-de-maior-renda-e-escolaridade/",
    date: "2025-12-09",
    lang: "pt-BR",
    method: {
      en: "27,177 households and 24,535 individuals in Brazil, March to August 2025.",
      "pt-br":
        "27.177 domicílios e 24.535 indivíduos no Brasil, de março a agosto de 2025.",
    },
  },
  ibgePintec2024: {
    publisher: "IBGE",
    title: {
      en: "From 2022 to 2024, percentage of industrial companies using Artificial Intelligence rises from 16.9% to 41.9%",
      "pt-br":
        "De 2022 a 2024, percentual de empresas industriais utilizando Inteligência Artificial subiu de 16,9% para 41,9%",
    },
    url: {
      en: "https://agenciadenoticias.ibge.gov.br/en/agencia-news/44561-from-2022-to-2024-percentage-of-industrial-companies-using-artificial-intelligence-rises-from-16-9-to-41-9.html",
      "pt-br":
        "https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-noticias/noticias/44551-de-2022-a-2024-percentual-de-empresas-industriais-utilizando-inteligencia-artificial-subiu-de-16-9-para-41-9",
    },
    date: "2025-09-24",
    lang: { en: "en", "pt-br": "pt-BR" },
    method: {
      en: "PINTEC Semestral: Brazilian mining and manufacturing companies with 100 or more employees.",
      "pt-br":
        "PINTEC Semestral: empresas brasileiras das indústrias extrativas e de transformação com 100 ou mais pessoas ocupadas.",
    },
  },
  anthropicIndex2025: {
    publisher: "Anthropic",
    title:
      "Anthropic Economic Index report: Uneven geographic and enterprise AI adoption",
    url: "https://www.anthropic.com/research/anthropic-economic-index-september-2025-report",
    date: "2025-09-15",
    lang: "en",
    method: {
      en: "Claude.ai conversations from August 4 to 11, 2025.",
      "pt-br": "Conversas no Claude.ai de 4 a 11 de agosto de 2025.",
    },
  },
  teletimeBilly: {
    publisher: teletimeBilly.outlet,
    title: teletimeBilly.title,
    url: teletimeBilly.url,
    date: teletimeBilly.date,
    lang: teletimeBilly.lang,
  },
  mobileTimeBilly: {
    publisher: mobileTimeBilly.outlet,
    title: mobileTimeBilly.title,
    url: mobileTimeBilly.url,
    date: mobileTimeBilly.date,
    lang: mobileTimeBilly.lang,
  },
} satisfies Record<string, StatSource>;

export type SourceId = keyof typeof sources;

const sections: StatSection[] = [
  {
    id: "ai-agent-adoption",
    label: { en: "Adoption", "pt-br": "Adoção" },
    title: {
      en: "How many companies use AI agents in 2026?",
      "pt-br": "Quantas empresas usam agentes de IA em 2026?",
    },
    intro: {
      en: "Almost every company uses AI somewhere. Far fewer run agents at scale, and the share depends on who is asked: executives across a whole organization, or the developers doing the work.",
      "pt-br":
        "Quase toda empresa usa IA em algum lugar. Bem menos empresas rodam agentes em escala, e o número depende de quem responde: executivos falando da organização inteira ou os desenvolvedores que fazem o trabalho.",
    },
    stats: [
      {
        id: "mckinsey-ai-use",
        value: { en: "9 in 10", "pt-br": "9 em 10" },
        text: {
          en: "McKinsey's 2026 State of AI survey found that nearly nine in ten respondents report regular use of AI in at least one business function.",
          "pt-br":
            "A pesquisa State of AI 2026 da McKinsey mostra que quase nove em cada dez respondentes relatam uso regular de IA em pelo menos uma função de negócio.",
        },
        source: "mckinsey2026",
      },
      {
        id: "mckinsey-agents-scaling",
        value: { en: "2 in 10", "pt-br": "2 em 10" },
        text: {
          en: "About two in ten respondents to McKinsey's 2026 State of AI survey say their organization has reached the scaling phase with AI agents.",
          "pt-br":
            "Cerca de dois em cada dez respondentes da pesquisa State of AI 2026 da McKinsey dizem que sua organização chegou à fase de escala com agentes de IA.",
        },
        source: "mckinsey2026",
      },
      {
        id: "mckinsey-agents-large-companies",
        value: "40%",
        text: {
          en: "At larger organizations, the share scaling AI agents in one or more functions rose from 27% to 40% in a year, while smaller organizations stayed flat at 22% (McKinsey, State of AI 2026).",
          "pt-br":
            "Nas organizações maiores, a parcela que escala agentes de IA em uma ou mais funções subiu de 27% para 40% em um ano, enquanto nas menores ficou estável em 22% (McKinsey, State of AI 2026).",
        },
        source: "mckinsey2026",
      },
      {
        id: "stanford-agents-by-function",
        value: "<10%",
        text: {
          en: "Stanford's 2026 AI Index reports that AI agent deployment was in the single digits across nearly all business functions in 2025.",
          "pt-br":
            "O AI Index 2026 de Stanford registra que a implantação de agentes de IA ficou abaixo de 10% em quase todas as funções de negócio em 2025.",
        },
        source: "aiIndex2026Economy",
      },
      {
        id: "stack-overflow-agents-at-work",
        value: "26%",
        text: {
          en: "The 2026 Stack Overflow Developer Survey found that 26.2% of developers use AI agents or automated workflows at work.",
          "pt-br":
            "A Stack Overflow Developer Survey 2026 mostra que 26,2% dos desenvolvedores usam agentes de IA ou fluxos automatizados no trabalho.",
        },
        source: "stackOverflow2026",
      },
    ],
  },
  {
    id: "ai-agents-in-production",
    label: { en: "In production", "pt-br": "Em produção" },
    title: {
      en: "How many AI agents reach production?",
      "pt-br": "Quantos agentes de IA chegam à produção?",
    },
    intro: {
      en: "Among teams that build agents, most now ship them. What holds the rest back is quality, not cost.",
      "pt-br":
        "Entre os times que constroem agentes, a maioria já coloca em produção. O que segura o resto é a qualidade, não o custo.",
    },
    stats: [
      {
        id: "langchain-agents-in-production",
        value: "57%",
        text: {
          en: "LangChain's State of Agent Engineering survey found that 57.3% of 1,340 professionals have AI agents running in production.",
          "pt-br":
            "A pesquisa State of Agent Engineering da LangChain mostra que 57,3% de 1.340 profissionais têm agentes de IA rodando em produção.",
        },
        source: "langchain2025",
      },
      {
        id: "langchain-large-companies",
        value: "67%",
        text: {
          en: "Among organizations with more than 10,000 employees, 67% had AI agents in production (LangChain, State of Agent Engineering, 2025).",
          "pt-br":
            "Entre organizações com mais de 10 mil funcionários, 67% tinham agentes de IA em produção (LangChain, State of Agent Engineering, 2025).",
        },
        source: "langchain2025",
      },
      {
        id: "langchain-quality-barrier",
        value: "32%",
        text: {
          en: "Quality is the top barrier to putting AI agents in production, cited by 32% of respondents, ahead of latency at 20% (LangChain, State of Agent Engineering, 2025).",
          "pt-br":
            "Qualidade é a principal barreira para colocar agentes de IA em produção, citada por 32% dos respondentes, à frente da latência, com 20% (LangChain, State of Agent Engineering, 2025).",
        },
        source: "langchain2025",
      },
      {
        id: "langchain-observability",
        value: "89%",
        text: {
          en: "Nearly 89% of teams have implemented observability for their AI agents, while 52% run evals (LangChain, State of Agent Engineering, 2025).",
          "pt-br":
            "Quase 89% dos times implementaram observabilidade nos seus agentes de IA, enquanto 52% rodam avaliações, as evals (LangChain, State of Agent Engineering, 2025).",
        },
        source: "langchain2025",
      },
      {
        id: "langchain-top-use-case",
        value: { en: "26.5%", "pt-br": "26,5%" },
        text: {
          en: "Customer service is the most common AI agent use case, at 26.5%, followed by research and data analysis at 24.4% (LangChain, State of Agent Engineering, 2025).",
          "pt-br":
            "Atendimento ao cliente é o caso de uso mais comum de agentes de IA, com 26,5%, seguido de pesquisa e análise de dados, com 24,4% (LangChain, State of Agent Engineering, 2025).",
        },
        source: "langchain2025",
      },
      {
        id: "stanford-osworld",
        value: { en: "66.3%", "pt-br": "66,3%" },
        text: {
          en: "On OSWorld, a benchmark of computer tasks, AI agents' accuracy rose from about 5% in 2024 to 66.3% in 2025, still below the human baseline of 72.35% (Stanford, 2026 AI Index).",
          "pt-br":
            "No OSWorld, um benchmark de tarefas no computador, a acurácia dos agentes de IA subiu de cerca de 5% em 2024 para 66,3% em 2025, ainda abaixo da referência humana de 72,35% (Stanford, AI Index 2026).",
        },
        source: "aiIndex2026",
      },
      {
        id: "gartner-canceled-projects",
        value: "40%+",
        text: {
          en: "Gartner predicted in June 2025 that over 40% of agentic AI projects will be canceled by the end of 2027.",
          "pt-br":
            "A Gartner previu, em junho de 2025, que mais de 40% dos projetos de IA agêntica serão cancelados até o fim de 2027.",
        },
        source: "gartner2025",
      },
    ],
  },
  {
    id: "results-at-algar",
    label: { en: "At Algar", "pt-br": "Na Algar" },
    own: true,
    title: {
      en: "What generative AI delivered in production at Algar",
      "pt-br": "O que a IA generativa entregou em produção na Algar",
    },
    intro: {
      en: "Results of projects I worked on as an AI Engineer at Algar, a Brazilian telecom group. Billy's numbers were also reported by the trade press.",
      "pt-br":
        "Resultados de projetos em que trabalhei como Engenheiro de IA na Algar, grupo brasileiro de telecom. Os números do Billy também saíram na imprensa especializada.",
    },
    stats: [
      {
        id: "algar-billy-review-time",
        value: "96%",
        text: {
          en: "Billy, the generative AI app Davi Lacerda worked on at Algar, cut invoice analysis time by 96%, from 31 minutes to 1 minute per invoice.",
          "pt-br":
            "O Billy, aplicação de IA generativa em que Davi Lacerda trabalhou na Algar, reduziu em 96% o tempo de análise de faturas, de 31 minutos para 1 minuto por fatura.",
        },
        source: "teletimeBilly",
        project: "billy",
      },
      {
        id: "algar-billy-savings",
        value: { en: "R$ 3M", "pt-br": "R$ 3 mi" },
        text: {
          en: "Billy saved Algar R$ 3 million in the operating costs of reviewing and issuing invoices in less than a year, Mobile Time reported in February 2025.",
          "pt-br":
            "O Billy economizou R$ 3 milhões para a Algar em custos operacionais de revisão e emissão de faturas em menos de um ano, segundo o Mobile Time, em fevereiro de 2025.",
        },
        source: "mobileTimeBilly",
        project: "billy",
      },
      {
        id: "algar-bud-workload",
        value: "40%",
        text: {
          en: "Bud, an AI agent in Microsoft Teams for SAP reports and actions that Davi Lacerda built at Algar, cut the projects team's workload by 40%.",
          "pt-br":
            "O Bud, agente de IA no Microsoft Teams para relatórios e ações no SAP que Davi Lacerda construiu na Algar, reduziu em 40% a carga de trabalho da área de projetos.",
        },
        project: "bud",
      },
      {
        id: "algar-genai-costs",
        value: "40%+",
        text: {
          en: "A move to newer generative AI models that Davi Lacerda led across several projects at Algar cut costs by more than 40% with no loss in performance or accuracy.",
          "pt-br":
            "A migração para modelos de IA generativa mais novos que Davi Lacerda liderou em vários projetos da Algar cortou mais de 40% dos custos, sem perda de desempenho nem de acurácia.",
        },
        project: "genai-finops",
      },
    ],
  },
  {
    id: "developers-and-ai-coding-tools",
    label: { en: "Developers", "pt-br": "Desenvolvedores" },
    title: {
      en: "How many developers use AI coding tools?",
      "pt-br": "Quantos desenvolvedores usam IA para programar?",
    },
    intro: {
      en: "Use is close to universal and mostly daily. Trust is not: developers lean on AI where they can check the result.",
      "pt-br":
        "O uso é quase universal e, na maioria, diário. A confiança não: os desenvolvedores se apoiam na IA onde conseguem conferir o resultado.",
    },
    stats: [
      {
        id: "stack-overflow-ai-tools",
        value: "83%",
        text: {
          en: "The 2026 Stack Overflow Developer Survey found that 83% of developers use at least one AI tool at work.",
          "pt-br":
            "A Stack Overflow Developer Survey 2026 mostra que 83% dos desenvolvedores usam pelo menos uma ferramenta de IA no trabalho.",
        },
        source: "stackOverflow2026",
      },
      {
        id: "stack-overflow-daily-use",
        value: "77%",
        text: {
          en: "Of the developers who use AI tools at work, 77% use them every day (Stack Overflow Developer Survey, 2026).",
          "pt-br":
            "Dos desenvolvedores que usam ferramentas de IA no trabalho, 77% usam todos os dias (Stack Overflow Developer Survey, 2026).",
        },
        source: "stackOverflow2026",
      },
      {
        id: "stack-overflow-trust",
        value: { en: "6.6%", "pt-br": "6,6%" },
        text: {
          en: "Only 6.6% of developers trust AI output for important work decisions, while 48% trust it when they can easily verify it (Stack Overflow Developer Survey, 2026).",
          "pt-br":
            "Só 6,6% dos desenvolvedores confiam no resultado da IA para decisões importantes de trabalho, enquanto 48% confiam quando conseguem verificar com facilidade (Stack Overflow Developer Survey, 2026).",
        },
        source: "stackOverflow2026",
      },
      {
        id: "stack-overflow-coding-agents",
        value: "66%",
        text: {
          en: "The coding agents developers use most are Claude Code, at 66%, and GitHub Copilot, at 59% (Stack Overflow Developer Survey, 2026).",
          "pt-br":
            "Os agentes de programação mais usados pelos desenvolvedores são o Claude Code, com 66%, e o GitHub Copilot, com 59% (Stack Overflow Developer Survey, 2026).",
        },
        source: "stackOverflow2026Results",
      },
      {
        id: "dora-ai-at-work",
        value: "90%",
        text: {
          en: "The 2025 DORA report found that 90% of nearly 5,000 technology professionals use AI at work.",
          "pt-br":
            "O relatório DORA 2025 mostra que 90% de quase 5 mil profissionais de tecnologia usam IA no trabalho.",
        },
        source: "dora2025",
      },
      {
        id: "dora-trust-in-code",
        value: "30%",
        text: {
          en: "In the 2025 DORA report, 30% of technology professionals report little or no trust in the code generated by AI.",
          "pt-br":
            "No relatório DORA 2025, 30% dos profissionais de tecnologia dizem confiar pouco ou nada no código gerado por IA.",
        },
        source: "dora2025",
      },
    ],
  },
  {
    id: "mcp-adoption",
    label: { en: "MCP", "pt-br": "MCP" },
    title: {
      en: "Model Context Protocol (MCP) adoption statistics",
      "pt-br": "Estatísticas de adoção do Model Context Protocol (MCP)",
    },
    intro: {
      en: "MCP is the open protocol that connects AI agents to tools and data. These are the figures Anthropic published when it donated the protocol to the Agentic AI Foundation.",
      "pt-br":
        "O MCP é o protocolo aberto que conecta agentes de IA a ferramentas e dados. Estes são os números que a Anthropic publicou ao doar o protocolo para a Agentic AI Foundation.",
    },
    stats: [
      {
        id: "mcp-sdk-downloads",
        value: { en: "97M+", "pt-br": "97 mi+" },
        text: {
          en: "The Model Context Protocol SDKs had more than 97 million monthly downloads across Python and TypeScript, Anthropic said in December 2025.",
          "pt-br":
            "Os SDKs do Model Context Protocol somavam mais de 97 milhões de downloads mensais em Python e TypeScript, segundo a Anthropic, em dezembro de 2025.",
        },
        source: "anthropicMcp2025",
      },
      {
        id: "mcp-public-servers",
        value: { en: "10,000+", "pt-br": "10 mil+" },
        text: {
          en: "There were more than 10,000 active public MCP servers in December 2025, according to Anthropic.",
          "pt-br":
            "Havia mais de 10 mil servidores MCP públicos ativos em dezembro de 2025, segundo a Anthropic.",
        },
        source: "anthropicMcp2025",
      },
    ],
  },
  {
    id: "generative-ai-roi",
    label: { en: "ROI", "pt-br": "ROI" },
    title: {
      en: "Does generative AI pay off? ROI and investment statistics",
      "pt-br":
        "IA generativa dá retorno? Estatísticas de ROI e de investimento",
    },
    intro: {
      en: "Investment more than doubled in 2025. Measured gains are clear inside narrow tasks and still rare on the bottom line.",
      "pt-br":
        "O investimento mais que dobrou em 2025. Os ganhos medidos são claros dentro de tarefas específicas e ainda raros no resultado das empresas.",
    },
    stats: [
      {
        id: "mckinsey-ebit-impact",
        value: "37%",
        text: {
          en: "McKinsey's 2026 State of AI survey found that 37% of respondents attribute at least some EBIT impact to their use of AI, about the same share as a year earlier.",
          "pt-br":
            "A pesquisa State of AI 2026 da McKinsey mostra que 37% dos respondentes atribuem algum impacto no EBIT ao uso de IA, parcela parecida com a do ano anterior.",
        },
        source: "mckinsey2026",
      },
      {
        id: "mckinsey-scaling-ai",
        value: "44%",
        text: {
          en: "In McKinsey's 2026 State of AI survey, 44% of respondents say AI is scaling across their enterprise, up from 38% a year earlier.",
          "pt-br":
            "Na pesquisa State of AI 2026 da McKinsey, 44% dos respondentes dizem que a IA está ganhando escala em toda a empresa, contra 38% um ano antes.",
        },
        source: "mckinsey2026",
      },
      {
        id: "stanford-productivity",
        value: "26%",
        text: {
          en: "Stanford's 2026 AI Index cites studies with productivity gains of 14% to 15% in customer support, 26% in software development and 50% in marketing output.",
          "pt-br":
            "O AI Index 2026 de Stanford cita estudos com ganhos de produtividade de 14% a 15% no suporte ao cliente, 26% no desenvolvimento de software e 50% na produção de marketing.",
        },
        source: "aiIndex2026Economy",
      },
      {
        id: "stanford-private-investment",
        value: { en: "$344.7B", "pt-br": "US$ 344,7 bi" },
        text: {
          en: "Global private investment in AI reached $344.7 billion in 2025, according to Stanford's 2026 AI Index.",
          "pt-br":
            "O investimento privado global em IA chegou a US$ 344,7 bilhões em 2025, segundo o AI Index 2026 de Stanford.",
        },
        source: "aiIndex2026Economy",
      },
      {
        id: "stanford-generative-ai-investment",
        value: { en: "$170.9B", "pt-br": "US$ 170,9 bi" },
        text: {
          en: "Generative AI drew $170.9 billion of private investment in 2025, nearly half of all private AI funding (Stanford, 2026 AI Index).",
          "pt-br":
            "A IA generativa atraiu US$ 170,9 bilhões de investimento privado em 2025, quase metade de todo o investimento privado em IA (Stanford, AI Index 2026).",
        },
        source: "aiIndex2026Economy",
      },
    ],
  },
  {
    id: "generative-ai-in-telecom",
    label: { en: "Telecom", "pt-br": "Telecom" },
    title: {
      en: "Generative AI in telecom statistics",
      "pt-br": "Estatísticas de IA generativa em telecom",
    },
    intro: {
      en: "Telecom is where I work. In NVIDIA's yearly survey of the industry, the returns from AI show up mostly in networks and customer service.",
      "pt-br":
        "Telecom é onde eu trabalho. Na pesquisa anual da NVIDIA com o setor, o retorno da IA aparece principalmente em redes e atendimento.",
    },
    stats: [
      {
        id: "nvidia-telecom-revenue-and-costs",
        value: "90%",
        text: {
          en: "NVIDIA's 2026 State of AI in Telecommunications survey found that 90% of respondents say AI is helping increase annual revenue and reduce costs.",
          "pt-br":
            "A pesquisa State of AI in Telecommunications 2026 da NVIDIA mostra que 90% dos respondentes dizem que a IA ajuda a aumentar a receita anual e a reduzir custos.",
        },
        source: "nvidiaTelco2026",
      },
      {
        id: "nvidia-telecom-generative-ai",
        value: "60%",
        text: {
          en: "In telecom, 60% of organizations are using or assessing generative AI, up from 49% in 2024 (NVIDIA, State of AI in Telecommunications, 2026).",
          "pt-br":
            "Em telecom, 60% das organizações usam ou avaliam IA generativa, contra 49% em 2024 (NVIDIA, State of AI in Telecommunications, 2026).",
        },
        source: "nvidiaTelco2026",
      },
      {
        id: "nvidia-telecom-budgets",
        value: "89%",
        text: {
          en: "NVIDIA's 2026 State of AI in Telecommunications survey found that 89% of telcos plan to raise AI spending in 2026, up from 65% a year earlier.",
          "pt-br":
            "A pesquisa State of AI in Telecommunications 2026 da NVIDIA mostra que 89% das empresas de telecom planejam aumentar o gasto com IA em 2026, contra 65% um ano antes.",
        },
        source: "nvidiaTelco2026",
      },
      {
        id: "nvidia-telecom-roi-use-cases",
        value: "50%",
        text: {
          en: "The AI use cases with the best return in telecom are autonomous networks (50%), customer service (41%) and internal process optimization (33%), according to NVIDIA's 2026 survey.",
          "pt-br":
            "Os casos de uso de IA com melhor retorno em telecom são redes autônomas (50%), atendimento ao cliente (41%) e otimização de processos internos (33%), segundo a pesquisa de 2026 da NVIDIA.",
        },
        source: "nvidiaTelco2026",
      },
    ],
  },
  {
    id: "ai-in-brazil",
    label: { en: "Brazil", "pt-br": "Brasil" },
    title: {
      en: "AI adoption in Brazil statistics",
      "pt-br": "Estatísticas de adoção de IA no Brasil",
    },
    intro: {
      en: "Brazil's official surveys measure different populations, so the numbers differ: every company with ten or more employees (Cetic.br), larger industrial companies (IBGE) and internet users (Cetic.br).",
      "pt-br":
        "As pesquisas oficiais do Brasil medem populações diferentes, por isso os números diferem: todas as empresas com dez ou mais pessoas ocupadas (Cetic.br), as indústrias de maior porte (IBGE) e os usuários de internet (Cetic.br).",
    },
    stats: [
      {
        id: "cetic-companies-using-ai",
        value: "17%",
        text: {
          en: "TIC Empresas 2025, by Cetic.br, found that 17% of Brazilian companies used AI in 2025, up from 13% in 2024.",
          "pt-br":
            "A TIC Empresas 2025, do Cetic.br, mostra que 17% das empresas brasileiras usaram IA em 2025, contra 13% em 2024.",
        },
        source: "ceticEmpresas2025",
      },
      {
        id: "cetic-large-companies",
        value: "50%",
        text: {
          en: "Among large Brazilian companies, with more than 250 employees, AI use rose from 38% to 50% in a year; among small ones, from 10% to 15% (Cetic.br, TIC Empresas 2025).",
          "pt-br":
            "Entre as grandes empresas brasileiras, com mais de 250 funcionários, o uso de IA subiu de 38% para 50% em um ano; entre as pequenas, de 10% para 15% (Cetic.br, TIC Empresas 2025).",
        },
        source: "ceticEmpresas2025",
      },
      {
        id: "cetic-ready-made-ai",
        value: "80%",
        text: {
          en: "Of the Brazilian companies that use AI, 80% bought ready-to-use software or systems, and in-house AI development at large companies rose from 24% to 37% (Cetic.br, TIC Empresas 2025).",
          "pt-br":
            "Das empresas brasileiras que usam IA, 80% adquiriram softwares ou sistemas prontos para uso, e o desenvolvimento interno de IA nas grandes empresas subiu de 24% para 37% (Cetic.br, TIC Empresas 2025).",
        },
        source: "ceticEmpresas2025",
      },
      {
        id: "ibge-industrial-companies",
        value: { en: "41.9%", "pt-br": "41,9%" },
        text: {
          en: "IBGE's PINTEC Semestral found that 41.9% of Brazilian industrial companies with 100 or more employees used AI in 2024, up from 16.9% in 2022.",
          "pt-br":
            "A PINTEC Semestral, do IBGE, mostra que 41,9% das empresas industriais brasileiras com 100 ou mais pessoas ocupadas usaram IA em 2024, contra 16,9% em 2022.",
        },
        source: "ibgePintec2024",
      },
      {
        id: "cetic-generative-ai-users",
        value: "32%",
        text: {
          en: "TIC Domicílios 2025, by Cetic.br, found that 32% of internet users in Brazil, about 50 million people, use generative AI.",
          "pt-br":
            "A TIC Domicílios 2025, do Cetic.br, mostra que 32% dos usuários de internet no Brasil, cerca de 50 milhões de pessoas, usam IA generativa.",
        },
        source: "ceticDomicilios2025",
      },
      {
        id: "cetic-generative-ai-by-class",
        value: "69%",
        text: {
          en: "Generative AI use in Brazil reaches 69% of internet users in class A and 16% in classes D and E (Cetic.br, TIC Domicílios 2025).",
          "pt-br":
            "O uso de IA generativa no Brasil chega a 69% dos usuários de internet da classe A e a 16% nas classes D e E (Cetic.br, TIC Domicílios 2025).",
        },
        source: "ceticDomicilios2025",
      },
      {
        id: "anthropic-brazil-claude-usage",
        value: { en: "3.7%", "pt-br": "3,7%" },
        text: {
          en: "Brazil accounted for 3.7% of global Claude.ai usage in August 2025, after the United States at 21.6% and India at 7.2% (Anthropic Economic Index, September 2025).",
          "pt-br":
            "O Brasil respondeu por 3,7% do uso global do Claude.ai em agosto de 2025, atrás dos Estados Unidos, com 21,6%, e da Índia, com 7,2% (Anthropic Economic Index, setembro de 2025).",
        },
        source: "anthropicIndex2025",
      },
    ],
  },
];

export const statistics = {
  /** The day every source was last opened and checked ("YYYY-MM-DD"). */
  updated: "2026-11-10",
  /** The day the page was first published. */
  published: "2026-11-10",
  sections,
  sources: sources as Record<SourceId, StatSource>,
} as const;

/** The year in the page's title: the year of the last update. */
export function statisticsYear(): string {
  return statistics.updated.slice(0, 4);
}

/** A statistic's source, or undefined for a number only the profile states. */
export function getStatSource(stat: Statistic): StatSource | undefined {
  return stat.source ? statistics.sources[stat.source] : undefined;
}

/** Every statistic, in page order. */
export function allStatistics(): Statistic[] {
  return statistics.sections.flatMap((section) => section.stats);
}

/** The sources cited on the page, once each, in order of first use. */
export function citedSources(): StatSource[] {
  const ids = new Set<SourceId>();
  for (const stat of allStatistics()) if (stat.source) ids.add(stat.source);
  return [...ids].map((id) => statistics.sources[id]);
}
