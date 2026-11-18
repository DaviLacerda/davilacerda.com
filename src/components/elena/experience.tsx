"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { TinderIntro } from "./tinder-intro";
import { media, type Content, type Who } from "./types";

const Game = dynamic(() => import("./game-screen").then((m) => m.Game), {
  ssr: false,
  loading: () => <Loading text="Montando as nossas ilhas…" />,
});

const CharacterSelect = dynamic(
  () => import("./character-select").then((m) => m.CharacterSelect),
  {
    ssr: false,
    loading: () => <Loading text="Separando as roupas…" />,
  },
);

const STORAGE = "elena-progress-v2";

type Progress = {
  skin: Who | null;
  intro: boolean;
  /** Cards in the binder. */
  cards: string[];
  /** Islands whose pack was opened. */
  opened: string[];
  done: boolean;
};

const EMPTY: Progress = {
  skin: null,
  intro: false,
  cards: [],
  opened: [],
  done: false,
};

function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    // private mode or blocked storage: start fresh
  }
  return EMPTY;
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function Loading({ text }: { text: string }) {
  return (
    <div className="screen screen-pink loading">
      <div className="loading-heart">♥</div>
      <p>{text}</p>
    </div>
  );
}

const uniq = (a: string[]) => Array.from(new Set(a));

export function Experience() {
  const [content, setContent] = useState<Content | null>(null);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage once
    setProgress(readProgress());
    fetch(media("content.json"))
      .then((r) =>
        r.ok
          ? (r.json() as Promise<Content>)
          : Promise.reject(new Error(String(r.status))),
      )
      .then(setContent)
      .catch(() => setFailed(true));
  }, []);

  const update = useCallback((patch: (p: Progress) => Partial<Progress>) => {
    setProgress((p) => {
      const base = p ?? readProgress();
      const next = { ...base, ...patch(base) };
      saveProgress(next);
      return next;
    });
  }, []);

  if (failed)
    return <Loading text="Não consegui abrir agora. Recarrega a página? 💭" />;
  if (!content || !progress)
    return <Loading text="Carregando as nossas memórias…" />;

  if (!progress.skin)
    return <CharacterSelect onSelect={(skin) => update(() => ({ skin }))} />;

  if (!progress.intro) {
    return (
      <TinderIntro
        content={content}
        me={progress.skin}
        onDone={() =>
          update((p) => ({ intro: true, cards: uniq([...p.cards, "tinder"]) }))
        }
      />
    );
  }

  return (
    <Game
      key={progress.skin}
      content={content}
      skin={progress.skin}
      cards={progress.cards}
      opened={progress.opened}
      onOpenPack={(island, cards) =>
        update((p) => ({
          opened: uniq([...p.opened, island]),
          cards: uniq([...p.cards, ...cards]),
        }))
      }
      onFinish={() => update(() => ({ done: true }))}
      onReplayIntro={() => update(() => ({ intro: false }))}
      onChangeSkin={() => update(() => ({ skin: null }))}
      onReset={() => update(() => EMPTY)}
    />
  );
}
