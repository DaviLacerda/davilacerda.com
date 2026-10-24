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
      lead: "{role} na {company}, em {place}. Constrói produtos de IA Generativa e agentes de IA de ponta a ponta.",
      summaryTitle: "Em resumo",
      glanceTitle: "Em destaque",
      topicsTitle: "O que você pode perguntar",
    },
    composer: {
      label: "Faça uma pergunta sobre o trabalho do Davi",
      placeholder: "Pergunte sobre o Davi",
      submit: "Perguntar",
      suggestions: "Sugestões de perguntas",
      bestMatch: "Tema mais próximo: {topic}",
      noMatch: "Nenhum tema ainda. Tente uma das sugestões.",
      note: "Um assistente guiado sobre o perfil verificado do Davi. Todas as respostas são escritas com antecedência; nenhum modelo responde ao vivo.",
      fallbackTitle: "Ainda não tenho uma resposta escrita para isso.",
      fallbackBody:
        "Posso responder sobre os temas abaixo. Para qualquer outra coisa, escreva para o Davi em {email}.",
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
      },
      "sales-copilot": {
        chip: "Sales Copilot",
        question: "O que é o Sales Copilot?",
        title: "Sales Copilot",
        metaTitle: "Sales Copilot, Melhor Projeto de IA da América Latina",
        description:
          "O copiloto de IA que Davi Lacerda construiu de ponta a ponta para os times de vendas da Algar, eleito Melhor Projeto de IA da América Latina no prêmio Conecta Latam.",
        summary: "O copiloto premiado que ele construiu de ponta a ponta.",
      },
      certifications: {
        chip: "Certificações",
        question: "Quais certificações o Davi tem?",
        title: "Certificações",
        metaTitle: "Certificações Microsoft Expert de Davi Lacerda",
        description:
          "Davi Lacerda tem duas certificações Microsoft de nível Expert, em soluções de IA multiagente e arquitetura de IA agêntica, além de cursos de React.",
        summary: "Duas credenciais Microsoft Expert, e cursos.",
      },
      skills: {
        chip: "Habilidades",
        question: "Qual é o stack do Davi?",
        title: "Habilidades e stack",
        metaTitle: "Habilidades e stack de Davi Lacerda",
        description:
          "Com o que Davi Lacerda trabalha: LLMs e agentes, RAG, machine learning, back-end, front-end, cloud e entrega.",
        summary: "LLMs, agentes, RAG e todo o stack ao redor.",
      },
      education: {
        chip: "Formação",
        question: "Onde o Davi estudou?",
        title: "Formação",
        metaTitle: "Formação de Davi Lacerda",
        description:
          "Davi Lacerda estudou Ciência da Computação na Universidade Federal de Uberlândia (UFU). Disciplinas, TCC e os idiomas em que ele trabalha.",
        summary: "Ciência da Computação na UFU, e idiomas.",
      },
      faq: {
        chip: "Perguntas",
        question: "O que as pessoas costumam perguntar sobre o Davi?",
        title: "Perguntas frequentes",
        metaTitle: "Perguntas sobre Davi Lacerda",
        description:
          "Respostas curtas sobre Davi Lacerda: o que ele faz, se está aberto a vagas, o stack, o Sales Copilot, certificações, onde mora e formação.",
        summary: "Respostas curtas para o que recrutadores mais perguntam.",
      },
      contact: {
        chip: "Contato",
        question: "Como falo com o Davi?",
        title: "Contato",
        metaTitle: "Fale com Davi Lacerda",
        description:
          "Davi Lacerda está aberto a vagas de Engenheiro de IA, presenciais ou híbridas em Uberlândia e remotas. Mande um e-mail ou encontre ele no LinkedIn.",
        summary: "E-mail, LinkedIn e disponibilidade.",
      },
    },
    answers: {
      experience: {
        lead: "{name} é {role} na {company} desde {since}. Antes, foi {prevRole} no {prevCompany}.",
        alsoAt: "Também na {company}",
      },
      salesCopilot: {
        award: "Prêmio",
        builtBy: "Construído de ponta a ponta pelo principal desenvolvedor",
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
      faq: {
        lead: "Respostas curtas para o que recrutadores e colaboradores mais perguntam.",
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
      // TODO(davi): deixe estes parágrafos com a sua cara (hobbies e a vida longe do teclado).
      paragraphs: [
        "Oi, eu sou o Davi. Moro em {city}, no Triângulo Mineiro, onde estudei Ciência da Computação e onde hoje construo produtos de IA. Esta é a outra metade do site: menos currículo, mais o que eu construo e escrevo no meu tempo livre.",
        "Gosto de construir em público. A maioria dos meus projetos pessoais nasceu de pequenas vontades: um sorteador de episódios porque vivo revendo minhas séries favoritas, meus próprios temas para o VS Code porque passo o dia num editor, um quadro branco no estilo FigJam feito com React Flow.",
        "Ultimamente também tenho escrito: notas sobre engenharia de IA. Espere agentes e sistemas multiagente, RAG, Model Context Protocol, Azure AI e o que é preciso para rodar IA Generativa em produção.",
      ],
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
        notes: {
          github: "Código, projetos pessoais e experimentos",
          linkedin: "Novidades da carreira e rede profissional",
          instagram: "A vida fora do editor",
          discord: "Papo sobre IA, código ou qualquer outra coisa",
          email: "O melhor jeito de falar comigo, sobre qualquer assunto",
        },
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
