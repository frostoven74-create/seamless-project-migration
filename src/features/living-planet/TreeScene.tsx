import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type OrbitControlsImpl = { target: THREE.Vector3; update: () => void };
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GOALS, relatedGoals, pad } from "@/features/sdg/sdgs";
import { CATEGORIES } from "@/features/ripple-engine/pilot";
import type { PlanetOverlay, PlanetSelection } from "./planet-data";

/** WebGL colours mirror the CSS tokens in src/styles.css (three.js cannot read oklch vars). */
const C = {
  void: new THREE.Color("#020303"),
  bark: new THREE.Color("#2a3a30"),
  barkHi: new THREE.Color("#3c5244"),
  sprout: new THREE.Color("#A6D8A4"),
  biolume: new THREE.Color("#8EEAFF"),
  emerald: new THREE.Color("#4BBE83"),
  gold: new THREE.Color("#D8B982"),
  lichen: new THREE.Color("#A3ADA5"),
  dim: new THREE.Color("#3a4a40"),
  root: new THREE.Color("#22302a"),
};

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function taperedTube(curve: THREE.Curve<THREE.Vector3>, seg: number, radial: number, r0: number, r1: number) {
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const pos = g.attributes["position"] as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const p = curve.getPointAt(i / seg);
    const r = THREE.MathUtils.lerp(r0, r1, Math.pow(i / seg, 0.8));
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(p).multiplyScalar(r).add(p);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

type BranchL = {
  goal: number;
  curve: THREE.CatmullRomCurve3;
  tip: THREE.Vector3;
  mid: THREE.Vector3;
  twigs: { code: string; tip: THREE.Vector3; curve: THREE.QuadraticBezierCurve3 }[];
};

function buildLayout() {
  const rnd = mulberry32(2030);
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.4, 0),
    new THREE.Vector3(0.1, 1.1, 0.06),
    new THREE.Vector3(-0.08, 2.5, -0.05),
    new THREE.Vector3(0.06, 3.9, 0.04),
    new THREE.Vector3(0, 5.7, 0),
  ]);
  const branches: BranchL[] = GOALS.map((g, i) => {
    const t = i / 16;
    const y = 1.3 + t * 4.0;
    const a = i * GOLDEN + 0.6;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const len = 3.0 - t * 1.35;
    const up = 0.45 + t * 0.95;
    const base = trunk.getPointAt(Math.min(0.98, (y + 0.4) / 6.1));
    const j = () => (rnd() - 0.5) * 0.35;
    const p1 = base.clone().addScaledVector(dir, len * 0.35).add(new THREE.Vector3(j(), up * 0.2, j()));
    const p2 = base.clone().addScaledVector(dir, len * 0.7).add(new THREE.Vector3(j(), up * 0.65, j()));
    const tip = base.clone().addScaledVector(dir, len).add(new THREE.Vector3(0, up, 0));
    const curve = new THREE.CatmullRomCurve3([base, p1, p2, tip]);
    const n = g.targets.length;
    const twigs = g.targets.map((tg, k) => {
      const s = 0.28 + 0.68 * (k / Math.max(1, n - 1));
      const p = curve.getPointAt(s);
      const tan = curve.getTangentAt(s);
      const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
      side.applyAxisAngle(tan, k * 2.399 + rnd() * 0.6);
      const d = side.multiplyScalar(0.8).add(new THREE.Vector3(0, 0.55, 0)).add(tan.clone().multiplyScalar(0.3)).normalize();
      const l = 0.26 + rnd() * 0.32;
      const end = p.clone().addScaledVector(d, l);
      const ctrl = p.clone().addScaledVector(d, l * 0.5).add(new THREE.Vector3(0, l * 0.18, 0));
      return { code: tg.code, tip: end, curve: new THREE.QuadraticBezierCurve3(p, ctrl, end) };
    });
    return { goal: g.code, curve, tip, mid: curve.getPointAt(0.6), twigs };
  });
  const roots = CATEGORIES.map((c, k) => {
    const a = (k / CATEGORIES.length) * Math.PI * 2 + 0.4;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const pts = [
      new THREE.Vector3(0, -0.2, 0),
      dir.clone().multiplyScalar(0.7).add(new THREE.Vector3(0, -0.55, 0)),
      dir.clone().multiplyScalar(1.5).add(new THREE.Vector3((rnd() - 0.5) * 0.3, -1.05, (rnd() - 0.5) * 0.3)),
      dir.clone().multiplyScalar(2.3).add(new THREE.Vector3(0, -1.45, 0)),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    return { id: c.id, name: c.name, curve, tip: pts[3]!.clone() };
  });
  return { trunk, branches, roots };
}

