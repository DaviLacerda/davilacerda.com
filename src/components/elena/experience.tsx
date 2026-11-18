"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { TinderIntro } from "./tinder-intro";
import { media, type Content } from "./types";

const Game = dynamic(() => import("./game-screen").then((m) => m.Game), {
  ssr: false,
  loading: () => <Loading text="Montando o nosso mundinho…" />,
});

const STORAGE = "elena-progress-v1";

type Progress = { intro: boolean; collected: string[]; done: boolean };

function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw)
      return {
        intro: false,
        collected: [],
        done: false,
        ...(JSON.parse(raw) as Partial<Progress>),
      };
  } catch {
    // private mode or blocked storage: start fresh
  }
  return { intro: false, collected: [], done: false };
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

  const update = useCallback((patch: Partial<Progress>) => {
    setProgress((p) => {
      const next = { ...(p ?? readProgress()), ...patch };
      saveProgress(next);
      return next;
    });
  }, []);

  if (failed)
    return <Loading text="Não consegui abrir agora. Recarrega a página? 💭" />;
  if (!content || !progress)
    return <Loading text="Carregando as nossas memórias…" />;

  if (!progress.intro) {
    return (
      <TinderIntro
        content={content}
        onDone={() =>
          update({
            intro: true,
            collected: Array.from(new Set([...progress.collected, "tinder"])),
          })
        }
      />
    );
  }

  return (
    <Game
      content={content}
      collected={progress.collected}
      onCollect={(id) =>
        update({ collected: Array.from(new Set([...progress.collected, id])) })
      }
      onFinish={() => update({ done: true })}
      onReplayIntro={() => update({ intro: false })}
      onReset={() => update({ intro: false, collected: [], done: false })}
    />
  );
}
