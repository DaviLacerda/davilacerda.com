import type { Dictionary } from "./en";

/** Brazilian Portuguese UI dictionary. Same shape as `en` (type-checked). */
export const ptBr: Dictionary = {
  meta: {
    siteName: "Davi Lacerda",
    defaultTitle: "Davi Lacerda | Engenheiro de IA",
    description:
      "Davi Lacerda é Engenheiro de IA em Uberlândia e constrói produtos de IA Generativa e agentes de IA de ponta a ponta. Principal desenvolvedor do Sales Copilot da Algar, Melhor Projeto de IA da América Latina.",
    work: {
      title: "Engenheiro de IA",
      description:
        "Pergunte sobre o trabalho de Davi Lacerda: experiência na Algar, o premiado Sales Copilot, certificações Microsoft Expert, habilidades, formação e contato.",
    },
    personal: {
      title: "Pessoal",
      description:
        "Textos, projetos pessoais e os cantos da internet onde você encontra Davi Lacerda.",
    },
    blog: {
      title: "Blog",
      description:
        "Notas sobre engenharia de IA, LLMs, agentes e construção de software, por Davi Lacerda.",
    },
    ask: {
      title: "Sem resposta escrita",
      description:
        "O assistente da aba Trabalho não tem uma resposta escrita para essa pergunta. Escolha um dos temas que ele responde.",
    },
  },

  a11y: {
    skipToContent: "Pular para o conteúdo",
    primaryNav: "Principal",
    socialNav: "Redes sociais",
    home: "Davi Lacerda, página inicial",
    opensInNewTab: "abre em uma nova aba",
    breadcrumb: "Trilha de navegação",
  },

  nav: {
    work: "Trabalho",
    personal: "Pessoal",
    blog: "Blog",
    contact: "Contato",
  },

  locale: {
    label: "Idioma",
    switchTo: "Read in English",
  },

  theme: {
    toggle: "Alternar tema de cores",
    switchToLight: "Mudar para o tema claro",
    switchToDark: "Mudar para o tema escuro",
  },

  chat: {
    home: {
      lead: "{role} na {company}, em {place}, construindo produtos de IA generativa e agentes.",
      highlightsTitle: "Destaques",
      role: "{role} na {company}",
      award: "{issuer}, com o {project}",
      experts: "{count}× Microsoft Certified Expert",
      expertsDetail: "IA multiagente e agêntica",
    },
    composer: {
      label: "Faça uma pergunta sobre o trabalho do Davi",
      placeholder: "Pergunte sobre o trabalho do Davi",
      submit: "Perguntar",
      suggestions: "Sugestões de perguntas",
      bestMatch: "Tema mais próximo: {topic}",
      noMatch: "Nenhum tema ainda. Tente uma sugestão.",
      note: "Respostas pré-escritas a partir do perfil verificado, sem modelo ao vivo.",
      fallbackTitle: "Ainda não há resposta escrita para isso.",
      fallbackBody:
        "Tente uma sugestão abaixo ou escreva para o Davi em {email}.",
      dismiss: "Fechar",
    },
    turn: {
      you: "Você perguntou",
      askNext: "Pergunte outra coisa",
    },
    topics: {
      experience: {
        chip: "Experiência",
        question: "Onde o Davi já trabalhou?",
        title: "Experiência profissional",
        metaTitle: "Experiência profissional de Davi Lacerda",
        description:
          "Davi Lacerda é Engenheiro de IA na Algar desde agosto de 2024, depois de um estágio de pesquisa e desenvolvimento no Brain. Datas, escopo e o que ele entregou.",
        summary: "A função na Algar e o estágio antes dela.",
        intro:
          "{role} na {company} desde {since}, depois de um estágio no {prevCompany}.",
      },
      "sales-copilot": {
        chip: "Sales Copilot",
        question: "O que é o Sales Copilot?",
        title: "Sales Copilot",
        metaTitle: "Sales Copilot, Melhor Projeto de IA da América Latina",
        description:
          "O copiloto de IA que Davi Lacerda construiu de ponta a ponta para os times de vendas da Algar, eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam.",
        summary: "O copiloto premiado que ele construiu de ponta a ponta.",
        intro:
          "Um copiloto de IA para os times de vendas da Algar, construído de ponta a ponta pelo Davi como principal desenvolvedor.",
      },
      certifications: {
        chip: "Certificações",
        question: "Quais certificações o Davi tem?",
        title: "Certificações",
        metaTitle: "Certificações Microsoft Expert de Davi Lacerda",
        description:
          "Davi Lacerda tem duas certificações Microsoft de nível Expert, em soluções de IA multiagente e arquitetura de IA agêntica, além de cursos de React.",
        summary: "Duas credenciais Microsoft Expert, e cursos.",
        intro:
          "Duas certificações Microsoft de nível Expert, em IA multiagente e agêntica.",
      },
      skills: {
        chip: "Habilidades",
        question: "Qual é o stack do Davi?",
        title: "Habilidades e stack",
        metaTitle: "Habilidades e stack de Davi Lacerda",
        description:
          "Com o que Davi Lacerda trabalha: LLMs e agentes, RAG, machine learning, back-end, front-end, cloud e entrega.",
        summary: "LLMs, agentes, RAG e todo o stack ao redor.",
        intro:
          "IA Generativa e agentes no Azure, em TypeScript e Python, com todo o stack ao redor.",
      },
      education: {
        chip: "Formação",
        question: "Onde o Davi estudou?",
        title: "Formação",
        metaTitle: "Formação de Davi Lacerda",
        description:
          "Davi Lacerda estudou Ciência da Computação na Universidade Federal de Uberlândia (UFU). Disciplinas, TCC e os idiomas em que ele trabalha.",
        summary: "Ciência da Computação na UFU, e idiomas.",
        intro:
          "Ciência da Computação na Universidade Federal de Uberlândia (UFU).",
      },
      faq: {
        chip: "Perguntas",
        question: "O que as pessoas costumam perguntar sobre o Davi?",
        title: "Perguntas frequentes",
        metaTitle: "Perguntas sobre Davi Lacerda",
        description:
          "Respostas curtas sobre Davi Lacerda: o que ele faz, se está aberto a vagas, o stack, o Sales Copilot, certificações, onde mora e formação.",
        summary: "Respostas curtas para o que recrutadores mais perguntam.",
        intro: "Respostas curtas para o que recrutadores mais perguntam.",
      },
      contact: {
        chip: "Contato",
        question: "Como falo com o Davi?",
        title: "Contato",
        metaTitle: "Fale com Davi Lacerda",
        description:
          "Davi Lacerda está aberto a vagas de Engenheiro de IA, presenciais ou híbridas em Uberlândia e remotas. Mande um e-mail ou encontre ele no LinkedIn.",
        summary: "E-mail, LinkedIn e disponibilidade.",
        intro:
          "Aberto a vagas de Engenheiro de IA. O e-mail é o jeito mais rápido de falar com ele.",
      },
    },
    answers: {
      experience: {
        lead: "{name} é {role} na {company} desde {since}. Antes, foi {prevRole} no {prevCompany}.",
        alsoAt: "Também na {company}",
      },
      salesCopilot: {
        award: "Prêmio",
        builtBy: "Construído de ponta a ponta",
        layers: {
          frontEnd: {
            title: "Front-end",
            body: "A interface usada pelos times de vendas da Algar.",
          },
          aiTools: {
            title: "Ferramentas de IA",
            body: "As ferramentas de IA que fazem o copiloto funcionar.",
          },
          backEnd: {
            title: "Back-end",
            body: "Os serviços que sustentam o copiloto.",
          },
        },
        company: "Empresa",
        year: "Ano do projeto",
        role: "Função",
        access: "Acesso",
      },
      certifications: {
        credentials: "Credenciais",
        issued: "Emitida em {date}",
        courses: "Cursos",
        course: "Curso",
        issuer: "Emissor",
        date: "Data",
      },
      education: {
        degree: "Grau",
        institution: "Instituição",
        location: "Local",
      },
      contact: {
        emailCta: "Mandar um e-mail",
        copyEmail: "Copiar e-mail",
        copied: "Copiado",
        elsewhere: "Em outros lugares",
        timezone: "Fuso horário",
      },
    },
  },

  work: {
    hero: {
      availability: "Aberto a vagas de Engenheiro de IA",
    },
    sections: {
      about: { title: "Sobre" },
      highlights: { title: "Destaques" },
      experience: { title: "Experiência" },
      projects: { title: "Projetos selecionados" },
      skills: { title: "Habilidades" },
      certifications: { title: "Certificações e cursos" },
      education: { title: "Formação" },
      achievements: { title: "Prêmios e conquistas" },
      faq: { title: "Perguntas frequentes" },
      contact: {
        title: "Contato",
        description:
          "Davi está aberto a vagas de Engenheiro de IA. O e-mail é a melhor forma de falar com ele.",
      },
    },
    labels: {
      award: "Prêmio",
      mainDeveloper: "Principal desenvolvedor",
      expertLevel: "Nível Expert",
      courses: "Cursos",
      stack: "Stack",
      highlights: "Destaques",
      role: "Função",
      location: "Local",
      viewProject: "Ver projeto",
      sourceCode: "Código-fonte",
      liveSite: "Site no ar",
      privateProject: "Privado",
      featured: "Destaque",
      stars: "{count} estrelas",
      issuedBy: "Emitido por {issuer}",
      viewCredential: "Ver credencial",
      coursework: "Disciplinas relevantes",
      thesis: "TCC",
      languagesSpoken: "Idiomas",
    },
    keywords: [
      "Engenheiro de IA",
      "Engenheiro de IA Uberlândia",
      "Engenheiro de IA Brasil",
      "Contratar Engenheiro de IA",
      "Desenvolvedor de agentes de IA",
      "Agentes de IA",
      "IA multiagente",
      "IA agêntica",
      "Azure AI",
      "Engenheiro de IA full-stack",
      "Microsoft Certified Expert",
      "Multi-Agent AI Solutions Expert",
      "Agentic AI Business Solutions Architect",
      "Sales Copilot",
      "Conecta Latam",
      "Melhor Projeto de IA da América Latina",
    ],
  },

  personal: {
    intro: {
      title: "Fora do expediente",
      description:
        "Textos, experimentos e coisas que eu construo por diversão.",
      // TODO(davi): deixe esta frase com a sua cara (hobbies e a vida longe do teclado).
      lead: "Oi, eu sou o Davi. O que eu construo e escrevo no meu tempo livre, em {city}.",
    },
    sections: {
      writing: {
        title: "Textos",
        description:
          "Notas sobre engenharia de IA, LLMs e construção de software.",
      },
      sideProjects: {
        title: "Projetos pessoais",
        description:
          "Coisas pequenas feitas por diversão, para aprender ou resolver uma vontade.",
        source: "Código",
        live: "Ver no ar",
        stack: "Stack",
        stars: "{count} estrelas no GitHub",
        moreOnGitHub: "Mais no GitHub",
      },
      elsewhere: {
        title: "Em outros lugares",
        description: "Pode dar um oi onde preferir.",
      },
    },
  },

  blog: {
    title: "Blog",
    description:
      "Notas sobre engenharia de IA, LLMs, agentes e construção de software.",
    latest: "Posts recentes",
    allPosts: "Todos os posts",
    backToBlog: "Todos os textos",
    readPost: "Ler post",
    noPosts: "Nenhum post ainda. O primeiro está a caminho.",
    readingTime: "{minutes} min de leitura",
    publishedOn: "Publicado em {date}",
    updatedOn: "Atualizado em {date}",
    tags: "Tags",
    onThisPage: "Nesta página",
    rss: "Feed RSS",
    translationAvailable: "Também disponível em inglês",
    previousPost: "Post anterior",
    nextPost: "Próximo post",
    minutes: "{minutes} min",
    subscribe: "Assinar via RSS",
    emptyHint:
      "Assine o feed RSS e ele chega até você assim que for publicado.",
    writtenBy: "Escrito por",
    aboutAuthor: "Sobre o autor",
    moreAboutMe: "Mais sobre mim",
    morePosts: "Mais posts",
    feedTitle: "{name} | Blog",
  },

  dates: {
    present: "Atual",
    since: "Desde {start}",
    range: "{start} a {end}",
  },

  socials: {
    github: "GitHub",
    linkedin: "LinkedIn",
    instagram: "Instagram",
    discord: "Discord",
    email: "E-mail",
  },

  footer: {
    rights: "Todos os direitos reservados.",
    forAgents: "Para agentes",
  },

  notFound: {
    title: "Página não encontrada",
    description:
      "Esta página não existe ou mudou de endereço. Pergunte abaixo ou {link}.",
    backHome: "volte ao início",
  },

  common: {
    readMore: "Ler mais",
    viewAll: "Ver tudo",
    learnMore: "Saiba mais",
    copy: "Copiar",
    copied: "Copiado",
  },
};
