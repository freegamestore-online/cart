import { useRef, useEffect } from "react";
import { Shell } from "./components/Shell";
import * as BABYLON from "@babylonjs/core";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);

    new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3, 10, BABYLON.Vector3.Zero(), scene);
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    BABYLON.MeshBuilder.CreateBox("box", { size: 2 }, scene);
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
    const mat = new BABYLON.StandardMaterial("groundMat", scene);
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
    ground.material = mat;

    scene.clearColor = new BABYLON.Color4(0.06, 0.09, 0.16, 1);

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.dispose();
    };
  }, []);

  return (
    <Shell>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </Shell>
  );
}