function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Spores({ count }: { count: number }) {
  const tex = useGlowTexture();
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const rnd = mulberry32(7);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 1 + rnd() * 7;
      const a = rnd() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = -1.5 + rnd() * 9;
      positions[i * 3 + 2] = Math.sin(a) * r;
      speeds[i] = 0.002 + rnd() * 0.006;
    }
    return { positions, speeds };
  }, [count]);
  useFrame(() => {
    const p = ref.current;
    if (!p) return;
    const a = p.geometry.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = a.getY(i) + speeds[i]!;
      if (y > 7.5) y = -1.5;
      a.setY(i, y);
    }
    a.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={0.07}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={C.sprout}
        opacity={0.55}
      />
    </points>
  );
}

function Rig({
  focus,
  controls,
  interactive,
}: {
  focus: THREE.Vector3 | null;
  controls: React.RefObject<OrbitControlsImpl | null>;
  interactive: boolean;
}) {
  const { camera } = useThree();
  const anim = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    anim.current = 1.4;
  }, [focus]);
  useEffect(() => {
    if (interactive) return;
    const on = (e: PointerEvent) => {
      mouse.current.x = e.clientX / window.innerWidth - 0.5;
      mouse.current.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [interactive]);
  useFrame((_, dt) => {
    if (!interactive) {
      camera.position.x += (mouse.current.x * 1.6 - camera.position.x) * 0.03;
      camera.position.y += (3.4 - mouse.current.y * 1.2 - camera.position.y) * 0.03;
      camera.lookAt(0, 2.6, 0);
      return;
    }
    const c = controls.current;
    if (!c || anim.current <= 0) return;
    anim.current -= dt;
    const goal = focus ?? new THREE.Vector3(0, 2.4, 0);
    c.target.lerp(goal, 0.07);
    const away = goal.clone().setY(0);
    const dist = focus ? 4.6 : 11;
    const desired = focus
      ? goal.clone().add(away.lengthSq() < 0.01 ? new THREE.Vector3(0, 0.6, dist) : away.normalize().multiplyScalar(dist).add(new THREE.Vector3(0, 0.8, 0)))
      : new THREE.Vector3(camera.position.x, 3.2, camera.position.z).normalize().multiplyScalar(dist).setY(3.4);
    camera.position.lerp(desired, 0.05);
    c.update();
  });
  return null;
}

function Tree({
  selection,
  onSelect,
  overlay,
  interactive,
  hovered,
  setHovered,
}: {
  selection: PlanetSelection;
  onSelect: (s: PlanetSelection) => void;
  overlay: PlanetOverlay;
  interactive: boolean;
  hovered: number | null;
  setHovered: (g: number | null) => void;
}) {
  const layout = useMemo(() => buildLayout(), []);
  const tex = useGlowTexture();
  const group = useRef<THREE.Group>(null);

  const geo = useMemo(() => {
    const trunk = taperedTube(layout.trunk, 64, 12, 0.3, 0.05);
    const branches = layout.branches.map((b) => {
      const main = taperedTube(b.curve, 40, 8, 0.075, 0.012);
      const twigs = mergeGeometries(b.twigs.map((t) => taperedTube(t.curve, 8, 5, 0.016, 0.004)));
      const hit = new THREE.TubeGeometry(b.curve, 16, 0.2, 5, false);
      return { main, twigs, hit };
    });
    const roots = layout.roots.map((r) => ({
      main: taperedTube(r.curve, 32, 8, 0.14, 0.012),
      hit: new THREE.TubeGeometry(r.curve, 12, 0.2, 5, false),
    }));
    return { trunk, branches, roots };
  }, [layout]);

  const mats = useMemo(
    () =>
      layout.branches.map(
        () => new THREE.MeshStandardMaterial({ color: C.bark, roughness: 0.85, metalness: 0.05, emissive: C.sprout, emissiveIntensity: 0.03 }),
      ),
    [layout],
  );
  const rootMats = useMemo(
    () => layout.roots.map(() => new THREE.MeshStandardMaterial({ color: C.root, roughness: 0.9, emissive: C.biolume, emissiveIntensity: 0.04 })),
    [layout],
  );

  const selectedGoal =
    selection?.kind === "goal" ? selection.goal : selection?.kind === "target" ? Number(selection.code.split(".")[0]) : null;
  const related = useMemo(() => (selectedGoal ? relatedGoals(selectedGoal) : []), [selectedGoal]);
  const relatedSet = useMemo(() => new Set(related.map((r) => r.goal)), [related]);
  const rootGoals = useMemo(() => {
    if (selection?.kind !== "root") return new Set<number>();
    const c = CATEGORIES.find((x) => x.id === selection.category);
    return new Set((c?.targets ?? []).map((t) => Number(t.code.split(".")[0])));
  }, [selection]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    layout.branches.forEach((b, i) => {
      const m = mats[i]!;
      const sel = b.goal === selectedGoal;
      const rel = relatedSet.has(b.goal) || rootGoals.has(b.goal);
      const hov = b.goal === hovered;
      const targetE = sel ? 0.55 : hov ? 0.35 : rel ? 0.22 : selectedGoal || rootGoals.size ? 0.0 : 0.05 + Math.sin(t * 0.6 + i) * 0.02;
      m.emissiveIntensity += (targetE - m.emissiveIntensity) * Math.min(1, dt * 6);
      m.emissive.lerp(sel || hov ? C.sprout : rel ? C.biolume : C.sprout, 0.1);
      m.color.lerp(sel || hov || rel ? C.barkHi : C.bark, 0.1);
    });
    layout.roots.forEach((r, i) => {
      const m = rootMats[i]!;
      const sel = selection?.kind === "root" && selection.category === r.id;
      m.emissiveIntensity += ((sel ? 0.6 : 0.05) - m.emissiveIntensity) * Math.min(1, dt * 6);
    });
    if (group.current && !interactive) group.current.rotation.y += dt * 0.06;
  });

  // Target buds (169 official targets) as one instanced mesh.
  const budRef = useRef<THREE.InstancedMesh>(null);
  const allTwigs = useMemo(() => layout.branches.flatMap((b) => b.twigs.map((t) => ({ ...t, goal: b.goal }))), [layout]);
  useEffect(() => {
    const m = budRef.current;
    if (!m) return;
    const o = new THREE.Object3D();
    allTwigs.forEach((tw, i) => {
      const isSelT = selection?.kind === "target" && selection.code === tw.code;
      const inGoal = tw.goal === selectedGoal;
      o.position.copy(tw.tip);
      o.scale.setScalar(isSelT ? 2.4 : inGoal ? 1.4 : 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, isSelT ? C.gold : inGoal ? C.biolume : selectedGoal ? C.dim : C.sprout);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [allTwigs, selection, selectedGoal]);

  // Milestone leaves near branch tips — only verified leaves glow gold.
  const leafGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.08, 0.05, 0.09, 0.16, 0, 0.26);
    s.bezierCurveTo(-0.09, 0.16, -0.08, 0.05, 0, 0);
    return new THREE.ShapeGeometry(s, 6);
  }, []);
  const leafPlacements = useMemo(() => {
    const rnd = mulberry32(99);
    const per: Record<number, number> = {};
    return overlay.leaves.map((lf) => {
      const b = layout.branches.find((x) => x.goal === lf.goal)!;
      const k = (per[lf.goal] = (per[lf.goal] ?? 0) + 1);
      const s = Math.min(0.98, 0.72 + k * 0.06);
      const p = b.curve.getPointAt(s).add(new THREE.Vector3((rnd() - 0.5) * 0.3, 0.12 + rnd() * 0.18, (rnd() - 0.5) * 0.3));
      return { ...lf, p, rot: new THREE.Euler(rnd() * 1.2 - 0.6, rnd() * Math.PI * 2, rnd() * 1.2 - 0.6) };
    });
  }, [overlay.leaves, layout]);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = leafRef.current;
    if (!m) return;
    const o = new THREE.Object3D();
    leafPlacements.forEach((lf, i) => {
      o.position.copy(lf.p);
      o.rotation.copy(lf.rot);
      o.scale.setScalar(lf.status === "verified" ? 1.25 : 0.9);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(
        i,
        lf.status === "verified" ? C.gold : lf.status === "planned" ? C.dim : lf.status === "needs_changes" ? C.dim : C.sprout.clone().multiplyScalar(0.55),
      );
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [leafPlacements]);
  const verifiedGlow = useMemo(() => {
    const v = leafPlacements.filter((l) => l.status === "verified");
    const arr = new Float32Array(v.length * 3);
    v.forEach((l, i) => arr.set([l.p.x, l.p.y + 0.12, l.p.z], i * 3));
    return arr;
  }, [leafPlacements]);

  // Buds (proposed interventions) and shoots (active projects).
  const budsArr = useMemo(() => {
    const pts: number[] = [];
    for (const b of layout.branches) {
      const n = overlay.buds[b.goal]?.length ?? 0;
      for (let k = 0; k < Math.min(n, 6); k++) {
        const p = b.curve.getPointAt(Math.min(1, 0.92 + k * 0.015));
        pts.push(p.x + Math.cos(k * 2.1) * 0.12, p.y + 0.1 + k * 0.05, p.z + Math.sin(k * 2.1) * 0.12);
      }
    }
    return new Float32Array(pts);
  }, [overlay.buds, layout]);
  const shoots = useMemo(
    () =>
      layout.branches.flatMap((b) =>
        (overlay.shoots[b.goal] ?? []).slice(0, 4).map((sh, k) => {
          const base = b.curve.getPointAt(0.5 + k * 0.1);
          return { key: `${b.goal}-${sh.id}`, pts: [base, base.clone().add(new THREE.Vector3(0.05, 0.35, 0.02)), base.clone().add(new THREE.Vector3(0.02, 0.6, -0.04))] };
        }),
      ),
    [overlay.shoots, layout],
  );

  const arcs = useMemo(() => {
    if (!selectedGoal) return [];
    const a = layout.branches.find((b) => b.goal === selectedGoal)!;
    return related.map((r) => {
      const b = layout.branches.find((x) => x.goal === r.goal)!;
      const mid = a.tip.clone().add(b.tip).multiplyScalar(0.5);
      mid.y += 1.2;
      mid.add(mid.clone().setY(0).normalize().multiplyScalar(0.8));
      const curve = new THREE.QuadraticBezierCurve3(a.tip, mid, b.tip);
      return { goal: r.goal, kind: r.kind, pts: curve.getPoints(40) };
    });
  }, [selectedGoal, related, layout]);

  const click = (fn: () => void) => (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    if (e.delta > 6) return;
    fn();
  };
  const over = (g: number) => (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    setHovered(g);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHovered(null);
    document.body.style.cursor = "";
  };

  return (
    <group ref={group}>
      <mesh geometry={geo.trunk}>
        <meshStandardMaterial color={C.bark} roughness={0.9} emissive={C.sprout} emissiveIntensity={0.03} />
      </mesh>

      {layout.branches.map((b, i) => (
        <group key={b.goal}>
          <mesh geometry={geo.branches[i]!.main} material={mats[i]!} />
          <mesh geometry={geo.branches[i]!.twigs} material={mats[i]!} />
          <mesh
            geometry={geo.branches[i]!.hit}
            onClick={click(() => onSelect({ kind: "goal", goal: b.goal }))}
            onPointerOver={over(b.goal)}
            onPointerOut={out}
          >
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {interactive && (
            <Html position={b.tip} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
              <span
                className={`whitespace-nowrap font-mono text-[10px] tracking-[0.12em] transition-opacity duration-300 ${
                  b.goal === selectedGoal || b.goal === hovered
                    ? "text-bone opacity-100"
                    : selectedGoal && !relatedSet.has(b.goal)
                      ? "text-lichen opacity-30"
                      : "text-lichen opacity-80"
                }`}
              >
                {pad(b.goal)}
                {(b.goal === hovered || b.goal === selectedGoal) && (
                  <span className="ml-2 font-sans text-xs tracking-normal">{GOALS[b.goal - 1]?.short}</span>
                )}
              </span>
            </Html>
          )}
        </group>
      ))}

      <instancedMesh
        ref={budRef}
        args={[undefined, undefined, allTwigs.length]}
        onClick={(e) => {
          if (!interactive || e.instanceId === undefined || e.delta > 6) return;
          e.stopPropagation();
          const tw = allTwigs[e.instanceId];
          if (tw) onSelect({ kind: "target", code: tw.code });
        }}
      >
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {layout.roots.map((r, i) => (
        <group key={r.id}>
          <mesh geometry={geo.roots[i]!.main} material={rootMats[i]!} />
          <mesh
            geometry={geo.roots[i]!.hit}
            onClick={click(() => onSelect({ kind: "root", category: r.id }))}
            onPointerOver={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={out}
          >
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh position={r.tip}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshBasicMaterial color={C.biolume} toneMapped={false} />
          </mesh>
          {interactive && (
            <Html position={r.tip} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
              <span className="mt-6 block whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] text-biolume/70">
                {r.name.split(" ")[0]}
              </span>
            </Html>
          )}
        </group>
      ))}

      {leafPlacements.length > 0 && (
        <instancedMesh key={leafPlacements.length} ref={leafRef} args={[undefined, undefined, leafPlacements.length]}>
          <primitive object={leafGeo} attach="geometry" />
          <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
        </instancedMesh>
      )}
      {verifiedGlow.length > 0 && (
        <points key={`g${verifiedGlow.length}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[verifiedGlow, 3]} />
          </bufferGeometry>
          <pointsMaterial map={tex} size={0.9} transparent depthWrite={false} blending={THREE.AdditiveBlending} color={C.gold} opacity={0.6} />
        </points>
      )}
      {budsArr.length > 0 && (
        <points key={`b${budsArr.length}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[budsArr, 3]} />
          </bufferGeometry>
          <pointsMaterial map={tex} size={0.35} transparent depthWrite={false} blending={THREE.AdditiveBlending} color={C.biolume} opacity={0.9} />
        </points>
      )}
      {shoots.map((s) => (
        <Line key={s.key} points={s.pts} color={C.emerald} lineWidth={2} />
      ))}
      {arcs.map((a) => (
        <Line
          key={a.goal}
          points={a.pts}
          color={a.kind === "synergy" ? C.biolume : a.kind === "trade-off" ? C.gold : C.lichen}
          lineWidth={1.2}
          transparent
          opacity={0.75}
          dashed={a.kind !== "synergy"}
          dashSize={0.12}
          gapSize={0.08}
        />
      ))}

      {[1.6, 3.2, 4.8, 6.4].map((r) => (
        <mesh key={r} rotation-x={-Math.PI / 2} position-y={-0.35}>
          <ringGeometry args={[r, r + 0.006, 128]} />
          <meshBasicMaterial color={C.lichen} transparent opacity={0.12} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.36}>
        <planeGeometry args={[9, 9]} />
        <meshBasicMaterial map={tex} color={C.emerald} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function TreeScene({
  selection,
  onSelect,
  overlay,
  interactive = true,
  reducedMotion = false,
}: {
  selection: PlanetSelection;
  onSelect: (s: PlanetSelection) => void;
  overlay: PlanetOverlay;
  interactive?: boolean;
  reducedMotion?: boolean;
}) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const [small, setSmall] = useState(false);
  useEffect(() => {
    setSmall(window.innerWidth < 768);
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const layout = useMemo(() => buildLayout(), []);
  const focus = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === "goal") return layout.branches.find((b) => b.goal === selection.goal)?.mid ?? null;
    if (selection.kind === "target") {
      for (const b of layout.branches) {
        const t = b.twigs.find((x) => x.code === selection.code);
        if (t) return t.tip;
      }
      return null;
    }
    const r = layout.roots.find((x) => x.id === selection.category);
    return r ? r.curve.getPointAt(0.6) : null;
  }, [selection, layout]);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={small ? 1 : [1, 1.75]}
        camera={{ position: [0, 3.4, 11], fov: 38, near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={() => interactive && onSelect(null)}
        style={interactive ? undefined : { pointerEvents: "none" }}
        aria-hidden
      >
        <color attach="background" args={[C.void]} />
        <fog attach="fog" args={[C.void, 9, 24]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 9, 5]} intensity={1.4} color={C.gold} />
        <directionalLight position={[-6, 3, -4]} intensity={0.5} color={C.biolume} />
        <pointLight position={[0, -1.2, 0]} intensity={6} distance={5} color={C.biolume} />
        <Tree
          selection={selection}
          onSelect={onSelect}
          overlay={overlay}
          interactive={interactive}
          hovered={hovered}
          setHovered={setHovered}
        />
        <Spores count={small ? 160 : 520} />
        {interactive && (
          <OrbitControls
            ref={controls as never}
            makeDefault
            target={[0, 2.4, 0]}
            enablePan
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={18}
            maxPolarAngle={Math.PI * 0.62}
            autoRotate={!selection && !reducedMotion}
            autoRotateSpeed={0.35}
          />
        )}
        <Rig focus={focus} controls={controls} interactive={interactive} />
      </Canvas>
    </div>
  );
}
