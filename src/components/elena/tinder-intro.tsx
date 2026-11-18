"use client";

import { useEffect, useRef, useState } from "react";

import { CardReveal } from "./card-reveal";
import { chime } from "./sound";
import { media, type ChatItem, type Content } from "./types";

type Stage = "lines" | "profile" | "match" | "chat" | "card";

/**
 * The beginning, on a phone: Davi's profile on the dating app (photos, bio,
 * interests), Elena likes it, it's a match, their first conversation replays,
 * and the first card is revealed.
 */
export function TinderIntro({
  content,
  onDone,
}: {
  content: Content;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("lines");

  if (stage === "card") {
    const card = content.cards.tinder;
    return (
      <div className="screen screen-pink">
        {card && (
          <CardReveal
            image={media(card.image)}
            title={card.title}
            badge="Carta 1 de 7"
            action="Começar a nossa história"
            onDone={onDone}
          />
        )}
      </div>
    );
  }

  return (
    <div className="screen screen-pink">
      {stage === "lines" ? (
        <IntroLines
          lines={content.intro.lines}
          onDone={() => setStage("profile")}
        />
      ) : (
        <div className="phone">
          <div className="phone-notch" aria-hidden />
          <StatusBar />
          {stage === "profile" && (
            <Profile content={content} onLike={() => setStage("match")} />
          )}
          {stage === "match" && (
            <Match content={content} onNext={() => setStage("chat")} />
          )}
          {stage === "chat" && (
            <Chat content={content} onDone={() => setStage("card")} />
          )}
        </div>
      )}
    </div>
  );
}

function IntroLines({
  lines,
  onDone,
}: {
  lines: string[];
  onDone: () => void;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) {
      const t = setTimeout(onDone, 1600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setShown((s) => s + 1),
      shown === 0 ? 400 : 1500,
    );
    return () => clearTimeout(t);
  }, [shown, lines.length, onDone]);

  return (
    <button type="button" className="intro-lines" onClick={onDone}>
      {lines.map((line, i) => (
        <span key={i} className={i < shown ? "is-on" : ""}>
          {line}
        </span>
      ))}
      <small>toque para pular</small>
    </button>
  );
}

function StatusBar() {
  return (
    <div className="status-bar" aria-hidden>
      <span>8:41</span>
      <span className="status-icons">
        <i className="bars" />
        <i className="wifi" />
        <i className="battery">65</i>
      </span>
    </div>
  );
}

function Flame() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <defs>
        <linearGradient id="flame" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="#ff4f8b" />
          <stop offset="1" stopColor="#ff8a5c" />
        </linearGradient>
      </defs>
      <path
        fill="url(#flame)"
        d="M12.6 2.2c.4 3-1.4 4.6-2.9 6.2-1.6 1.6-3.2 3.3-3.2 6.1A5.5 5.5 0 0 0 12 20a6 6 0 0 0 6-6c0-2.3-1-3.9-2-5.1-.2 1.4-.9 2.4-2 2.9.6-3.7-.3-7.2-1.4-9.6Z"
      />
    </svg>
  );
}

function Profile({
  content,
  onLike,
}: {
  content: Content;
  onLike: () => void;
}) {
  const { davi } = content;
  const [photo, setPhoto] = useState(0);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState<"like" | null>(null);
  const [nope, setNope] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  const moved = useRef(false);

  const like = () => {
    if (leaving) return;
    setLeaving("like");
    chime("match");
    setTimeout(onLike, 650);
  };

  const refuse = () => {
    setNope(true);
    chime("pop");
    setDrag(0);
    setTimeout(() => setNope(false), 2200);
  };

  const onDown = (e: React.PointerEvent) => {
    start.current = e.clientX;
    moved.current = false;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    if (Math.abs(dx) > 6) moved.current = true;
    setDrag(dx);
  };
  const onUp = (e: React.PointerEvent) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    start.current = null;
    setDragging(false);
    if (dx > 90) return like();
    if (dx < -90) return refuse();
    setDrag(0);
    if (!moved.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const left = e.clientX - rect.left < rect.width / 2;
      setPhoto((p) =>
        left ? Math.max(0, p - 1) : Math.min(davi.photos.length - 1, p + 1),
      );
    }
  };

  const style = leaving
    ? {
        transform: "translateX(140%) rotate(24deg)",
        transition: "transform .6s ease-in",
      }
    : {
        transform: `translateX(${drag}px) rotate(${drag / 18}deg)`,
        transition: dragging ? "none" : "transform .3s",
      };

  return (
    <div className="app">
      <header className="app-header">
        <Flame />
        <span className="app-title">Para você</span>
      </header>
      <div className="profile-scroll">
        <div className="profile-card" style={style}>
          <div
            className="profile-photo"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => {
              start.current = null;
              setDragging(false);
              setDrag(0);
            }}
          >
            {davi.photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated media
              <img
                key={p}
                src={media(p)}
                alt=""
                draggable={false}
                className={i === photo ? "is-on" : ""}
              />
            ))}
            <div className="photo-bars">
              {davi.photos.map((p, i) => (
                <i key={p} className={i === photo ? "is-on" : ""} />
              ))}
            </div>
            <div
              className="stamp stamp-like"
              style={{ opacity: Math.max(0, drag / 90) }}
            >
              LIKE
            </div>
            <div
              className="stamp stamp-nope"
              style={{ opacity: Math.max(0, -drag / 90) }}
            >
              NOPE
            </div>
            <div className="photo-info">
              <h2>
                {davi.name} <span>{davi.age}</span>
              </h2>
              <p>📍 a 1 quilômetro daqui</p>
            </div>
          </div>

          <section className="pf-section">
            <h3>🔍 Tô procurando</h3>
            <p className="pf-big">{davi.lookingFor}</p>
          </section>
          <section className="pf-section">
            <h3>❝ Sobre mim</h3>
            <p>{davi.about}</p>
          </section>
          <section className="pf-section">
            <h3>❝ {davi.prompt.title}</h3>
            <p className="pf-big">{davi.prompt.answer}</p>
          </section>
          <section className="pf-section">
            <h3>Informações básicas</h3>
            <ul className="pf-list">
              {davi.basics.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
          <section className="pf-section">
            <h3>Interesses</h3>
            <div className="pf-chips">
              {davi.interests.map((i) => (
                <span key={i}>{i}</span>
              ))}
            </div>
          </section>
          <section className="pf-section">
            <h3>Mais informações</h3>
            <dl className="pf-dl">
              {davi.more.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="pf-section">
            <h3>♫ Minha música</h3>
            <p>
              <strong>{davi.song.title}</strong> · {davi.song.artist}
            </p>
          </section>
        </div>
      </div>
      {nope && (
        <div className="nope-toast">Tem certeza? Olha esse sorriso 🥺</div>
      )}
      <footer className="app-actions">
        <button
          type="button"
          className="act act-nope"
          onClick={refuse}
          aria-label="Não"
        >
          ✕
        </button>
        <button
          type="button"
          className="act act-like"
          onClick={like}
          aria-label="Curtir"
        >
          ♥
        </button>
      </footer>
      <p className="app-hint">Arraste para a direita ou toque no ♥</p>
    </div>
  );
}

