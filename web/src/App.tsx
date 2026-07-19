import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Color3,
  Color4,
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  Mesh,
} from "@babylonjs/core";
import { useHighScore } from "./hooks/useHighScore";

// ─── Constants ────────────────────────────────────────────────────────────────
const LANE_X = [-2.8, 0, 2.8] as const;
const SEGMENT_LEN = 12;
const NUM_SEGMENTS = 18;
const INITIAL_SPEED = 0.18;
const CART_Y = 0.55;
const LANE_LERP = 0.14;
const TRACK_W = 7.2;

type GameState = "playing" | "paused" | "gameover";

interface Segment {
  floor: Mesh;
  lw: Mesh;
  rw: Mesh;
  zStart: number;
}

interface Coin {
  mesh: Mesh;
  z: number;
  collected: boolean;
}

interface Obstacle {
  mesh: Mesh;
  z: number;
  hit: boolean;
}

// ─── Pure scene helpers (no closure over React state) ─────────────────────────

function makeMat(scene: Scene, r: number, g: number, b: number): StandardMaterial {
  const m = new StandardMaterial("m_" + Math.random(), scene);
  m.diffuseColor = new Color3(r, g, b);
  return m;
}

function buildSegment(scene: Scene, zStart: number, idx: number): Segment {
  const wallH = 1.4;
  const floor = MeshBuilder.CreateBox("fl", { width: TRACK_W, height: 0.3, depth: SEGMENT_LEN }, scene);
  floor.position.set(0, 0, zStart + SEGMENT_LEN / 2);
  floor.material = makeMat(scene, idx % 2 === 0 ? 0.55 : 0.45, idx % 2 === 0 ? 0.9 : 0.82, idx % 2 === 0 ? 0.55 : 0.45);

  const wallMat = makeMat(scene, 0.95, 0.6, 0.2);
  const lw = MeshBuilder.CreateBox("lw", { width: 0.35, height: wallH, depth: SEGMENT_LEN }, scene);
  lw.position.set(-TRACK_W / 2 - 0.175, wallH / 2, zStart + SEGMENT_LEN / 2);
  lw.material = wallMat;

  const rw = MeshBuilder.CreateBox("rw", { width: 0.35, height: wallH, depth: SEGMENT_LEN }, scene);
  rw.position.set(TRACK_W / 2 + 0.175, wallH / 2, zStart + SEGMENT_LEN / 2);
  rw.material = wallMat;

  return { floor, lw, rw, zStart };
}

function spawnCoin(scene: Scene, laneIdx: number, z: number): Coin {
  const mesh = MeshBuilder.CreateCylinder("coin", { diameter: 0.58, height: 0.12, tessellation: 20 }, scene);
  mesh.position.set(LANE_X[laneIdx] ?? 0, CART_Y + 0.35, z);
  mesh.rotation.x = Math.PI / 2;
  const m = makeMat(scene, 1, 0.85, 0.1);
  m.emissiveColor = new Color3(0.4, 0.3, 0);
  mesh.material = m;
  return { mesh, z, collected: false };
}

function spawnObstacle(scene: Scene, laneIdx: number, z: number): Obstacle {
  const mesh = MeshBuilder.CreateBox("obs", { width: 1.15, height: 1.15, depth: 1.15 }, scene);
  mesh.position.set(LANE_X[laneIdx] ?? 0, CART_Y + 0.05, z);
  mesh.material = makeMat(scene, 0.9, 0.2, 0.2);
  return { mesh, z, hit: false };
}

