"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { packTexture } from "./game/kit";
import { chime, crinkle } from "./sound";

type PackCard = {
  image: string;
  title: string;
  badge: string;
  special?: boolean;
};

type Props = {
  label: string;
  cards: PackCard[];
  onDone: () => void;
};

/*
 * A pack ripped in 3D, in your hands: a glossy foil pack under a spotlight.
 * Drag along the top seal and the crimped strip peels off slowly, foil
 * flakes fly, light spills out of the opening, then the cards rise out of
 * the pack. Tap to flip each one; special cards come with a rainbow foil,
 * a light burst and sparkles. Tilt (mouse or phone) to catch the shine.
 */

const PACK_W = 1.0;
const PACK_H = 1.62;
const CARD_W = 0.84;
const CARD_H = CARD_W * (1482 / 1062);

function cardBack() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 716;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 512, 716);
  grad.addColorStop(0, "#c2255c");
  grad.addColorStop(1, "#5a1a6e");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 716);
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.lineWidth = 2;
  for (let i = -716; i < 716; i += 26) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 716, 716);
    g.stroke();
  }
  g.strokeStyle = "#ffd27a";
  g.lineWidth = 14;
  g.strokeRect(18, 18, 476, 680);
  g.fillStyle = "#fff6d6";
  g.font = "240px serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("♥", 256, 340);
  g.font = "600 30px Georgia, serif";
  g.fillText("NOSSA HISTÓRIA", 256, 600);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Rainbow foil that shifts with the view angle and the pointer. */
