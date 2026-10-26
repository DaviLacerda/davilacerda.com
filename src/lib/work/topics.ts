/**
 * Work topics: the questions the Work tab's guided assistant can answer, and
 * the keyword matcher that routes free text to one of them.
 *
 * Each topic is a real, statically generated page at `/[lang]/work/<id>`
 * (same English slug in every locale). The visible copy for a topic (chip
 * label, question, title, description) lives in the dictionaries under
 * `chat.topics`; the facts come from `src/content/profile.ts`.
 *
 * Dependency-free on purpose: imported by `src/proxy.ts` (the no-JS form
 * redirect), by the client composer and by the server pages.
 */

export const topicIds = [
  "experience",
  "sales-copilot",
  "certifications",
  "skills",
  "education",
  "faq",
  "contact",
] as const;

export type TopicId = (typeof topicIds)[number];

export function isTopicId(value: string | undefined): value is TopicId {
  return topicIds.includes(value as TopicId);
}

/**
 * Keywords per topic, in English and Portuguese, already folded (lowercase,
 * no accents). A keyword may be a phrase. The weight says how strongly it
 * points at the topic: 3 = names the topic, 2 = clearly about it, 1 = a hint.
 */
const keywords: Record<TopicId, [string, number][]> = {
  experience: [
    ["experience", 3],
    ["experiencia", 3],
    ["work history", 3],
    ["career", 3],
    ["carreira", 3],
    ["algar", 3],
    ["brain", 3],
    ["internship", 3],
    ["intern", 2],
    ["estagio", 3],
    ["estagiario", 3],
    ["worked", 2],
    ["trabalhou", 2],
    ["trabalha", 2],
    ["job", 2],
    ["jobs", 2],
    ["emprego", 2],
    ["company", 2],
    ["companies", 2],
    ["empresa", 2],
    ["empresas", 2],
    ["employer", 2],
    ["resume", 2],
    ["curriculo", 2],
    ["cv", 2],
    ["role", 1],
    ["cargo", 1],
    ["position", 1],
    ["background", 1],
    ["timeline", 1],
    ["billy", 4],
    ["bud", 4],
    ["invoice", 2],
    ["invoices", 2],
    ["fatura", 2],
    ["faturas", 2],
    ["sap", 2],
    ["finops", 2],
    ["costs", 1],
    ["custos", 1],
    ["work", 1],
    ["trabalho", 1],
    ["years", 1],
    ["anos", 1],
  ],
  "sales-copilot": [
    ["sales copilot", 4],
    ["copilot", 3],
    ["copiloto", 3],
    ["sales", 2],
    ["vendas", 2],
    ["award", 3],
    ["awards", 3],
    ["premio", 3],
    ["premiado", 3],
    ["prize", 3],
    ["conecta", 3],
    ["latam", 3],
    ["america latina", 2],
    ["best ai project", 4],
    ["melhor projeto", 4],
    ["project", 1],
    ["projects", 1],
    ["projeto", 1],
    ["projetos", 1],
    ["case study", 2],
    ["built", 1],
    ["construiu", 1],
    ["flagship", 2],
  ],
  certifications: [
    ["certification", 3],
    ["certifications", 3],
    ["certified", 3],
    ["certificate", 3],
    ["certificates", 3],
    ["cert", 2],
    ["certs", 2],
    ["certificacao", 3],
    ["certificacoes", 3],
    ["certificado", 3],
    ["certificados", 3],
    ["credential", 3],
    ["credentials", 3],
    ["credencial", 3],
    ["credenciais", 3],
    ["microsoft", 2],
    ["expert", 2],
    ["associate", 2],
    ["credential id", 4],
    ["exam", 2],
    ["prova", 1],
    ["course", 2],
    ["courses", 2],
    ["curso", 2],
    ["cursos", 2],
    ["deeplearning ai", 2],
    ["microsoft learn", 3],
    ["verify", 2],
    ["verificar", 2],
    ["badge", 1],
  ],
  skills: [
    ["skills", 3],
    ["skill", 3],
    ["stack", 3],
    ["tech stack", 4],
    ["habilidades", 3],
    ["habilidade", 3],
    ["competencias", 3],
    ["technologies", 3],
    ["technology", 2],
    ["tecnologias", 3],
    ["tecnologia", 2],
    ["tools", 2],
    ["ferramentas", 2],
    ["frameworks", 2],
    ["framework", 2],
    ["programming", 2],
    ["programacao", 2],
    ["python", 2],
    ["typescript", 2],
    ["javascript", 2],
    ["react", 2],
    ["next js", 2],
    ["nextjs", 2],
    ["node", 1],
    ["java", 1],
    ["azure", 2],
    ["ai sdk", 2],
    ["mastra", 2],
    ["langgraph", 2],
    ["langchain", 2],
    ["crewai", 2],
    ["claude code", 3],
    ["github copilot", 4],
    ["llm", 2],
    ["llms", 2],
    ["rag", 2],
    ["agents", 1],
    ["agentes", 1],
    ["mcp", 2],
    ["machine learning", 2],
    ["backend", 2],
    ["back end", 2],
    ["back-end", 2],
    ["frontend", 2],
    ["front end", 2],
    ["front-end", 2],
    ["full stack", 2],
    ["full-stack", 2],
    ["cloud", 1],
    ["know", 1],
    ["sabe", 1],
    ["uses", 1],
    ["usa", 1],
  ],
  education: [
    ["education", 3],
    ["educacao", 3],
    ["formacao", 3],
    ["studied", 3],
    ["study", 2],
    ["estudou", 3],
    ["estuda", 2],
    ["university", 3],
    ["universidade", 3],
    ["college", 3],
    ["faculdade", 3],
    ["degree", 3],
    ["graduacao", 3],
    ["graduated", 2],
    ["formou", 2],
    ["bachelor", 3],
    ["bacharelado", 3],
    ["ufu", 3],
    ["computer science", 3],
    ["ciencia da computacao", 3],
    ["thesis", 3],
    ["tcc", 3],
    ["coursework", 3],
    ["disciplinas", 3],
    ["school", 2],
    ["escola", 2],
    ["languages", 1],
    ["idiomas", 2],
    ["idioma", 2],
    ["english", 2],
    ["ingles", 2],
    ["portuguese", 2],
    ["portugues", 2],
    ["speak", 2],
    ["fala", 1],
  ],
  faq: [
    ["faq", 4],
    ["questions", 2],
    ["question", 1],
    ["perguntas", 2],
    ["duvidas", 2],
    ["frequently", 2],
    ["frequentes", 2],
    ["what does davi do", 4],
    ["o que davi faz", 4],
    ["o que o davi faz", 4],
    ["who is davi", 3],
    ["quem e davi", 3],
    ["quem e o davi", 3],
    ["remote", 2],
    ["remoto", 2],
    ["hybrid", 2],
    ["hibrido", 2],
    ["relocate", 2],
    ["where is", 1],
    ["based", 2],
    ["location", 2],
    ["localizacao", 2],
    ["live", 1],
    ["mora", 2],
    ["onde mora", 3],
    ["uberlandia", 2],
    ["brazil", 1],
    ["brasil", 1],
  ],
  contact: [
    ["contact", 4],
    ["contato", 4],
    ["contatar", 3],
    ["email", 3],
    ["e-mail", 3],
    ["mail", 2],
    ["reach", 3],
    ["get in touch", 4],
    ["talk", 2],
    ["falar", 2],
    ["falo", 2],
    ["conversar", 2],
    ["message", 2],
    ["mensagem", 2],
    ["linkedin", 3],
    ["github", 2],
    ["instagram", 2],
    ["discord", 2],
    ["call", 1],
    ["meeting", 2],
    ["reuniao", 2],
    ["schedule", 1],
    ["agendar", 1],
    // Questions about roles land here: Davi is open to a conversation.
    ["open to", 3],
    ["aberto a", 3],
    ["hiring", 2],
    ["hire", 2],
    ["contratar", 2],
    ["available", 2],
    ["availability", 2],
    ["disponivel", 2],
    ["disponibilidade", 2],
    ["roles", 2],
    ["vagas", 2],
    ["vaga", 2],
    ["opportunities", 2],
    ["oportunidades", 2],
  ],
};

/** Ties go to the topic listed first here (the most common questions). */
const priority: TopicId[] = [
  "experience",
  "sales-copilot",
  "contact",
  "skills",
  "certifications",
  "education",
  "faq",
];

/** Lowercases, strips accents and collapses everything but letters, digits and "-" to single spaces. */
export function foldQuery(text: string): string {
  return ` ${text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .trim()} `;
}

/**
 * Best topic for a free-text question, or null when nothing matches. Keywords
 * match whole words (or whole phrases), so "rag" does not match "drag".
 *
 * @example matchTopic("Where did he work before Algar?") // "experience"
 * @example matchTopic("Quais certificações ele tem?") // "certifications"
 */
export function matchTopic(text: string): TopicId | null {
  const folded = foldQuery(text);
  if (folded.trim().length < 2) return null;
  let best: TopicId | null = null;
  let bestScore = 0;
  for (const id of priority) {
    let score = 0;
    for (const [keyword, weight] of keywords[id]) {
      if (folded.includes(` ${keyword} `)) score += weight;
    }
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}
