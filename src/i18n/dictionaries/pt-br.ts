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
    projects: {
      title: "Projetos",
      description:
        "O que Davi Lacerda construiu com IA na Algar, e os resultados: o Sales Copilot, Melhor Projeto de IA da América Latina, o Billy, que reduziu em 96% o tempo de revisão manual de faturas, e a imprensa que os cobriu.",
    },
    personal: {
      title: "Pessoal",
      description:
        "Música, séries, seus times, jogos, textos e onde encontrar Davi Lacerda.",
    },
    blog: {
      title: "Blog",
      description:
        "Notas sobre engenharia de IA, LLMs, agentes e construção de software, por Davi Lacerda.",
    },
    ask: {
      title: "Nada sobre isso ainda",
      description:
        "Escolha um tema sobre o trabalho de Davi Lacerda ou escreva direto para ele.",
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
    projects: "Projetos",
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
    system: "Sistema",
    light: "Claro",
    dark: "Escuro",
  },

  chat: {
    home: {
      lead: "{role} na {company}, construindo produtos de IA generativa e agentes.",
      highlightsTitle: "Destaques",
      certifiedTitle: "Microsoft Certified",
    },
    composer: {
      label: "Faça uma pergunta sobre o trabalho do Davi",
      placeholder: "Pergunte sobre o trabalho do Davi",
      submit: "Perguntar",
      suggestions: "Sugestões de perguntas",
      bestMatch: "Tema mais próximo: {topic}",
      noMatch: "Nenhum tema ainda.",
      fallbackTitle: "Nada sobre isso ainda.",
      fallbackBody: "Escolha um tema ou escreva para o Davi.",
      dismiss: "Fechar",
    },
    turn: {
      you: "Você perguntou",
    },
    topics: {
      experience: {
        chip: "Experiência",
        question: "Onde o Davi já trabalhou?",
        title: "Experiência profissional",
        metaTitle: "Experiência profissional de Davi Lacerda",
        description:
          "Davi Lacerda é Engenheiro de IA na Algar desde agosto de 2024, depois de um estágio de pesquisa e desenvolvimento no Brain. Datas, escopo e o que ele entregou, do Sales Copilot ao Billy e ao Bud.",
        summary: "A função na Algar e o estágio antes dela.",
        intro:
          "{role} na {company} desde {since}, depois de um estágio no {prevCompany}.",
      },
      "sales-copilot": {
        chip: "Sales Copilot",
        question: "O que é o Sales Copilot?",
        title: "Sales Copilot",
        metaTitle: "O que é o Sales Copilot que o Davi criou?",
        description:
          "O copiloto de IA que Davi Lacerda construiu de ponta a ponta para os times de vendas da Algar: escuta as ligações e sugere argumentos e ofertas em tempo real. Eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam.",
        summary: "O copiloto premiado que ele construiu de ponta a ponta.",
        intro:
          "Um copiloto de IA que escuta as ligações de vendas da Algar e sugere argumentos e ofertas em tempo real, construído de ponta a ponta pelo Davi.",
      },
      certifications: {
        chip: "Certificações",
        question: "Quais certificações o Davi tem?",
        title: "Certificações",
        metaTitle: "Certificações Microsoft de Davi Lacerda",
        description:
          "Davi Lacerda tem três certificações Microsoft: Expert em soluções de IA multiagente e em arquitetura de IA agêntica, e Associate em apps e agentes de IA no Azure. Com os certificados, seus IDs e links para verificá-los.",
        summary: "Três certificações Microsoft, com os certificados.",
        intro: "Três certificações Microsoft: duas Expert, uma Associate.",
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
          "Respostas curtas sobre Davi Lacerda: o que ele faz, o stack, o Sales Copilot, o Billy, certificações, onde mora, formação e como falar com ele.",
        summary: "Respostas curtas para o que recrutadores mais perguntam.",
        intro: "Respostas curtas para o que recrutadores mais perguntam.",
      },
      contact: {
        chip: "Contato",
        question: "Como falo com o Davi?",
        title: "Contato",
        metaTitle: "Fale com Davi Lacerda",
        description:
          "Mande um e-mail para Davi Lacerda ou encontre ele no LinkedIn. Ele está sempre aberto a uma conversa sobre IA, agentes ou uma boa ideia.",
        summary: "E-mail, LinkedIn e fuso horário.",
        intro: "O e-mail é o jeito mais rápido de falar com ele.",
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
      press: {
        title: "Na mídia",
        language: { "pt-BR": "em português", en: "em inglês" },
      },
      certifications: {
        credentials: "Credenciais",
        viewFullSize: "Ver em tamanho real",
        close: "Fechar",
        certificateAlt: "Certificado {name}, emitido para {person}",
        copyId: "Copiar ID da credencial",
        copied: "Copiado",
        verify: "Verificar",
        issued: "Emitida em {date}",
        validThrough: "válida até {date}",
        allCredentials: "Todas as credenciais no {site}",
        courses: "Também concluídos",
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
      talk: "Aberto a conversar",
      talkLine:
        "Sempre aberto a uma conversa sobre IA, agentes ou uma boa ideia.",
    },
    sections: {
      about: { title: "Sobre" },
      highlights: { title: "Destaques" },
      experience: { title: "Experiência" },
      projects: { title: "Projetos selecionados" },
      skills: { title: "Habilidades" },
      certifications: { title: "Certificações" },
      education: { title: "Formação" },
      achievements: { title: "Prêmios e conquistas" },
      faq: { title: "Perguntas frequentes" },
      contact: {
        title: "Contato",
        description:
          "Davi está sempre aberto a uma conversa sobre IA, agentes ou uma boa ideia. O e-mail é a melhor forma de falar com ele.",
      },
    },
    labels: {
      award: "Prêmio",
      mainDeveloper: "Principal desenvolvedor",
      level: "Nível {level}",
      credentialId: "ID da credencial",
      courses: "Também concluídos",
      stack: "Stack",
      highlights: "Destaques",
      role: "Função",
      location: "Local",
      privateProject: "Privado",
      issuedBy: "Emitido por {issuer}",
      coursework: "Disciplinas relevantes",
      thesis: "TCC",
      languagesSpoken: "Idiomas",
      today: "Hoje",
    },
    keywords: [
      "Engenheiro de IA",
      "Engenheiro de IA Uberlândia",
      "Engenheiro de IA Brasil",
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

  projects: {
    title: "Projetos",
    lead: "O que construí com IA na Algar, e os resultados.",
    press: "Na mídia",
    pressNote: "Matérias sobre o projeto, com as manchetes originais.",
    language: { "pt-BR": "Português", en: "Inglês" },
    all: "Todos os projetos",
    next: "Próximo projeto",
    result: "Resultado",
    open: "Ver a página do projeto",
    award: "Prêmio",
    facts: {
      company: "Empresa",
      year: "Ano",
      role: "Função",
      access: "Acesso",
    },
    problem: "O problema",
    solution: "O que ele faz",
    build: "Como foi construído",
    demo: "Demonstração: {name}",
    metaTitle: "{name}, {result}",
    metaDescription: "{summary} {result}. Na mídia: {outlets}.",
    metaDescriptionNoPress: "{summary} {result}.",
  },

  personal: {
    intro: {
      title: "Oi, eu sou o Davi.",
      description:
        "Música, séries, meus times, jogos, textos e onde me encontrar.",
      // TODO(davi): deixe esta frase com a sua cara (hobbies e a vida longe do teclado).
      lead: "Moro em {city} e crio pequenos projetos por diversão. E agora comecei a escrever também.",
      portraitAlt: "Retrato de Davi Lacerda",
      interests: "Interesses",
    },
    listening: {
      playing: "Ouvindo agora",
      recent: "Tocou por último",
      onSpotify: "No Spotify",
      listen: "Ouvir no Spotify",
      label: "{status} no Spotify: {title}, {artists}",
      changed: "Tocando agora: {title}, {artists}",
    },
    watching: {
      status: "Assistindo",
      label: "Assistindo: {title} ({details})",
    },
    teams: {
      title: "Meus times",
      live: "Ao vivo",
      final: "Encerrado, {when}",
      quarter: "{n}º quarto",
      overtime: "Prorrogação",
      overtimeN: "{n}ª prorrogação",
      endOf: "Fim do {n}º quarto",
      halftime: "Intervalo",
      shootout: "Pênaltis",
      delayed: "Atrasado",
      next: "Próximo jogo",
      unavailable: "Sem dados do jogo agora",
      result: {
        win: "Ganhou de {high} a {low}",
        loss: "Perdeu de {high} a {low}",
        draw: "Empatou em {high} a {low}",
        leading: "Ganhando de {high} a {low}",
        trailing: "Perdendo de {high} a {low}",
        tied: "Empatando em {high} a {low}",
      },
      resultWord: {
        win: "Ganhou",
        loss: "Perdeu",
        draw: "Empatou",
        leading: "Ganhando",
        trailing: "Perdendo",
        tied: "Empatando",
      },
      // {o} e {do}: "o"/"a" e "do"/"da", conforme o adversário.
      against: {
        win: "{do} {opponent}, {venue}",
        loss: "para {o} {opponent}, {venue}",
        draw: "com {o} {opponent}, {venue}",
        leading: "{do} {opponent}, {venue}",
        trailing: "para {o} {opponent}, {venue}",
        tied: "com {o} {opponent}, {venue}",
        upcoming: "contra {o} {opponent}, {venue}",
      },
      venue: { home: "em casa", away: "fora de casa" },
      started: "{team}: jogo ao vivo",
      ended: "Fim de jogo: {result}",
    },
    games: {
      title: "Jogos",
      playing: "Jogando agora",
      recent: "Últimas duas semanas",
      onSteam: "Na Steam",
      library: "{count} jogos",
      label: "{status} na Steam: {game}",
      changed: "Jogando agora na Steam: {game}",
      profile: "{title}, {handle}: {label}",
      stats: {
        kd: "K/D",
        winRate: "Vitórias",
        level: "Nível",
        matches: "Últimas {count} partidas competitivas",
        season: "Nesta temporada",
      },
      ranks: {
        unranked: "Sem rank",
        iron: "Ferro",
        bronze: "Bronze",
        silver: "Prata",
        gold: "Ouro",
        platinum: "Platina",
        diamond: "Diamante",
        ascendant: "Ascendente",
        immortal: "Imortal",
        radiant: "Radiante",
        copper: "Cobre",
        emerald: "Esmeralda",
        champion: "Campeão",
      },
    },
    sections: {
      writing: {
        title: "Textos",
        description:
          "Notas sobre engenharia de IA, LLMs e construção de software.",
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
    spotify: "Spotify",
    discord: "Discord",
    email: "E-mail",
  },

  footer: {
    rights: "Todos os direitos reservados.",
  },

  notFound: {
    title: "Página não encontrada",
    description: "Esta página não existe ou mudou de endereço.",
    backHome: "Voltar ao início",
    topics: "Ou pergunte sobre",
  },

  common: {
    readMore: "Ler mais",
    viewAll: "Ver tudo",
    learnMore: "Saiba mais",
    copy: "Copiar",
    copied: "Copiado",
  },
};
