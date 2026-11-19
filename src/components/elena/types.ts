/** Shape of the encrypted content.json served at /elena/media/content.json. */

export type Who = "davi" | "elena";

export type ChatItem =
  | { day: string }
  | { event: "elena-liked" }
  | { from: Who; text: string; time?: string; heart?: boolean };

export type Card = { image: string; title: string };

export type Profile = {
  name: string;
  age: number;
  photos: string[];
  lookingFor: string;
  about: string;
  prompts: [string, string][];
  basics: string[];
  interests: string[];
  more: [string, string][];
  song?: { title: string; artist: string };
};

export type Island = {
  place: string;
  title: string;
  text: string;
  photos: string[];
  videos: string[];
  /** Cards inside the island's pack, in reveal order. */
  cards: string[];
  /** What each person says there, keyed by who is speaking. */
  lines: Record<Who, string>;
};

export type Content = {
  intro: { lines: string[] };
  davi: Profile;
  elena: Profile;
  chat: ChatItem[];
  cards: Record<string, Card>;
  islands: Record<string, Island>;
  finale: { title: string; message: string; signature: string };
};

export const media = (name: string) =>
  name.startsWith("data:") ? name : `/elena/media/${name}`;

/** Islands in the order of the story. */
export const ISLAND_ORDER = [
  "panedoca",
  "casa-vo",
  "caldas",
  "sabia",
  "famiglia",
  "casa",
  "benedith",
  "itumbiara",
  "alpendre",
  "caramel",
  "cinema",
] as const;

/** Binder order: the match first, then the walk. */
export const CARD_ORDER = [
  "tinder",
  "panedoca",
  "casa-vo",
  "caldas",
  "sabia",
  "famiglia",
  "pedido",
  "compromisso",
  "benedith",
  "itumbiara",
  "alpendre",
  "caramel",
  "cinema",
  "dois-meses",
] as const;

export const other = (who: Who): Who => (who === "davi" ? "elena" : "davi");

/** Cards printed as special editions (shiny / legendary): they shine more. */
export const SPECIAL_CARDS: string[] = [
  "compromisso",
  "famiglia",
  "dois-meses",
];