function populateSegment(
  scene: Scene,
  zStart: number,
  segIdx: number,
  coins: Coin[],
  obstacles: Obstacle[]
) {
  if (segIdx < 3) {
    // Safe intro — just a coin
    const lane = Math.floor(Math.random() * 3);
    coins.push(spawnCoin(scene, lane, zStart + 3 + Math.random() * (SEGMENT_LEN - 5)));
    return;
  }

  const r = Math.random();
  if (r < 0.5) {
    // Row of coins
    const count = 1 + Math.floor(Math.random() * 3);
    const lane = Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      coins.push(spawnCoin(scene, lane, zStart + 2 + i * 1.5 + Math.random() * 0.4));
    }
  } else if (r < 0.85) {
    // Obstacle + coin on safe lane
    const obsLane = Math.floor(Math.random() * 3);
    const obsZ = zStart + 4 + Math.random() * (SEGMENT_LEN - 6);
    obstacles.push(spawnObstacle(scene, obsLane, obsZ));
    const coinLane = (obsLane + 1 + Math.floor(Math.random() * 2)) % 3;
    coins.push(spawnCoin(scene, coinLane, zStart + 2 + Math.random() * 2));
  } else {
    // Two obstacles, one safe lane
    const a = Math.floor(Math.random() * 3);
    const b = (a + 1) % 3;
    const z1 = zStart + 3 + Math.random() * (SEGMENT_LEN - 5);
    const z2 = zStart + 3 + Math.random() * (SEGMENT_LEN - 5);
    obstacles.push(spawnObstacle(scene, a, z1));
    obstacles.push(spawnObstacle(scene, b, z2));
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [score, setScore] = useState(0);
  const [highScore, updateHighScore] = useHighScore("cart_highscore");

  // Mutable game refs — updated every frame without re-renders
  const stateRef = useRef<GameState>("playing");
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const cartZRef = useRef(0);
  const cartLaneRef = useRef(1);
  const cartXRef = useRef<number>(LANE_X[1]);
  const cartTargetXRef = useRef<number>(LANE_X[1]);
  const cartMeshRef = useRef<Mesh | null>(null);
  const segmentsRef = useRef<Segment[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const nextSegZRef = useRef(0);
  const segCountRef = useRef(0);
  const frameRef = useRef(0);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  const syncState = useCallback((s: GameState) => {
    stateRef.current = s;
    setGameState(s);
  }, []);

  const syncScore = useCallback(
    (s: number) => {
      scoreRef.current = s;
      setScore(s);
      updateHighScore(s);
    },
    [updateHighScore]
  );

  // ── Babylon setup (runs once) ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: false });
    engineRef.current = engine;
    const scene = new Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new Color4(0.53, 0.81, 0.98, 1);

    // Camera
    const camera = new ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3.5, 14, new Vector3(0, 2, 0), scene);
    camera.lowerRadiusLimit = 14;
    camera.upperRadiusLimit = 14;

    // Lights
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.75;
    const dir = new DirectionalLight("dir", new Vector3(-1, -2, -1), scene);
    dir.intensity = 0.6;

    // Cart body
    const cartBody = MeshBuilder.CreateBox("cart", { width: 1.1, height: 0.7, depth: 1.5 }, scene);
    cartBody.position.set(LANE_X[1], CART_Y, 0);
    cartBody.material = makeMat(scene, 0.18, 0.52, 0.96);
    cartMeshRef.current = cartBody;

    // Wheels
    const wheelMat = makeMat(scene, 0.15, 0.15, 0.15);
    const wOff: [number, number, number][] = [[-0.5, -0.32, -0.6], [0.5, -0.32, -0.6], [-0.5, -0.32, 0.6], [0.5, -0.32, 0.6]];
    wOff.forEach(([wx, wy, wz]) => {
      const w = MeshBuilder.CreateCylinder("wh", { diameter: 0.38, height: 0.22, tessellation: 16 }, scene);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      w.material = wheelMat;
      w.parent = cartBody;
    });

    // Handle
    const handle = MeshBuilder.CreateBox("hdl", { width: 1.1, height: 0.1, depth: 0.12 }, scene);
    handle.position.set(0, 0.42, -0.68);
    handle.material = makeMat(scene, 0.7, 0.7, 0.75);
    handle.parent = cartBody;

    // Initial track
    segmentsRef.current = [];
    coinsRef.current = [];
    obstaclesRef.current = [];
    nextSegZRef.current = 0;
    segCountRef.current = 0;

    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const z = i * SEGMENT_LEN;
      segmentsRef.current.push(buildSegment(scene, z, i));
      populateSegment(scene, z, i, coinsRef.current, obstaclesRef.current);
      nextSegZRef.current = z + SEGMENT_LEN;
      segCountRef.current = i + 1;
    }

    // Render loop
    scene.onBeforeRenderObservable.add(() => {
      if (stateRef.current !== "playing") return;

      const dt = engine.getDeltaTime() / 1000;
      speedRef.current = Math.min(speedRef.current + 0.00004, 0.55);
      cartZRef.current += speedRef.current * 60 * dt;

      // Smooth lane lerp
      const tX = cartTargetXRef.current;
      cartXRef.current += (tX - cartXRef.current) * LANE_LERP;

      const cart = cartMeshRef.current;
      if (cart) {
        cart.position.z = cartZRef.current;
        cart.position.x = cartXRef.current;
        cart.rotation.z = -(tX - cartXRef.current) * 0.08;
      }

      // Camera follows cart
      camera.target.set(cartXRef.current * 0.3, 2, cartZRef.current - 2);

      const cartZ = cartZRef.current;

      // Recycle segments
      for (const seg of segmentsRef.current) {
        if (seg.zStart + SEGMENT_LEN < cartZ - SEGMENT_LEN) {
          const newZ = nextSegZRef.current;
          const off = newZ - seg.zStart;
          seg.floor.position.z += off;
          seg.lw.position.z += off;
          seg.rw.position.z += off;
          seg.zStart = newZ;
          populateSegment(scene, newZ, segCountRef.current, coinsRef.current, obstaclesRef.current);
          segCountRef.current++;
          nextSegZRef.current += SEGMENT_LEN;
        }
      }

      // Cull old coins/obstacles
      coinsRef.current = coinsRef.current.filter((c) => {
        if (c.z < cartZ - SEGMENT_LEN * 2) { c.mesh.dispose(); return false; }
        return true;
      });
      obstaclesRef.current = obstaclesRef.current.filter((o) => {
        if (o.z < cartZ - SEGMENT_LEN * 2) { o.mesh.dispose(); return false; }
        return true;
      });

      // Spin coins
      frameRef.current++;
      for (const c of coinsRef.current) {
        if (!c.collected) c.mesh.rotation.y += 0.06;
      }

      // Coin collision
      const cx = cartXRef.current;
      for (const c of coinsRef.current) {
        if (c.collected) continue;
        if (Math.abs(c.z - cartZ) < 1.1 && Math.abs(c.mesh.position.x - cx) < 1.1) {
          c.collected = true;
          c.mesh.isVisible = false;
          syncScore(scoreRef.current + 10);
        }
      }

      // Obstacle collision
      for (const o of obstaclesRef.current) {
        if (o.hit) continue;
        if (Math.abs(o.z - cartZ) < 1.0 && Math.abs(o.mesh.position.x - cx) < 1.0) {
          o.hit = true;
          syncState("gameover");
        }
      }

      // Distance score tick
      if (frameRef.current % 90 === 0) {
        syncScore(scoreRef.current + 1);
      }
    });

    engine.runRenderLoop(() => scene.render());

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard input ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s = stateRef.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (s !== "playing") return;
        const next = Math.max(0, cartLaneRef.current - 1);
        cartLaneRef.current = next;
        cartTargetXRef.current = LANE_X[next] ?? 0;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (s !== "playing") return;
        const next = Math.min(2, cartLaneRef.current + 1);
        cartLaneRef.current = next;
        cartTargetXRef.current = LANE_X[next] ?? 0;
      } else if (e.key === " " || e.key === "Escape") {
        if (s === "playing") syncState("paused");
        else if (s === "paused") syncState("playing");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [syncState]);

  // ── Restart ────────────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    coinsRef.current.forEach((c) => c.mesh.dispose());
    obstaclesRef.current.forEach((o) => o.mesh.dispose());
    coinsRef.current = [];
    obstaclesRef.current = [];

    segmentsRef.current.forEach((s) => { s.floor.dispose(); s.lw.dispose(); s.rw.dispose(); });
    segmentsRef.current = [];

    cartZRef.current = 0;
    cartLaneRef.current = 1;
    cartXRef.current = LANE_X[1];
    cartTargetXRef.current = LANE_X[1];
    speedRef.current = INITIAL_SPEED;
    frameRef.current = 0;
    nextSegZRef.current = 0;
    segCountRef.current = 0;
    scoreRef.current = 0;
    setScore(0);

    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const z = i * SEGMENT_LEN;
      segmentsRef.current.push(buildSegment(scene, z, i));
      populateSegment(scene, z, i, coinsRef.current, obstaclesRef.current);
      nextSegZRef.current = z + SEGMENT_LEN;
      segCountRef.current = i + 1;
    }

    const cart = cartMeshRef.current;
    if (cart) {
      cart.position.set(LANE_X[1], CART_Y, 0);
      cart.rotation.z = 0;
    }

    syncState("playing");
  }, [syncState]);

  // ── Touch swipe ────────────────────────────────────────────────────────────
  const touchStartX = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (stateRef.current !== "playing") return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) < 20) return;
    if (dx < 0) {
      const next = Math.max(0, cartLaneRef.current - 1);
      cartLaneRef.current = next;
      cartTargetXRef.current = LANE_X[next] ?? 0;
    } else {
      const next = Math.min(2, cartLaneRef.current + 1);
      cartLaneRef.current = next;
      cartTargetXRef.current = LANE_X[next] ?? 0;
    }
  }, []);

  // ── Lane button handler ────────────────────────────────────────────────────
  const moveLeft = useCallback(() => {
    if (stateRef.current !== "playing") return;
    const next = Math.max(0, cartLaneRef.current - 1);
    cartLaneRef.current = next;
    cartTargetXRef.current = LANE_X[next] ?? 0;
  }, []);
  const moveRight = useCallback(() => {
    if (stateRef.current !== "playing") return;
    const next = Math.min(2, cartLaneRef.current + 1);
    cartLaneRef.current = next;
    cartTargetXRef.current = LANE_X[next] ?? 0;
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full" style={{ background: "#87cefd" }}>
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-3 pb-2 pointer-events-none">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">Score</span>
          <span className="text-2xl font-extrabold text-white drop-shadow-md leading-none">{score}</span>
        </div>
        <div className="px-4 py-1 rounded-full font-bold text-white/90 text-lg shadow"
          style={{ background: "rgba(0,0,0,0.22)", fontFamily: "Fraunces, serif" }}>
          🛒 Cart
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">Best</span>
          <span className="text-2xl font-extrabold text-white drop-shadow-md leading-none">{highScore}</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: "none" }}
      />

      {/* Mobile lane buttons */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-between px-6 md:hidden">
        <button
          onPointerDown={moveLeft}
          className="w-16 h-16 rounded-full text-3xl font-bold text-white shadow-xl active:scale-95 transition-transform select-none"
          style={{ background: "rgba(20,60,200,0.72)", minWidth: 56, minHeight: 56 }}
          aria-label="Move left"
        >←</button>
        <button
          onPointerDown={moveRight}
          className="w-16 h-16 rounded-full text-3xl font-bold text-white shadow-xl active:scale-95 transition-transform select-none"
          style={{ background: "rgba(20,60,200,0.72)", minWidth: 56, minHeight: 56 }}
          aria-label="Move right"
        >→</button>
      </div>

      {/* Desktop hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/60 text-xs font-medium hidden md:block pointer-events-none select-none">
        ← → or A / D to change lanes · Space to pause
      </div>

      {/* Paused overlay */}
      {gameState === "paused" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-3xl px-10 py-8 flex flex-col items-center gap-5 shadow-2xl">
            <span className="text-4xl font-extrabold" style={{ fontFamily: "Fraunces, serif" }}>⏸ Paused</span>
            <button
              onClick={() => syncState("playing")}
              className="px-10 py-3 rounded-full text-white font-bold text-xl shadow-lg active:scale-95 transition-transform"
              style={{ background: "#1e50c8", minHeight: 48 }}
            >Resume</button>
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="bg-white rounded-3xl px-10 py-8 flex flex-col items-center gap-5 shadow-2xl" style={{ minWidth: 280 }}>
            <span className="text-4xl font-extrabold" style={{ fontFamily: "Fraunces, serif", color: "#e02020" }}>
              💥 Crashed!
            </span>
            <div className="flex gap-10 text-center">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Score</div>
                <div className="text-4xl font-extrabold text-gray-800">{score}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Best</div>
                <div className="text-4xl font-extrabold text-yellow-500">{highScore}</div>
              </div>
            </div>
            <button
              onClick={restart}
              className="px-10 py-3 rounded-full text-white font-bold text-xl shadow-lg active:scale-95 transition-transform"
              style={{ background: "#1e50c8", minHeight: 48 }}
            >🛒 Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}
