"use client";

import { useEffect, useRef, useState } from "react";

import { Interior } from "./fp/engine";
import { SCENES } from "./scenes";

/** Development only: loads a single scene full screen (see /elena/dev/<id>). */
export function SceneHarness({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    const canvas = ref.current;
    const loader = SCENES[id];
    if (!canvas || !loader) return;
    const params = new URLSearchParams(window.location.search);
    const who = params.get("as") === "davi" ? "davi" : "elena";
    const interior = new Interior(canvas, who, {
      onFocus: (f) => setStatus(f ? "focus" : "ready"),
      onBubble: () => undefined,
      onExit: () => setStatus("exit"),
      onReady: () => setStatus("ready"),
    });
    let alive = true;
    loader()
      .then((m) =>
        alive
          ? interior.load(m.default, params.get("opened") === "1")
          : undefined,
      )
      .catch((e: unknown) => setStatus(`error: ${String(e)}`));
    return () => {
      alive = false;
      interior.dispose();
    };
  }, [id]);
  return (
    <div className="game">
      <canvas ref={ref} className="game-canvas" />
      <p
        data-status={status}
        style={{
          position: "fixed",
          left: 8,
          bottom: 8,
          margin: 0,
          color: "#fff",
          font: "12px monospace",
        }}
      >
        {id}: {status}
      </p>
    </div>
  );
}
