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
        "Experiência, projetos, certificações Microsoft Expert e prêmios de Davi Lacerda, Engenheiro de IA na Algar e principal desenvolvedor do premiado Sales Copilot.",
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

  work: {
    hero: {
      eyebrow: "Engenheiro de IA",
      basedIn: "Em",
      availability: "Aberto a vagas de Engenheiro de IA",
      primaryCta: "Entre em contato",
      secondaryCta: "Ver experiência",
    },
    sections: {
      about: { eyebrow: "Resumo", title: "Sobre" },
      highlights: { eyebrow: "Em resumo", title: "Destaques" },
      experience: {
        eyebrow: "Carreira",
        title: "Experiência",
        description: "Onde tenho construído e o que entreguei por lá.",
      },
      projects: {
        eyebrow: "Portfólio",
        title: "Projetos selecionados",
        description:
          "Projetos profissionais e pessoais, de produtos de IA a ferramentas para devs.",
      },
      skills: {
        eyebrow: "Ferramentas",
        title: "Habilidades",
        description: "O stack que eu uso, agrupado por camada.",
      },
      certifications: {
        eyebrow: "Aprendizado",
        title: "Certificações e cursos",
      },
      education: { eyebrow: "Formação", title: "Educação" },
      achievements: {
        eyebrow: "Reconhecimento",
        title: "Prêmios e conquistas",
      },
      faq: {
        eyebrow: "FAQ",
        title: "Perguntas frequentes",
        description:
          "Respostas rápidas para recrutadores, parceiros e máquinas curiosas.",
      },
      contact: {
        eyebrow: "Contato",
        title: "Vamos construir algo útil com IA",
        description:
          "Contratando um Engenheiro de IA, ou tem um produto com LLM que precisa funcionar no mundo real? Vou adorar conversar.",
        emailCta: "Enviar um e-mail",
        copyEmail: "Copiar endereço de e-mail",
        copied: "Copiado para a área de transferência",
      },
    },
    labels: {
      award: "Prêmio",
      mainDeveloper: "Principal desenvolvedor",
      expertLevel: "Nível Expert",
      courses: "Cursos",
      stack: "Stack",
      highlights: "Destaques",
      role: "Cargo",
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
  },

  personal: {
    intro: {
      eyebrow: "Pessoal",
      title: "Fora do expediente",
      description:
        "Textos, experimentos e coisas que eu construo por diversão.",
      headline: "Fora do *expediente*",
      // TODO(davi): deixe estes parágrafos com a sua cara (hobbies e a vida longe do teclado).
      paragraphs: [
        "Oi, eu sou o Davi. Moro em {city}, no Triângulo Mineiro, onde estudei Ciência da Computação e onde hoje construo produtos de IA. Esta é a outra metade do site: menos currículo, mais o que eu faço e penso quando ninguém está pedindo.",
        "Gosto de construir em público. A maioria dos meus projetos pessoais nasceu de pequenas vontades: um sorteador de episódios porque vivo revendo minhas séries favoritas, meus próprios temas para o VS Code porque passo o dia num editor, um quadro branco no estilo FigJam feito com React Flow.",
        "Ultimamente também tenho escrito: notas sobre engenharia de IA de quem coloca isso no ar. Espere agentes e sistemas multiagente, RAG, Model Context Protocol, Azure AI e o trabalho nada glamoroso de levar IA Generativa para produção.",
      ],
      jumpTo: "Ir para",
      facts: {
        label: "Em resumo",
        location: "Localização",
        dayJob: "Trabalho",
        dayJobValue: "{role} na {company}",
        writingAbout: "Escrevendo sobre",
        writingTopics: "Engenharia de IA, agentes, RAG e MCP",
        languages: "Idiomas",
      },
    },
    sections: {
      writing: {
        eyebrow: "Escrita",
        title: "Blog",
        description:
          "Notas sobre engenharia de IA, LLMs e construção de software.",
        latest: "Mais recente",
      },
      sideProjects: {
        eyebrow: "Experimentos",
        title: "Projetos pessoais",
        description:
          "Coisas pequenas feitas por diversão, para aprender ou resolver uma vontade.",
        source: "Código",
        live: "Ver no ar",
        stars: "{count} estrelas no GitHub",
        moreOnGitHub: "Mais no GitHub",
      },
      elsewhere: {
        eyebrow: "Em outros lugares",
        title: "Me encontre online",
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
    backToBlog: "Voltar para todos os posts",
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
    range: "{start} – {end}",
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
    colophon: "Projetado e desenvolvido por Davi Lacerda.",
    backToTop: "Voltar ao topo",
  },

  notFound: {
    title: "Página não encontrada",
    description: "A página que você procura não existe ou mudou de endereço.",
    backHome: "Voltar para a página inicial",
  },

  common: {
    readMore: "Ler mais",
    viewAll: "Ver tudo",
    learnMore: "Saiba mais",
    copy: "Copiar",
    copied: "Copiado",
  },
};