function Match({ content, onNext }: { content: Content; onNext: () => void }) {
  return (
    <div className="match">
      <div className="match-hearts" aria-hidden>
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={{ ["--i" as string]: i }}>
            ♥
          </span>
        ))}
      </div>
      <h2 className="match-title">Deu match!</h2>
      <p>Você e {content.davi.name} curtiram um ao outro.</p>
      <div className="match-faces">
        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated media */}
        <img
          src={media(content.elena.photos[2] ?? content.elena.photos[0] ?? "")}
          alt="Elena"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated media */}
        <img src={media(content.davi.photos[0] ?? "")} alt="Davi" />
        <span>♥</span>
      </div>
      <button type="button" className="btn-primary" onClick={onNext}>
        Mandar mensagem
      </button>
    </div>
  );
}

function Chat({ content, onDone }: { content: Content; onDone: () => void }) {
  const items = content.chat;
  const [shown, setShown] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const done = shown >= items.length;
  const pending = items[shown];
  const typing = pending && "from" in pending ? pending.from : null;

  useEffect(() => {
    if (done) return;
    const next = items[shown];
    if (!next) return;
    if (!("from" in next)) {
      const t = setTimeout(() => setShown((s) => s + 1), 350);
      return () => clearTimeout(t);
    }
    const wait = Math.min(2200, 650 + next.text.length * 14);
    const t = setTimeout(() => {
      setShown((s) => s + 1);
      chime("pop");
    }, wait);
    return () => clearTimeout(t);
  }, [shown, done, items]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [shown, typing]);

  const avatar = media(content.davi.photos[0] ?? "");

  return (
    <div className="chat">
      <header className="chat-header">
        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated media */}
        <img src={avatar} alt="" />
        <span>{content.davi.name}</span>
      </header>
      <div className="chat-list" ref={listRef}>
        <p className="chat-system">Você deu match com Davi em 8/8/26</p>
        {items.slice(0, shown).map((item, i) => (
          <ChatRow key={i} item={item} avatar={avatar} />
        ))}
        {typing && (
          <div className={`bubble-row ${typing === "elena" ? "me" : ""}`}>
            <div className="bubble typing">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
      </div>
      <footer className="chat-footer">
        {done ? (
          <button type="button" className="btn-primary" onClick={onDone}>
            Guardar essa conversa 💗
          </button>
        ) : (
          <>
            <div className="chat-input">Digite uma mensagem</div>
            <button
              type="button"
              className="chat-skip"
              onClick={() => setShown(items.length)}
            >
              Pular ⏩
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function ChatRow({ item, avatar }: { item: ChatItem; avatar: string }) {
  if ("day" in item) return <p className="chat-day">{item.day}</p>;
  if ("system" in item) return <p className="chat-system">{item.system} ❤️</p>;
  const me = item.from === "elena";
  return (
    <>
      {item.time && <p className="chat-time">{item.time}</p>}
      <div className={`bubble-row ${me ? "me" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated media */}
        {!me && <img className="bubble-avatar" src={avatar} alt="" />}
        <div className="bubble">
          {item.text}
          {item.heart && <span className="bubble-heart">❤️</span>}
        </div>
      </div>
    </>
  );
}
