/**
 * Brands, products and people a blog post can name as a chip: write
 * `[Claude](brand:claude)` in the Markdown and the post shows the brand's
 * icon beside the name, with a small card on hover or focus (a header in the
 * brand's colour, what it is in one line and a link to it).
 *
 * Only facts that hold for the post that names them; one line each. A brand
 * with no icon in the logo registry shows its initial (or `image`).
 */
import type { L10n } from "@/i18n";
import type { LogoId } from "@/lib/logos";

export type Brand = {
  name: string;
  /** Who makes it, or what it is, set small above the name in the card. */
  by?: L10n;
  /** One line: what it is and why it is in the post. */
  description: L10n;
  /** Off-site, or a site path without the language ("/projects/piecet"). */
  url: string;
  /** A logo from `src/lib/logos/registry.ts`. */
  logo?: LogoId;
  /** Or an image in /public (square, at least 64px). */
  image?: string;
  /** The card header's colour (the brand's own). */
  color: string;
  /** Text colour on `color`. */
  onColor?: string;
};

export const brands = {
  claude: {
    name: "Claude",
    by: { en: "Anthropic", "pt-br": "Anthropic" },
    description: {
      en: "Anthropic's AI. It researched, prototyped and built piecet with me, one pull request at a time.",
      "pt-br":
        "A IA da Anthropic. Pesquisou, prototipou e construiu o piecet comigo, um pull request por vez.",
    },
    url: "https://claude.ai",
    logo: "claude",
    color: "#d97757",
    onColor: "#ffffff",
  },
  "apple-developer": {
    name: "Apple Developer Program",
    by: { en: "Apple", "pt-br": "Apple" },
    description: {
      en: "What it takes to put an app on the App Store, and to test it on your own iPhone through TestFlight.",
      "pt-br":
        "O que é preciso para publicar na App Store e testar o app no seu próprio iPhone pelo TestFlight.",
    },
    url: "https://developer.apple.com/programs/",
    logo: "apple",
    color: "#1d1d1f",
    onColor: "#f5f5f7",
  },
  chatgpt: {
    name: "ChatGPT",
    by: { en: "OpenAI", "pt-br": "OpenAI" },
    description: {
      en: "Where Piet's first sketches came from, before the face was right.",
      "pt-br":
        "De onde saíram os primeiros rascunhos do Piet, antes de o rosto ficar certo.",
    },
    url: "https://chatgpt.com",
    logo: "openai",
    color: "#0d0d0d",
    onColor: "#ffffff",
  },
  vivet: {
    name: "Vivet",
    by: { en: "Kai Cenat", "pt-br": "Kai Cenat" },
    description: {
      en: "Kai Cenat's clothing brand. How its name and identity were built is my reference for naming piecet.",
      "pt-br":
        "A marca de roupas do Kai Cenat. O jeito como o nome e a identidade dela foram criados é a minha referência para o nome do piecet.",
    },
    url: "https://www.complex.com/style/a/mariah-rivera/kai-cenat-vivet-clothing-brand-everything-we-know",
    color: "#111111",
    onColor: "#ffffff",
  },
  x: {
    name: "X",
    by: { en: "formerly Twitter", "pt-br": "antigo Twitter" },
    description: {
      en: "Its Explore tab puts the work of designers from all over the world in front of you. My biggest source of references.",
      "pt-br":
        "O Explorar coloca na sua frente o trabalho de designers do mundo inteiro. Minha maior fonte de referências.",
    },
    url: "https://x.com",
    logo: "x",
    color: "#000000",
    onColor: "#ffffff",
  },
  pool: {
    name: "Pool",
    by: { en: "iPhone app", "pt-br": "App para iPhone" },
    description: {
      en: "An app for capturing anything, starting with your screenshots. The spark for piecet.",
      "pt-br":
        "Um app para capturar qualquer coisa, a começar pelos seus screenshots. A faísca do piecet.",
    },
    url: "https://apps.apple.com/us/app/-/id6752956163",
    color: "#0a0a0a",
    onColor: "#ffffff",
  },
  fitfolio: {
    name: "FitFolio",
    by: { en: "Matheus Gobbi", "pt-br": "Matheus Gobbi" },
    description: {
      en: "An app Matheus Gobbi builds in public, with Pumpy as its mascot. One of my references for giving piecet a character.",
      "pt-br":
        "Um app que o Matheus Gobbi constrói em público, com o Pumpy de mascote. Uma das minhas referências para o piecet ter um personagem.",
    },
    url: "https://matheusgobbi.com",
    color: "#e2582b",
    onColor: "#ffffff",
  },
  "emil-kowalski": {
    name: "Emil Kowalski",
    by: { en: "Design engineer", "pt-br": "Design engineer" },
    description: {
      en: "His writing on interface motion, as skills for Claude, shaped how piecet moves.",
      "pt-br":
        "O que ele escreve sobre movimento em interfaces, em forma de skills para o Claude, guiou como o piecet se mexe.",
    },
    url: "https://emilkowal.ski",
    color: "#0a0a0a",
    onColor: "#ffffff",
  },
  piecet: {
    name: "piecet",
    by: { en: "iPhone app", "pt-br": "App para iPhone" },
    description: {
      en: "Keep what's worth keeping, as pieces. Piet fits them into bigger pictures, on your iPhone.",
      "pt-br":
        "Guarde o que vale guardar, em peças. O Piet encaixa cada uma num quebra-cabeça maior, no seu iPhone.",
    },
    url: "/projects/piecet",
    image: "/images/blog/piecet-1/piecet-icon.png",
    color: "#b57cff",
    onColor: "#0a0a0a",
  },
} satisfies Record<string, Brand>;

export type BrandId = keyof typeof brands;

export function getBrand(id: string): Brand | undefined {
  return Object.hasOwn(brands, id) ? brands[id as BrandId] : undefined;
}
