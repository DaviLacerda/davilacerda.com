/**
 * English UI dictionary. This object defines the `Dictionary` shape; every
 * other locale must implement exactly the same keys (enforced by the type).
 *
 * Conventions:
 * - Only UI copy lives here (labels, headings, buttons). Facts about Davi live
 *   in `src/content/profile.ts`.
 * - Placeholders use `{name}` and are filled with `interpolate()` from
 *   `@/i18n`, e.g. `interpolate(dict.blog.readingTime, { minutes: 4 })`.
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
        "Experience, projects, Microsoft Expert certifications and awards of Davi Lacerda, AI Engineer at Algar and main developer of the award-winning Sales Copilot.",
    },
    personal: {
      title: "Personal",
      description:
        "Writing, side projects and the corners of the internet where you can find Davi Lacerda.",
    },
    blog: {
      title: "Blog",
      description:
        "Notes on AI engineering, LLMs, agents and building software, by Davi Lacerda.",
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
  },

  work: {
    hero: {
      eyebrow: "AI Engineer",
      basedIn: "Based in",
      availability: "Open to AI Engineer roles",
      primaryCta: "Get in touch",
      secondaryCta: "See experience",
    },
    sections: {
      about: { eyebrow: "TL;DR", title: "About" },
      highlights: { eyebrow: "At a glance", title: "Highlights" },
      experience: {
        eyebrow: "Career",
        title: "Experience",
        description: "Where I have been building, and what I shipped there.",
      },
      projects: {
        eyebrow: "Portfolio",
        title: "Selected projects",
        description:
          "Work and side projects, from AI products to developer tooling.",
      },
      skills: {
        eyebrow: "Toolbox",
        title: "Skills",
        description: "The stack I reach for, grouped by layer.",
      },
      certifications: {
        eyebrow: "Learning",
        title: "Certifications and courses",
      },
      education: { eyebrow: "Academia", title: "Education" },
      achievements: {
        eyebrow: "Recognition",
        title: "Awards and achievements",
      },
      faq: {
        eyebrow: "FAQ",
        title: "Frequently asked questions",
        description:
          "Quick answers for recruiters, collaborators and curious machines.",
      },
      contact: {
        eyebrow: "Contact",
        title: "Let's build something useful with AI",
        description:
          "Hiring for an AI Engineer, or have an LLM product that needs to work in the real world? I would love to hear about it.",
        emailCta: "Send an email",
        copyEmail: "Copy email address",
        copied: "Copied to clipboard",
      },
    },
    labels: {
      award: "Award",
      mainDeveloper: "Main developer",
      expertLevel: "Expert level",
      courses: "Courses",
      stack: "Stack",
      highlights: "Highlights",
      role: "Role",
      location: "Location",
      viewProject: "View project",
      sourceCode: "Source code",
      liveSite: "Live site",
      privateProject: "Private",
      featured: "Featured",
      stars: "{count} stars",
      issuedBy: "Issued by {issuer}",
      viewCredential: "View credential",
      coursework: "Relevant coursework",
      thesis: "Thesis",
      languagesSpoken: "Languages",
    },
  },

  personal: {
    intro: {
      eyebrow: "Personal",
      title: "Off the clock",
      description: "Writing, experiments and things I build for fun.",
      /** The page's h1. Wrap a phrase in *asterisks* to set it in italics. */
      headline: "Off the *clock*",
      /**
       * First-person intro. `{city}` comes from the profile.
       * TODO(davi): make these yours (hobbies and life away from the keyboard).
       */
      paragraphs: [
        "Hi, I'm Davi. I live in {city}, in the Triângulo Mineiro region of Minas Gerais, where I studied Computer Science and where I now build AI products for a living. This is the other half of the site: less résumé, more of what I make and think about when nobody is asking.",
        "I like building in public. Most of my side projects started as small itches: a random-episode picker because I keep rewatching my favorite shows, my own VS Code themes because I spend my days in an editor, a FigJam-style whiteboard built on React Flow.",
        "Lately I've been writing, too: notes on AI engineering from someone who ships it. Expect agents and multi-agent systems, RAG, the Model Context Protocol, Azure AI and the unglamorous work of taking Generative AI to production.",
      ],
      jumpTo: "Jump to",
      facts: {
        label: "At a glance",
        location: "Location",
        dayJob: "Day job",
        dayJobValue: "{role} at {company}",
        writingAbout: "Writing about",
        writingTopics: "AI engineering, agents, RAG and MCP",
        languages: "Languages",
      },
    },
    sections: {
      writing: {
        eyebrow: "Writing",
        title: "Blog",
        description: "Notes on AI engineering, LLMs and building software.",
        latest: "Latest",
      },
      sideProjects: {
        eyebrow: "Tinkering",
        title: "Side projects",
        description:
          "Small things built for fun, learning or scratching an itch.",
        source: "Source",
        live: "Live site",
        stars: "{count} stars on GitHub",
        moreOnGitHub: "More on GitHub",
      },
      elsewhere: {
        eyebrow: "Elsewhere",
        title: "Find me online",
        description: "Say hi wherever you prefer.",
        /** One line under each link: what you will find there. */
        notes: {
          github: "Code, side projects and experiments",
          linkedin: "Career updates and professional network",
          instagram: "Life outside the editor",
          discord: "Chat about AI, code or anything else",
          email: "The best way to reach me, for anything",
        },
      },
    },
  },

  blog: {
    title: "Blog",
    description: "Notes on AI engineering, LLMs, agents and building software.",
    latest: "Latest posts",
    allPosts: "All posts",
    backToBlog: "Back to all posts",
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
    /** Joins a start and end date, e.g. "Dec 2024 – Present". */
    range: "{start} – {end}",
  },

  socials: {
    github: "GitHub",
    linkedin: "LinkedIn",
    instagram: "Instagram",
    discord: "Discord",
    email: "Email",
  },

  footer: {
    rights: "All rights reserved.",
    colophon: "Designed and built by Davi Lacerda.",
    backToTop: "Back to top",
  },

  notFound: {
    title: "Page not found",
    description: "The page you are looking for does not exist or has moved.",
    backHome: "Back to the homepage",
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
