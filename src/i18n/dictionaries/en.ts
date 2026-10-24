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
        title: "Let’s build something useful with AI",
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
    /** Work page copy: hero, case study, timeline, credentials, education. */
    page: {
      /** Page-specific SEO keywords, merged with the site-wide list. */
      keywords: [
        "AI Engineer Brazil",
        "AI Engineer Uberlândia",
        "Hire an AI Engineer",
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
      hero: {
        workModes: "Remote or hybrid",
        emailCta: "Email me",
        award: "Award",
        awardCaption:
          "Won by Algar's Sales Copilot, which I built end to end as main developer.",
        awardCta: "Read the case study",
      },
      about: { title: "About Davi" },
      featured: {
        title: "Featured work",
        description:
          "The award-winning Sales Copilot, and other work shipped at Algar.",
        caseStudy: "Case study",
        company: "Company",
        year: "Year",
        ownership: "What I built",
        /** Caption under the ownership stack, e.g. "Main developer, end to end". */
        endToEnd: "{role}, end to end",
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
        awardNote:
          "Awarded at Conecta Latam, a recognition across Latin America.",
        alsoAt: "Also at {company}",
        side: {
          title: "Side projects and open source",
          description:
            "Experiments and tools I build for fun, from a React Flow whiteboard to VS Code themes.",
          cta: "See side projects",
        },
      },
      experience: { current: "Current" },
      certifications: {
        description:
          "Two Expert-level Microsoft credentials in multi-agent and agentic AI.",
        credentials: "Credentials",
        issuer: "Issuer",
        issued: "Issued",
      },
      education: { title: "Education and languages" },
    },
  },

  personal: {
    intro: {
      eyebrow: "Personal",
      title: "Off the clock",
      description: "Writing, experiments and things I build for fun.",
    },
    sections: {
      writing: {
        eyebrow: "Writing",
        title: "Blog",
        description: "Notes on AI engineering, LLMs and building software.",
      },
      sideProjects: {
        eyebrow: "Tinkering",
        title: "Side projects",
        description:
          "Small things built for fun, learning or scratching an itch.",
      },
      elsewhere: {
        eyebrow: "Elsewhere",
        title: "Find me online",
        description: "Say hi wherever you prefer.",
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
