import React, { useRef, useEffect, useState } from "react";
import { Color3, Engine, Scene, ArcRotateCamera, HemisphericLight, MeshBuilder, StandardMaterial, Vector3, ActionManager, ExecuteCodeAction, Scene as BabylonScene, Mesh, Animation, Sound } from "@babylonjs/core";
import { GameShell, GameTopbar } from "@freegamestore/games";
import { useHighScore } from "./hooks/useHighScore";

const TRACK_LENGTH = 60;
const COIN_COUNT = 25;
const OBSTACLE_COUNT = 10;
const CART_SPEED = 0.22;
const CART_RADIUS = 0.7;
const TRACK_RADIUS = 4;
const COIN_RADIUS = 0.32;
const OBSTACLE_RADIUS = 0.6;

function randomOnTrack(t: number) {
  // Returns Vector3 for a point along the track (a gentle S curve)
  const angle = t * Math.PI * 2;
  const x = Math.sin(angle * 0.4) * TRACK_RADIUS;
  const z = t * TRACK_LENGTH - TRACK_LENGTH / 2;
  const y = Math.cos(angle * 0.25) * 1.2;
  return new Vector3(x, y, z);
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useHighScore("cart_highscore");
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [uiState, setUiState] = useState<'playing'|'gameover'|'paused'>('playing');

  // Game objects
  const cartRef = useRef<Mesh | null>(null);
  const coinsRef = useRef<{ mesh: Mesh; collected: boolean }[]>([]);
  const obstaclesRef = useRef<Mesh[]>([]);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [scene, setScene] = useState<BabylonScene | null>(null);

  // Cart state
  const cartT = useRef(0.05); // Progress along track
  const laneOffset = useRef(0); // -1, 0, 1: left/center/right

  // SFX
  const coinSoundRef = useRef<Sound | null>(null);
  const crashSoundRef = useRef<Sound | null>(null);

  // Input
  useEffect(() => {
    if (!scene) return;
    const onKeyboard = (evt: any) => {
      if (uiState !== 'playing') return;
      if (evt.type === "keydown") {
        if (evt.event.key === "ArrowLeft") laneOffset.current = Math.max(-1, laneOffset.current - 1);
        if (evt.event.key === "ArrowRight") laneOffset.current = Math.min(1, laneOffset.current + 1);
        if (evt.event.key === " " && !isGameOver) setIsPaused(p => !p);
      }
    };
    scene.onKeyboardObservable.add(onKeyboard);
    return () => { scene.onKeyboardObservable.remove(onKeyboard); };
  }, [scene, uiState, isGameOver]);

  // Touch input
  useEffect(() => {
    function handleTouch(e: TouchEvent) {
      if (uiState !== 'playing') return;
      if (!canvasRef.current) return;
      const x = e.touches[0]?.clientX;
      const w = canvasRef.current.offsetWidth;
      if (!x || !w) return;
      laneOffset.current = x < w / 2 ? Math.max(-1, laneOffset.current - 1) : Math.min(1, laneOffset.current + 1);
    }
    window.addEventListener('touchstart', handleTouch);
    return () => window.removeEventListener('touchstart', handleTouch);
  }, [uiState]);

  // Main Babylon setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, true);
    setEngine(engine);
    const scene = new Scene(engine);
    setScene(scene);

    // Camera
    const camera = new ArcRotateCamera("camera", Math.PI/2, Math.PI/3, 16, new Vector3(0, 2, 0), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 24;
    camera.wheelPrecision = 100;
    camera.setTarget(new Vector3(0, 2, 0));

    // Light
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 1.1;

    // Track
    const trackPoints = Array.from({length: TRACK_LENGTH}, (_, i) => {
      return randomOnTrack(i/TRACK_LENGTH);
    });
    const track = MeshBuilder.CreateTube("track", {
      path: trackPoints,
      radius: 1.1,
      tessellation: 32,
    }, scene);
    const trackMat = new StandardMaterial("trackMat", scene);
    trackMat.diffuseColor = new Color3(0.88, 0.96, 1);
    track.material = trackMat;

    // Cart
    const cart = MeshBuilder.CreateSphere("cart", {diameter: CART_RADIUS*2}, scene);
    cart.position.copyFrom(randomOnTrack(cartT.current));
    cart.position.x += laneOffset.current * 2.2;
    const cartMat = new StandardMaterial("cartMat", scene);
    cartMat.diffuseColor = new Color3(0.16, 0.56, 0.91);
    cart.material = cartMat;
    cartRef.current = cart;

    // Coins
    coinsRef.current = Array.from({length: COIN_COUNT}, (_, i) => {
      const t = 0.12 + (i * 0.7 / COIN_COUNT);
      const pos = randomOnTrack(t);
      pos.x += [-2.2, 0, 2.2][Math.floor(Math.random()*3)];
      const coin = MeshBuilder.CreateCylinder("coin", {diameter: COIN_RADIUS*2, height: 0.18}, scene);
      coin.position.copyFrom(pos);
      const coinMat = new StandardMaterial("coinMat", scene);
      coinMat.diffuseColor = new Color3(1, 0.87, 0.22);
      coin.material = coinMat;
      coin.rotation.z = Math.PI/2;
      coin.actionManager = new ActionManager(scene);
      return { mesh: coin, collected: false };
    });

    // Obstacles
    obstaclesRef.current = Array.from({length: OBSTACLE_COUNT}, (_, i) => {
      const t = 0.18 + (i * 0.7 / OBSTACLE_COUNT);
      const pos = randomOnTrack(t);
      pos.x += [-2.2, 0, 2.2][Math.floor(Math.random()*3)];
      const obs = MeshBuilder.CreateBox("obstacle", {size: OBSTACLE_RADIUS*2}, scene);
      obs.position.copyFrom(pos);
      const obsMat = new StandardMaterial("obsMat", scene);
      obsMat.diffuseColor = new Color3(0.98, 0.36, 0.32);
      obs.material = obsMat;
      obs.actionManager = new ActionManager(scene);
      return obs;
    });

    // SFX
    coinSoundRef.current = new Sound("coin", "https://cdn.jsdelivr.net/gh/FreeGameStore/audio/coin.wav", scene, undefined, { volume: 0.7, autoplay: false });
    crashSoundRef.current = new Sound("crash", "https://cdn.jsdelivr.net/gh/FreeGameStore/audio/crash.wav", scene, undefined, { volume: 0.7, autoplay: false });

    // Animate
    scene.onBeforeRenderObservable.add(() => {
      if (isPaused || isGameOver || uiState !== 'playing') return;
      cartT.current += CART_SPEED * engine.getDeltaTime() / 1200;
      if (cartT.current > 0.99) {
        setIsGameOver(true);
        setUiState('gameover');
        setHighScore(score);
        return;
      }
      // Cart position
      const basePos = randomOnTrack(cartT.current);
      cart.position.copyFrom(basePos);
      cart.position.x += laneOffset.current * 2.2;
      // Coin rotation
      coinsRef.current.forEach(({mesh, collected}) => {
        if (!collected) mesh.rotation.y += 0.05;
      });
      // Collision: coins
      coinsRef.current.forEach(c => {
        if (c.collected) return;
        if (cart.position.subtract(c.mesh.position).length() < CART_RADIUS + COIN_RADIUS) {
          c.collected = true;
          c.mesh.isVisible = false;
          setScore(s => s+1);
          if (audioEnabled && coinSoundRef.current) coinSoundRef.current.play();
        }
      });
      // Collision: obstacles
      obstaclesRef.current.forEach(obs => {
        if (cart.position.subtract(obs.position).length() < CART_RADIUS + OBSTACLE_RADIUS) {
          setIsGameOver(true);
          setUiState('gameover');
          setHighScore(score);
          if (audioEnabled && crashSoundRef.current) crashSoundRef.current.play();
        }
      });
      // Move camera
      camera.setTarget(cart.position);
      camera.alpha = Math.PI/2 + Math.sin(cartT.current*2)*0.15;
      camera.beta = Math.PI/2.7;
      camera.radius = 14;
    });

    engine.runRenderLoop(() => {
      scene.render();
    });
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    return () => {
      engine.dispose();
      window.removeEventListener("resize", resize);
      setEngine(null);
      setScene(null);
    };
  }, [audioEnabled]);

  // UI controls
  function handleRestart() {
    setScore(0);
    setIsGameOver(false);
    setUiState('playing');
    cartT.current = 0.05;
    laneOffset.current = 0;
    // Rebuild scene
    setAudioEnabled(audioEnabled); // triggers Babylon re-init
  }

  function handlePause() {
    if (isGameOver) return;
    setIsPaused(p => !p);
    setUiState(uiState === 'paused' ? 'playing' : 'paused');
  }

  function handleAudio() {
    setAudioEnabled(a => !a);
  }

  // Responsive canvas sizing
  useEffect(() => {
    if (!canvasRef.current) return;
    function resizeCanvas() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvasRef.current!.width = w;
      canvasRef.current!.height = h - 64;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // UI overlay
  return (
    <GameShell>
      <GameTopbar title="Cart" />
      <div className="relative w-full h-[calc(100vh-64px)] bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 dark:from-blue-900 dark:via-blue-800 dark:to-blue-700">
        <canvas ref={canvasRef} className="block w-full h-full" style={{touchAction: 'none'}} />
        <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-white/70 dark:bg-blue-900/80 rounded-xl px-5 py-2 flex gap-6 text-xl font-fraunces shadow-lg pointer-events-auto">
            <span>Score: {score}</span>
            <span>High: {highScore}</span>
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto">
          <button onClick={handlePause} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-3 font-manrope text-lg shadow-md min-w-[44px]">
            {uiState==='paused' ? 'Resume' : 'Pause'}
          </button>
          <button onClick={handleRestart} className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 rounded-full px-6 py-3 font-manrope text-lg shadow-md min-w-[44px]">
            Restart
          </button>
          <button onClick={handleAudio} className="bg-white/90 dark:bg-blue-900 text-blue-600 dark:text-yellow-300 rounded-full px-6 py-3 font-manrope text-lg shadow-md min-w-[44px]">
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </div>
        {uiState==='gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-100/80 dark:bg-blue-900/80">
            <div className="rounded-xl bg-white/90 dark:bg-blue-900/90 p-7 shadow-2xl">
              <h1 className="font-fraunces text-4xl text-blue-600 dark:text-yellow-300 mb-4">Game Over!</h1>
              <p className="font-manrope text-xl mb-2">Final Score: {score}</p>
              <p className="font-manrope text-lg mb-4">High Score: {highScore}</p>
              <button onClick={handleRestart} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-3 font-manrope text-xl shadow-md min-w-[44px]">Play Again</button>
            </div>
          </div>
        )}
        {uiState==='paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-100/80 dark:bg-blue-900/80">
            <div className="rounded-xl bg-white/90 dark:bg-blue-900/90 p-7 shadow-2xl">
              <h1 className="font-fraunces text-3xl text-blue-600 dark:text-yellow-300 mb-4">Paused</h1>
              <button onClick={handlePause} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-3 font-manrope text-xl shadow-md min-w-[44px]">Resume</button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
