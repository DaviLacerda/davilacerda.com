/** Shape of the encrypted content.json served at /elena/media/content.json. */

export type ChatItem =
  | { day: string }
  | { system: string }
  | { from: "davi" | "elena"; text: string; time?: string; heart?: boolean };

export type Card = { image: string; title: string };

export type Memory = {
  place: string;
  title: string;
  text: string;
  photos: string[];
  videos: string[];
  davi: string;
  card?: string;
};

export type Content = {
  intro: { lines: string[] };
  davi: {
    name: string;
    age: number;
    photos: string[];
    lookingFor: string;
    about: string;
    prompt: { title: string; answer: string };
    basics: string[];
    interests: string[];
    more: [string, string][];
    song: { title: string; artist: string };
  };
  elena: { name: string; age: number; photos: string[] };
  chat: ChatItem[];
  cards: Record<string, Card>;
  memories: Record<string, Memory>;
  finale: { title: string; message: string; signature: string };
};

export const media = (name: string) => `/elena/media/${name}`;

/** Order of the album: the intro's card first, then the walk. */
export const CARD_ORDER = [
  "tinder",
  "panedoca",
  "casa-vo",
  "caldas",
  "pedido",
  "compromisso",
  "famiglia",
] as const;