function holoMaterial(strength: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uTilt: { value: new THREE.Vector2() },
      uStrength: { value: strength },
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform float uTime; uniform vec2 uTilt; uniform float uStrength;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0); }
      void main(){
        float f = pow(1.0 - abs(dot(vN, vV)), 1.5);
        float band = vUv.x * 1.6 + vUv.y * 1.1 + uTilt.x * 1.4 - uTilt.y * 0.9 + uTime * 0.05;
        vec3 c = hue(fract(band));
        float lines = 0.55 + 0.45 * sin((vUv.x + vUv.y) * 160.0);
        float glare = smoothstep(0.18, 0.0, abs(vUv.x - 0.5 - uTilt.x * 0.6 + (vUv.y - 0.5) * 0.4));
        gl_FragColor = vec4(c * (0.25 + f) * lines * uStrength + vec3(1.0) * glare * 0.35 * uStrength, 1.0);
      }`,
  });
}

export function PackRip({ label, cards, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"tear" | "cards" | "done">("tear");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const api = useRef<{
    tear: (p: number) => void;
    open: () => void;
    flip: () => void;
    next: () => void;
    tilt: (x: number, y: number) => void;
  } | null>(null);
  const tearRef = useRef(0);
  const drag = useRef<{ x0: number } | null>(null);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
    scene.environmentIntensity = 0.9;
    pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 4.4);
    const key = new THREE.SpotLight("#fff1e0", 40, 12, 0.5, 0.6);
    key.position.set(1.5, 3, 4);
    scene.add(key, key.target);
    const rim = new THREE.PointLight("#ff8fb8", 8, 8);
    rim.position.set(-2, 1, -1);
    scene.add(rim);
    scene.add(new THREE.AmbientLight("#ffffff", 0.25));

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.6, 0.85);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
      camera.aspect = w / h;
      camera.position.z = w / h < 0.75 ? 5.6 : 4.4;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // ---------- the pack ----------
    const pack = new THREE.Group();
    scene.add(pack);
    const art = packTexture(label);
    const foil = new THREE.MeshPhysicalMaterial({
      color: "#ffb3cf",
      metalness: 1,
      roughness: 0.22,
      iridescence: 1,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [200, 800],
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const face = new THREE.MeshPhysicalMaterial({
      map: art,
      metalness: 0.55,
      roughness: 0.25,
      iridescence: 0.9,
      iridescenceIOR: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });
    const bodyH = PACK_H * 0.88;
    const body = new THREE.Mesh(
      new RoundedBoxGeometry(PACK_W, bodyH, 0.07, 4, 0.03),
      [foil, foil, foil, foil, face, face],
    );
    // the art fills the front: map UVs of the front face already span 0..1
    body.position.y = -PACK_H * 0.06;
    pack.add(body);
    // crimp at the bottom
    const crimpMat = new THREE.MeshPhysicalMaterial({
      color: "#e05a8c",
      metalness: 1,
      roughness: 0.3,
      iridescence: 1,
    });
    const bottomCrimp = new THREE.Mesh(
      new THREE.BoxGeometry(PACK_W * 1.02, 0.08, 0.03),
      crimpMat,
    );
    bottomCrimp.position.y = body.position.y - bodyH / 2 - 0.02;
    pack.add(bottomCrimp);
    // the top strip that tears: a plane with many columns bent by the tear progress
    const stripH = PACK_H * 0.12;
    const stripGeo = new THREE.PlaneGeometry(PACK_W * 1.02, stripH, 60, 4);
    const stripBase = (
      stripGeo.attributes.position as THREE.BufferAttribute
    ).array.slice();
    const strip = new THREE.Mesh(
      stripGeo,
      new THREE.MeshPhysicalMaterial({
        color: "#d63f78",
        metalness: 1,
        roughness: 0.25,
        iridescence: 1,
        side: THREE.DoubleSide,
      }),
    );
    const stripY = body.position.y + bodyH / 2 + stripH / 2 - 0.005;
    strip.position.set(0, stripY, 0.0);
    pack.add(strip);
    // light spilling from the opening
    const spill = new THREE.Mesh(
      new THREE.PlaneGeometry(PACK_W * 1.3, 0.8),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uA: { value: 0 } },
        vertexShader:
          "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "uniform float uA; varying vec2 vUv; void main(){ float d = smoothstep(1.0, 0.0, vUv.y) * smoothstep(0.5, 0.0, abs(vUv.x - 0.5)); gl_FragColor = vec4(vec3(1.0, 0.92, 0.8) * d * uA * 2.0, 1.0); }",
      }),
    );
    spill.position.set(0, stripY + 0.35, 0.05);
    pack.add(spill);

    const setTear = (p: number) => {
      const pos = stripGeo.attributes.position as THREE.BufferAttribute;
      const half = (PACK_W * 1.02) / 2;
      for (let i = 0; i < pos.count; i++) {
        const bx = stripBase[i * 3]!;
        const by = stripBase[i * 3 + 1]!;
        const u = (bx + half) / (half * 2); // 0..1 along the seal
        const torn = Math.max(0, p - u); // how far behind the tear point
        const lift = torn * 1.6;
        pos.setXYZ(
          i,
          bx + torn * 0.08,
          by + lift * 0.25 + (by + stripH / 2) * lift * 0.4,
          Math.sin(lift) * 0.25 * (u < p ? 1 : 0),
        );
      }
      pos.needsUpdate = true;
      stripGeo.computeVertexNormals();
      (spill.material as THREE.ShaderMaterial).uniforms.uA!.value = p * 0.6;
    };
    setTear(0);

    // foil flakes
    const flakes: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = [];
    const flakeGeo = new THREE.PlaneGeometry(0.03, 0.02);
    const spawnFlake = (x: number) => {
      const m = new THREE.Mesh(flakeGeo, crimpMat);
      m.position.set(x, stripY, 0.05);
      pack.add(m);
      flakes.push({
        m,
        v: new THREE.Vector3(
          (Math.random() - 0.3) * 0.8,
          0.6 + Math.random() * 0.8,
          Math.random() * 0.6,
        ),
        life: 1.2,
      });
    };

    // ---------- the cards ----------
    const loader = new THREE.TextureLoader();
    const back = cardBack();
    const stack = cards.map((c, i) => {
      const g = new THREE.Group();
      const tex = loader.load(c.image);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const front = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshPhysicalMaterial({
          map: tex,
          roughness: 0.35,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
        }),
      );
      front.position.z = 0.002;
      const backM = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshPhysicalMaterial({
          map: back,
          roughness: 0.4,
          clearcoat: 1,
        }),
      );
      backM.rotation.y = Math.PI;
      backM.position.z = -0.002;
      const holo = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        holoMaterial(c.special ? 1 : 0.28),
      );
      holo.position.z = 0.004;
      g.add(front, backM, holo);
      g.rotation.y = Math.PI; // back facing the camera
      g.position.set(0, -0.2, -0.03 - i * 0.01);
      g.visible = false;
      scene.add(g);
      return {
        g,
        holo,
        special: !!c.special,
        flip: 0,
        target: Math.PI,
        out: 0,
      };
    });
    let current = 0;
    let opened = 0; // 0..1 cards rising out of the pack
    let opening = false;
    const sparks = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(180 * 3), 3),
      ),
      new THREE.PointsMaterial({
        color: "#fff2c0",
        size: 0.035,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(sparks);
    const sparkVel: THREE.Vector3[] = Array.from(
      { length: 180 },
      () => new THREE.Vector3(),
    );
    const burst = () => {
      const pos = sparks.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 180; i++) {
        pos.setXYZ(i, 0, 0.1, 0.2);
        const a = Math.random() * Math.PI * 2;
        const s = 0.6 + Math.random() * 1.6;
        sparkVel[i]!.set(Math.cos(a) * s, Math.sin(a) * s, Math.random() * 0.5);
      }
      pos.needsUpdate = true;
      (sparks.material as THREE.PointsMaterial).opacity = 1;
    };

    const tilt = new THREE.Vector2();
    const tiltTarget = new THREE.Vector2();

    api.current = {
      tear: (p) => {
        const prev = tearRef.current;
        tearRef.current = p;
        setTear(p);
        if (p > prev + 0.01) {
          spawnFlake(-PACK_W / 2 + p * PACK_W);
          if (Math.random() < 0.5) spawnFlake(-PACK_W / 2 + p * PACK_W);
        }
      },
      open: () => {
        opening = true;
        stack.forEach((s, i) => (s.g.visible = i >= 0));
      },
      flip: () => {
        const s = stack[current];
        if (!s) return;
        s.target = 0;
        if (s.special) burst();
      },
      next: () => {
        const s = stack[current];
        if (s) s.out = 0.0001;
        current++;
      },
      tilt: (x, y) => tiltTarget.set(x, y),
    };

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      tilt.lerp(tiltTarget, Math.min(1, dt * 6));
      // idle float and tilt of the pack
      pack.rotation.y = tilt.x * 0.5 + Math.sin(t * 0.7) * 0.05;
      pack.rotation.x = -tilt.y * 0.35 + Math.sin(t * 0.9) * 0.03;
      pack.position.y = Math.sin(t * 1.2) * 0.03;
      key.position.x = 1.5 + tilt.x * 2;
      // flakes
      for (let i = flakes.length - 1; i >= 0; i--) {
        const f = flakes[i]!;
        f.life -= dt;
        f.v.y -= 2.5 * dt;
        f.m.position.addScaledVector(f.v, dt);
        f.m.rotation.x += dt * 9;
        f.m.rotation.z += dt * 7;
        if (f.life <= 0) {
          pack.remove(f.m);
          flakes.splice(i, 1);
        }
      }
      // opening: the strip flies off, the pack sinks, the cards rise
      if (opening) {
        opened = Math.min(1, opened + dt * 0.55);
        strip.position.x += dt * 2.5;
        strip.position.y += dt * 1.8;
        strip.rotation.z -= dt * 3;
        pack.position.y -= opened * 1.4;
        (body.material as THREE.Material[]).forEach(
          (m) => ((m as THREE.MeshPhysicalMaterial).opacity = 1),
        );
        stack.forEach((s, i) => {
          if (s.out > 0) return;
          const rise = THREE.MathUtils.smoothstep(opened, 0.1 + i * 0.05, 0.85);
          s.g.position.y = -0.9 + rise * 0.95 + (i - current) * -0.004;
          s.g.position.z = 0.1 - (i - current) * 0.012 + rise * 0.3;
        });
      }
      stack.forEach((s, i) => {
        s.flip += (s.target - s.flip) * Math.min(1, dt * 7);
        s.g.rotation.y = s.flip + (i === current ? tilt.x * 0.35 : 0);
        s.g.rotation.x = i === current ? -tilt.y * 0.25 : 0;
        if (s.out > 0) {
          s.out += dt * 1.6;
          s.g.position.x += dt * 5 * s.out;
          s.g.position.y += dt * 1.5;
          s.g.rotation.z -= dt * 2;
          if (s.out > 1.2) s.g.visible = false;
        }
        const hm = s.holo.material as THREE.ShaderMaterial;
        hm.uniforms.uTime!.value = t;
        hm.uniforms.uTilt!.value.copy(tilt);
      });
      // sparkles
      const sm = sparks.material as THREE.PointsMaterial;
      if (sm.opacity > 0) {
        const pos = sparks.geometry.attributes
          .position as THREE.BufferAttribute;
        for (let i = 0; i < 180; i++) {
          const v = sparkVel[i]!;
          v.multiplyScalar(1 - dt * 1.2);
          pos.setXYZ(
            i,
            pos.getX(i) + v.x * dt,
            pos.getY(i) + v.y * dt,
            pos.getZ(i) + v.z * dt,
          );
        }
        pos.needsUpdate = true;
        sm.opacity = Math.max(0, sm.opacity - dt * 0.45);
      }
      composer.render(dt);
    });

    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tiltTarget.set(
        THREE.MathUtils.clamp(e.gamma / 35, -1, 1),
        THREE.MathUtils.clamp((e.beta - 45) / 35, -1, 1),
      );
    };
    window.addEventListener("deviceorientation", onTilt);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      window.removeEventListener("deviceorientation", onTilt);
      composer.dispose();
      renderer.dispose();
      api.current = null;
    };
    // the pack is built once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishTear = () => {
    if (phaseRef.current !== "tear") return;
    api.current?.tear(1);
    chime("reveal");
    api.current?.open();
    setTimeout(() => setPhase("cards"), 1400);
  };

  const autoTear = () => {
    let p = tearRef.current;
    const step = () => {
      p = Math.min(1, p + 0.012);
      api.current?.tear(p);
      if (Math.random() < 0.6) crinkle();
      if (p < 1) requestAnimationFrame(step);
      else finishTear();
    };
    requestAnimationFrame(step);
  };

  const card = cards[index];

  return (
    <div
      className="rip"
      onPointerMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        api.current?.tilt(
          ((e.clientX - r.left) / r.width - 0.5) * 2,
          ((e.clientY - r.top) / r.height - 0.5) * 2,
        );
        if (drag.current && phase === "tear") {
          const p = Math.max(
            tearRef.current,
            Math.min(1, (e.clientX - r.left - r.width * 0.3) / (r.width * 0.4)),
          );
          if (p > tearRef.current + 0.008) {
            api.current?.tear(p);
            crinkle();
          }
        }
      }}
      onPointerDown={(e) => {
        if (phase === "tear") {
          drag.current = { x0: e.clientX };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }
      }}
      onPointerUp={() => {
        if (phase !== "tear" || !drag.current) return;
        drag.current = null;
        if (tearRef.current > 0.75) finishTear();
      }}
    >
      <canvas ref={canvasRef} className="rip-canvas" />
      <div className="rip-ui">
        {phase === "tear" && (
          <>
            <p className="rip-title">{label}</p>
            <p className="rip-hint">
              Arraste o dedo da esquerda para a direita, devagar, para rasgar o
              lacre
            </p>
            <button type="button" className="map-link" onClick={autoTear}>
              ou toque aqui para rasgar
            </button>
          </>
        )}
        {phase === "cards" && card && (
          <div className="rip-cards">
            <p className="rip-title">
              {flipped ? card.title : `${index + 1} de ${cards.length}`}
            </p>
            {flipped && (
              <p className="rip-badge">
                {card.special ? "✨ Edição especial · " : ""}
                {card.badge}
              </p>
            )}
            {!flipped ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  api.current?.flip();
                  setFlipped(true);
                  chime(card.special ? "finale" : "reveal");
                }}
              >
                Virar a carta
              </button>
            ) : index < cards.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  api.current?.next();
                  setIndex((i) => i + 1);
                  setFlipped(false);
                }}
              >
                Próxima carta
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setPhase("done");
                  onDone();
                }}
              >
                Guardar no binder
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
