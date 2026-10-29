# SEO and AEO plan

How the site earns visibility in Google and in answer engines (ChatGPT, Claude, Perplexity,
Gemini, Copilot), following the process in the
[Granola case study by Discovered Labs](https://discoveredlabs.com/case-studies/granola): one plan
for both channels, every gap routed to **content**, **technical** work or a **third-party source**,
and Google and AI measured separately. The technical surface (JSON-LD, llms.txt, Markdown, MCP)
is documented in `ARCHITECTURE.md`, "Agent readiness"; this file is the plan around it.

The "buyer" here is whoever decides whether to talk to Davi: a recruiter, a hiring manager, a
founder or a peer looking for someone who has shipped AI agents.

## 1. Intents and where they are answered

Each intent maps to one page. A weak page is improved; a new page is made only when no focused
page can carry the intent (no page per keyword variation).

| Intent                       | Google (examples)                                                                     | AI prompt (scenario, constraint, comparison)                                                                   | Page                                                      | State                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Who he is (branded)          | davi lacerda, davi lacerda ai engineer, davi tobias lacerda                           | Who is Davi Lacerda? / Tell me about Davi Lacerda, the AI engineer at Algar                                    | `/en`, `/pt-br`                                           | Answered in the HTML ("About Davi"), JSON-LD, llms.txt                                                |
| Experience and impact        | davi lacerda algar, engenheiro de ia algar                                            | What has Davi Lacerda built in production, and with what results?                                              | `/en/work/experience`, FAQ `results`                      | Lead under the title, FAQ `results`                                                                   |
| The award                    | algar sales copilot, conecta latam 2025 melhor projeto de ia, best ai project latam   | Which project won Best AI implementation in telecom at Conecta Latam 2025, and who built it?                   | `/en/projects/sales-copilot`, `/en/work/sales-copilot`    | Project page (story, press) and the answer with its lead; **the press does not name Davi** (see Earn) |
| Billy (invoice review)       | algar billy faturas ia, algar economiza 3 milhões faturas                             | How did Algar use generative AI to review telecom invoices?                                                    | `/en/projects/billy`, FAQ `billy`                         | Focused project page (Projects tab); a first-hand post would add the "how" (brief below)              |
| Certifications               | multi-agent ai solutions expert, agentic ai business solutions architect brazil       | Find AI engineers in Brazil with the Microsoft Multi-Agent AI Solutions Expert certification                   | `/en/work/certifications`                                 | Preserve (verifiable IDs and links)                                                                   |
| Stack, models and clouds     | ai engineer azure openai brazil, engenheiro de ia azure, langgraph mastra developer   | AI engineers in Brazil with production experience in Azure OpenAI and multi-agent systems; GPT, Claude, Gemini | `/en/work/skills`, FAQ `tech-stack`, `ai-models`, `cloud` | Models (OpenAI, Anthropic, Gemini) and clouds (Azure first, GCP, AWS) added                           |
| Agents in production and MCP | copilot studio agent sap teams, mcp developer brazil                                  | Who has shipped AI agents to production with Copilot Studio, LangGraph or Mastra? / Who trains teams on MCP?   | FAQ `agents-in-production`, `mcp`                         | New FAQ entries, grounded in the profile                                                              |
| Contact                      | davi lacerda contato, contact davi lacerda                                            | How do I reach Davi Lacerda?                                                                                   | `/en/work/contact`                                        | Preserve                                                                                              |
| Comparisons (expertise)      | langgraph vs mastra vs crewai, llm as a judge model migration, azure openai vs openai | Which agent framework should I use for X? / How do I cut GenAI costs without losing accuracy?                  | Blog (none yet)                                           | Gap: only where Davi has first-hand evidence (briefs below)                                           |

Facts on every page come from `src/content/profile.ts`. A new fact goes there first, then every
page, the JSON-LD, llms.txt and the MCP server change together (one figure everywhere).

## 2. Content: CITABLE checks

Discovered Labs scores pages for AI answers with CITABLE: **C**lear entity and structure (a
bottom line up front that names the entity), **I**ntent architecture (the main question and the
follow-ups), **T**hird-party validation, **A**nswer grounding (specific, sourced figures),
**B**lock structure (self-contained sections under question headings), **L**atest and consistent
(a visible date, no conflicting figures), **E**ntity graph and schema.

How the site meets them:

- **C, B:** every Work answer opens with its answer in words right under the `h1` (`topicLead()`,
  in `AnswerHeader`), and the home carries the TL;DR as "About Davi". These are the paragraphs
  answer engines quote, and they are now in the HTML, not only in the Markdown and JSON-LD.
- **I:** the FAQ covers what recruiters ask: what he does, results, stack, models, clouds,
  agents in production, MCP, the Sales Copilot, Billy, certifications, location, education,
  contact. Each answer stands on its own (it names Davi and the project).
- **A:** figures carry their context (96% less manual review time, 40% less workload, 40%+ lower
  GenAI cost, Conecta Latam, December 2025) and the press links on the project pages.
- **L:** the footer shows "updated <date>" (the last change to the profile or a post) and the
  ProfilePage JSON-LD has `dateModified`. Titles that already name Davi drop the repeated
  " | Davi Lacerda".
- **E:** Person with `hasOccupation`, `knowsAbout` (every skill, models and clouds included),
  `hasCredential`, `award`, `alumniOf`, `worksFor` and `sameAs`; FAQPage on the FAQ.

Actions per page (preserve, improve for SEO, optimize for AI answers, overhaul, gather evidence):

| Page                            | Action                   | Why                                                        |
| ------------------------------- | ------------------------ | ---------------------------------------------------------- |
| Work home                       | Optimized for AI answers | Visible BLUF; answer-first meta description                |
| Experience                      | Optimized for AI answers | Lead under the title                                       |
| Sales Copilot                   | Gather evidence          | Needs a third-party source that names Davi as its builder  |
| Projects (Sales Copilot, Billy) | Preserve                 | Story, figures and press per project, CreativeWork JSON-LD |
| Certifications                  | Preserve                 | Verifiable, structured, current                            |
| Skills                          | Improved                 | Models and clouds named explicitly, with logos             |
| FAQ                             | Improved                 | Five new intents                                           |
| Blog                            | Gather evidence          | One post; write only from first-hand work (briefs below)   |

Post briefs, if Davi wants to write them (each answers one comparison or "how" question, with
his own numbers):

1. **How we cut GenAI costs by 40% without losing accuracy:** the model migration and the
   LLM-as-a-judge benchmark behind the decision (what was measured, how).
2. **Building a real-time sales copilot on Azure OpenAI:** the architecture of the Sales Copilot
   at the level Algar allows to share (Svelte, .NET, Azure OpenAI), what made it work live.
3. **An agent in Microsoft Teams that talks to SAP:** Bud with Copilot Studio, Power Automate
   and RPA, and when a low-code agent beats a framework.

## 3. Technical

In place (see `ARCHITECTURE.md`): static HTML for every page, canonical and hreflang, sitemap
with `lastmod`, robots.txt that welcomes AI crawlers, OG images, JSON-LD, llms.txt and Markdown,
MCP. Added here: verification tags for Search Console and Bing (optional, `.env.example`) and
IndexNow (`scripts/indexnow.mjs`, run by `.github/workflows/indexnow.yml` after each production
deployment, so Bing and Copilot recrawl changed pages within minutes).

Verify after each release, starting from the original issue:

- Vercel: Firewall and Bot Protection must not challenge AI crawlers (GPTBot, OAI-SearchBot,
  ClaudeBot, PerplexityBot, Bingbot). `curl -A "OAI-SearchBot" -I https://davilacerda.com/en`
  should answer 200.
- Google: Rich Results Test on `/en` and `/en/work/faq`; URL Inspection in Search Console.
- Bing: URL Inspection in Bing Webmaster Tools; the IndexNow run in the workflow log.
- Agents: https://isitagentready.com (see `ARCHITECTURE.md`, "Checking").

## 4. Third-party sources (Own, Claim, Earn, Contest)

Answer engines trust a person more when other sources say the same thing. Start from a source
tied to an intent, check whether Davi is absent, wrong, outdated or well represented, and pick a
route. One job per link or mention.

- **Own:** the site; the GitHub profile README (same headline and a link here); the LinkedIn
  headline and About with the same title ("AI Engineer"), dates and figures as `profile.ts`.
- **Claim:** Search Console and Bing Webmaster Tools (DNS verification); the Microsoft Learn
  profile set to public; the Google knowledge panel once it shows for "Davi Lacerda".
- **Earn:** the articles about the Sales Copilot and Billy name Algar, not Davi. The most
  valuable mention is one that names him as the builder: an Algar news or LinkedIn post, the
  Conecta Latam winners page, a talk or a meetup page (Microsoft community, AI engineering
  meetups in Brazil), a podcast. Sharing the posts above on LinkedIn earns links too.
- **Contest:** if an answer engine states something wrong about Davi (old role, wrong company),
  find the source it cites and fix or report it.

Keep a short log of each change (source, problem, route, date), so the next check can tell what
moved the numbers.

## 5. Measure (Google and AI apart)

Take a baseline before a release that changes content, then compare monthly.

- **Google:** Search Console clicks, impressions and average position, split branded ("davi
  lacerda") from non-branded queries.
- **Bing and Copilot:** Bing Webmaster Tools, same split.
- **AI answers:** run the same prompts every month in ChatGPT, Claude, Perplexity, Gemini and
  Copilot, in English and Portuguese, logged out where possible, and note for each: mentioned
  (Davi named), cited (a davilacerda.com link), accurate. Start from the AI prompts in the table
  above, plus "Who is Davi Lacerda?" and "Quem é Davi Lacerda?".
- **AI referrals:** Vercel Analytics, Referrers: chatgpt.com, perplexity.ai, claude.ai,
  gemini.google.com, copilot.microsoft.com (ChatGPT also adds `utm_source=chatgpt.com`).
