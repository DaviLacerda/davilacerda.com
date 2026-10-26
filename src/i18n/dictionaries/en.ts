/**
 * English UI dictionary. This object defines the `Dictionary` shape; every
 * other locale must implement exactly the same keys (enforced by the type).
 *
 * Conventions:
 * - Only UI copy lives here (labels, headings, buttons, the assistant's
 *   framing). Facts about Davi live in `src/content/profile.ts`.
 * - Placeholders use `{name}` and are filled with `interpolate()` from
 *   `@/i18n`, e.g. `interpolate(dict.blog.readingTime, { minutes: 4 })`.
 * - Visible copy uses no em or en dashes and no middle dots; date ranges are
 *   written in words (see `dates`).
 */
export const en = {
  meta: {
    siteName: "Davi Lacerda",
    defaultTitle: "Davi Lacerda | AI Engineer",
    description:
      "Davi Lacerda is an AI Engineer in Uberlândia, Brazil, building Generative AI products and AI agents end to end. Main developer of Algar's Sales Copilot, Best AI Project in LATAM.",
    work: {
      title: "AI Engineer",
      description:
        "Ask about Davi Lacerda's work: experience at Algar, the award-winning Sales Copilot, Microsoft Expert certifications, skills, education and contact.",
    },
    personal: {
      title: "Personal",
      description:
        "Writing, music and the corners of the internet where you can find Davi Lacerda.",
    },
    blog: {
      title: "Blog",
      description:
        "Notes on AI engineering, LLMs, agents and building software, by Davi Lacerda.",
    },
    ask: {
      title: "Nothing on that yet",
      description:
        "Pick a topic about Davi Lacerda's work, or write to him directly.",
    },
  },

  a11y: {
    skipToContent: "Skip to content",
    primaryNav: "Primary",
    socialNav: "Social links",
    home: "Davi Lacerda, home",
    opensInNewTab: "opens in a new tab",
    breadcrumb: "Breadcrumb",
  },

  nav: {
    work: "Work",
    personal: "Personal",
    blog: "Blog",
    contact: "Contact",
  },

  locale: {
    label: "Language",
    /** Label for the link that switches to the other locale. */
    switchTo: "Ler em português",
  },

  theme: {
    toggle: "Toggle color theme",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
    system: "System",
    light: "Light",
    dark: "Dark",
  },

  /**
   * The Work tab: a guided assistant over the profile. Every answer is
   * written in advance and rendered statically. The copy on screen stays
   * simple and direct, and never talks about how the site works.
   */
  chat: {
    home: {
      /** Line under the name. */
      lead: "{role} at {company}, building generative AI products and agents.",
      /** Screen-reader heading of the overview panels. */
      highlightsTitle: "Highlights",
      /** Beside the oversized count of certifications ("3×"); the tiers go under it. */
      certifiedTitle: "Microsoft Certified",
    },
    composer: {
      label: "Ask a question about Davi's work",
      placeholder: "Ask about Davi's work",
      submit: "Ask",
      suggestions: "Suggested questions",
      bestMatch: "Best match: {topic}",
      noMatch: "No match yet.",
      fallbackTitle: "Nothing on that yet.",
      fallbackBody: "Pick a topic, or write to Davi.",
      dismiss: "Close",
    },
    turn: {
      you: "You asked",
    },
    topics: {
      experience: {
        chip: "Experience",
        question: "Where has Davi worked?",
        title: "Work experience",
        metaTitle: "Davi Lacerda's work experience",
        description:
          "Davi Lacerda has been an AI Engineer at Algar since August 2024, after a research and development internship at Brain. Dates, scope and what he shipped, from the Sales Copilot to Billy and Bud.",
        summary: "His role at Algar and the internship before it.",
        /** One sentence under the answer's title. `{prevCompany}` is the short name. */
        intro:
          "{role} at {company} since {since}, after an internship at {prevCompany}.",
      },
      "sales-copilot": {
        chip: "Sales Copilot",
        question: "What is the Sales Copilot?",
        title: "Sales Copilot",
        metaTitle: "Sales Copilot, Best AI Project in LATAM",
        description:
          "The AI copilot Davi Lacerda built end to end for Algar's sales teams: it listens to calls and suggests arguments and offers in real time. Named Best AI Project in LATAM at the Conecta Latam awards.",
        summary: "The award-winning copilot he built end to end.",
        intro:
          "An AI copilot that listens to Algar's sales calls and suggests arguments and offers in real time, built end to end by Davi.",
      },
      certifications: {
        chip: "Certifications",
        question: "Which certifications does Davi hold?",
        title: "Certifications",
        metaTitle: "Davi Lacerda's Microsoft certifications",
        description:
          "Davi Lacerda holds three Microsoft certifications: Expert in multi-agent AI solutions and in agentic AI architecture, and Associate in Azure AI apps and agents. With the certificates, their IDs and links to verify them.",
        summary: "Three Microsoft certifications, with the certificates.",
        intro: "Three Microsoft certifications: two Expert, one Associate.",
      },
      skills: {
        chip: "Skills",
        question: "What's Davi's tech stack?",
        title: "Skills and stack",
        metaTitle: "Davi Lacerda's skills and tech stack",
        description:
          "What Davi Lacerda works with: LLMs and agents, RAG, machine learning, back end, front end, cloud and delivery.",
        summary: "LLMs, agents, RAG and the full stack around them.",
        intro:
          "Generative AI and agents on Azure, in TypeScript and Python, with the full stack around them.",
      },
      education: {
        chip: "Education",
        question: "Where did Davi study?",
        title: "Education",
        metaTitle: "Davi Lacerda's education",
        description:
          "Davi Lacerda studied Computer Science at the Federal University of Uberlândia (UFU). Coursework, thesis and the languages he works in.",
        summary: "Computer Science at UFU, and languages.",
        intro:
          "Computer Science at the Federal University of Uberlândia (UFU).",
      },
      faq: {
        chip: "FAQ",
        question: "What do people usually ask about Davi?",
        title: "Common questions",
        metaTitle: "Questions about Davi Lacerda",
        description:
          "Short answers about Davi Lacerda: what he does, his stack, the Sales Copilot, Billy, certifications, location, education and how to reach him.",
        summary: "Short answers to what recruiters ask most.",
        intro: "Short answers to what recruiters ask most.",
      },
      contact: {
        chip: "Contact",
        question: "How can I reach Davi?",
        title: "Contact",
        metaTitle: "Contact Davi Lacerda",
        description:
          "Email Davi Lacerda or find him on LinkedIn. He is always happy to talk about AI, agents or a good idea.",
        summary: "Email, LinkedIn and time zone.",
        intro: "Email is the fastest way to reach him.",
      },
    },
    answers: {
      experience: {
        /** `{prevCompany}` is Brain ("o Brain" in Portuguese). */
        lead: "{name} has been an {role} at {company} since {since}. Before that, he was a {prevRole} at {prevCompany}.",
        alsoAt: "Also at {company}",
      },
      salesCopilot: {
        award: "Award",
        builtBy: "Built end to end",
        layers: {
          frontEnd: {
            title: "Front end",
            body: "The interface Algar's sales teams use.",
          },
          aiTools: {
            title: "AI tools",
            body: "The AI tools that power the copilot.",
          },
          backEnd: {
            title: "Back end",
            body: "The services the copilot runs on.",
          },
        },
        company: "Company",
        year: "Project year",
        role: "Role",
        access: "Access",
      },
      /** News coverage of a project (Sales Copilot, Billy). */
      press: {
        title: "Coverage",
        /** Beside an article in another language than the page, by BCP 47 tag. */
        language: { "pt-BR": "in Portuguese", en: "in English" },
      },
      certifications: {
        credentials: "Credentials",
        /** The link around a certificate's print; opens it full size. */
        viewFullSize: "View full size",
        close: "Close",
        /** Alt text of a print. */
        certificateAlt: "{name} certificate, issued to {person}",
        copyId: "Copy credential ID",
        copied: "Copied",
        verify: "Verify",
        issued: "Issued {date}",
        /** After the issue date: "valid through Oct 2027". */
        validThrough: "valid through {date}",
        /** The quiet link to Davi's public credentials page. `{site}` is "Microsoft Learn". */
        allCredentials: "All credentials on {site}",
        /** The short list of courses under the certifications. */
        courses: "Also completed",
        course: "Course",
        issuer: "Issuer",
        date: "Date",
      },
      education: {
        degree: "Degree",
        institution: "Institution",
        location: "Location",
      },
      contact: {
        emailCta: "Send an email",
        copyEmail: "Copy email",
        copied: "Copied",
        elsewhere: "Elsewhere",
        timezone: "Time zone",
      },
    },
  },

  /** Section titles and labels shared by the Work answers and the agent layer. */
  work: {
    hero: {
      /** The overview's contact row and the contact card. */
      talk: "Open to talk",
      /** On the contact answer, under the email. */
      talkLine: "Always happy to talk about AI, agents or a good idea.",
    },
    sections: {
      about: { title: "About" },
      highlights: { title: "Highlights" },
      experience: { title: "Experience" },
      projects: { title: "Selected projects" },
      skills: { title: "Skills" },
      certifications: { title: "Certifications" },
      education: { title: "Education" },
      achievements: { title: "Awards and achievements" },
      faq: { title: "Frequently asked questions" },
      contact: {
        title: "Contact",
        description:
          "Davi is always happy to talk about AI, agents or a good idea. Email is the best way to reach him.",
      },
    },
    labels: {
      award: "Award",
      mainDeveloper: "Main developer",
      /** A certification's tier: "Expert level". */
      level: "{level} level",
      credentialId: "Credential ID",
      courses: "Also completed",
      stack: "Stack",
      highlights: "Highlights",
      role: "Role",
      location: "Location",
      privateProject: "Private",
      issuedBy: "Issued by {issuer}",
      coursework: "Relevant coursework",
      thesis: "Thesis",
      languagesSpoken: "Languages",
      /** End of the experience timeline. */
      today: "Today",
    },
    /** Page-specific SEO keywords, merged with the site-wide list. */
    keywords: [
      "AI Engineer Brazil",
      "AI Engineer Uberlândia",
      "Generative AI Engineer",
      "LLM applications",
      "AI agents developer",
      "Multi-agent AI",
      "Agentic AI",
      "Azure AI",
      "Full-stack AI Engineer",
      "Microsoft Certified Expert",
      "Multi-Agent AI Solutions Expert",
      "Agentic AI Business Solutions Architect",
      "Sales Copilot",
      "Conecta Latam",
      "Best AI Project in LATAM",
    ],
  },

  personal: {
    intro: {
      title: "Hi, I'm Davi.",
      description: "Writing, music and where to find me.",
      /**
       * First-person line under the title. `{city}` comes from the profile.
       * TODO(davi): make it yours (hobbies and life away from the keyboard).
       */
      lead: "I live in {city}, Brazil, and build small things for fun. Lately, I've started writing too.",
      portraitAlt: "Portrait of Davi Lacerda",
      /** Accessible name of the interests row (and its label in Markdown). */
      interests: "Interests",
    },
    /** The Spotify card under the hello (what Davi is listening to). */
    listening: {
      playing: "Listening now",
      recent: "Last played",
      /** The card when nothing can be shown: a link to the profile. */
      onSpotify: "On Spotify",
      /** The card's accessible name: "Listening now on Spotify: Song, Artist". */
      label: "{status} on Spotify: {title}, {artists}",
      /** Announced politely when the song changes while the page is open. */
      changed: "Now playing: {title}, {artists}",
    },
    sections: {
      writing: {
        title: "Writing",
        description: "Notes on AI engineering, LLMs and building software.",
      },
      elsewhere: {
        title: "Elsewhere",
        description: "Say hi wherever you prefer.",
      },
    },
  },

  blog: {
    title: "Blog",
    description: "Notes on AI engineering, LLMs, agents and building software.",
    latest: "Latest posts",
    allPosts: "All posts",
    backToBlog: "All writing",
    readPost: "Read post",
    noPosts: "No posts yet. The first one is on its way.",
    readingTime: "{minutes} min read",
    publishedOn: "Published on {date}",
    updatedOn: "Updated on {date}",
    tags: "Tags",
    onThisPage: "On this page",
    rss: "RSS feed",
    translationAvailable: "Also available in Portuguese",
    previousPost: "Previous post",
    nextPost: "Next post",
    minutes: "{minutes} min",
    subscribe: "Subscribe via RSS",
    emptyHint:
      "Subscribe to the RSS feed and it will reach you as soon as it ships.",
    writtenBy: "Written by",
    aboutAuthor: "About the author",
    moreAboutMe: "More about me",
    morePosts: "More posts",
    /** RSS channel title, e.g. "Davi Lacerda | Blog". */
    feedTitle: "{name} | Blog",
  },

  dates: {
    present: "Present",
    /** An ongoing period, e.g. "Since Aug 2024". */
    since: "Since {start}",
    /** A closed period, e.g. "Dec 2023 to Aug 2024". */
    range: "{start} to {end}",
  },

  socials: {
    github: "GitHub",
    linkedin: "LinkedIn",
    instagram: "Instagram",
    spotify: "Spotify",
    discord: "Discord",
    email: "Email",
  },

  footer: {
    rights: "All rights reserved.",
  },

  notFound: {
    title: "Page not found",
    description: "This page doesn't exist or has moved.",
    backHome: "Back to the start",
    /** Heading of the topic links under it. */
    topics: "Or ask about",
  },

  common: {
    readMore: "Read more",
    viewAll: "View all",
    learnMore: "Learn more",
    copy: "Copy",
    copied: "Copied",
  },
};

export type Dictionary = typeof en;
