"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { unlock, type UnlockState } from "@/app/elena/actions";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function LockScreen() {
  const [state, action, pending] = useActionState<UnlockState, FormData>(
    unlock,
    { error: false, attempt: 0 },
  );
  const [pin, setPin] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [lastAttempt, setLastAttempt] = useState(0);

  // A wrong PIN clears the dots (adjusting state while rendering, not in an effect).
  if (state.attempt !== lastAttempt) {
    setLastAttempt(state.attempt);
    setPin("");
  }

  useEffect(() => {
    if (pin.length === 4 && !pending) formRef.current?.requestSubmit();
  }, [pin, pending]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key))
        setPin((p) => (p.length < 4 ? p + event.key : p));
      if (event.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const press = (key: string) => {
    if (pending) return;
    if (key === "⌫") setPin((p) => p.slice(0, -1));
    else if (key) setPin((p) => (p.length < 4 ? p + key : p));
  };

  return (
    <main className="lock">
      <div className="lock-hearts" aria-hidden>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={{ ["--i" as string]: i }}>
            ♥
          </span>
        ))}
      </div>
      <form ref={formRef} action={action} className="lock-card">
        <div className="lock-envelope" aria-hidden>
          💌
        </div>
        <h1>Para Elena</h1>
        <p>Digite a nossa senha</p>
        <input type="hidden" name="pin" value={pin} />
        <div
          className={`lock-dots ${state.error && pin === "" ? "lock-shake" : ""}`}
          key={state.attempt}
          aria-label={`${pin.length} de 4 dígitos`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i < pin.length ? "on" : ""}>
              ♥
            </span>
          ))}
        </div>
        <p className="lock-error" aria-live="polite">
          {state.error && pin === ""
            ? "Hmm, não é essa… tenta de novo 💭"
            : " "}
        </p>
        <div className="lock-pad">
          {KEYS.map((key, i) => (
            <button
              key={i}
              type="button"
              disabled={!key || pending}
              onClick={() => press(key)}
              aria-label={key === "⌫" ? "Apagar" : key || undefined}
            >
              {key}
            </button>
          ))}
        </div>
      </form>
    </main>
  );
}
