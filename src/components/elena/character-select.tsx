"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { LOOKS, makeHuman } from "./fp/humans";
import type { Outfit } from "./fp/types";
import type { Who } from "./types";

const OUTFITS: Record<Who, Outfit> = {
  elena: {
    top: "#f3eee6",
    topStyle: "tank",
    bottom: "#22252d",
    bottomStyle: "jeans",
    shoes: "#f2f2f2",
  },
  davi: {
    top: "#5a3b2b",
    topStyle: "tshirt",
    bottom: "#2f3542",
    bottomStyle: "jeans",
    shoes: "#f2f2f2",
  },
};

const OPTIONS: { who: Who; name: string; look: string }[] = [
  {
    who: "elena",
    name: "Elena",
    look: "Cabelo preto comprido e blusinha branca",
  },
  { who: "davi", name: "Davi", look: "Óculos, barba e a camiseta marrom" },
];

/** A little turntable with the character, rendered live. */
function Avatar({ who }: { who: Who }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#fff0f6", "#c78aa6", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 1.6);
    key.position.set(2, 4, 3);
    scene.add(key);
    const camera = new THREE.PerspectiveCamera(
      30,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      50,
    );
    camera.position.set(0, 1.5, 6);
    camera.lookAt(0, 1.05, 0);
    const person = makeHuman(LOOKS[who], OUTFITS[who]);
    scene.add(person.group);
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      person.group.rotation.y = Math.sin(t * 0.8) * 0.6;
      person.update(t, 1 / 60, 0);
      renderer.render(scene, camera);
    });
    return () => {
      renderer.setAnimationLoop(null);
      renderer.dispose();
    };
  }, [who]);
  return <canvas ref={ref} className="avatar-canvas" />;
}

export function CharacterSelect({
  onSelect,
}: {
  onSelect: (who: Who) => void;
}) {
  return (
    <div className="screen screen-pink select">
      <div className="select-inner">
        <h1>Quem vai jogar?</h1>
        <p>Escolha o seu personagem</p>
        <div className="select-options">
          {OPTIONS.map((o) => (
            <button
              key={o.who}
              type="button"
              className="select-card"
              onClick={() => onSelect(o.who)}
            >
              <Avatar who={o.who} />
              <strong>{o.name}</strong>
              <small>{o.look}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
