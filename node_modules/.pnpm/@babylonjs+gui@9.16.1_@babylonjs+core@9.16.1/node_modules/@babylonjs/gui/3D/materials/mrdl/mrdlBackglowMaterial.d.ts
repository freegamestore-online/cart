/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./mrdlBackglowMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./mrdlBackglowMaterial.pure.js";
import "./shaders/mrdlBackglow.fragment.js";
import "./shaders/mrdlBackglow.vertex.js";
