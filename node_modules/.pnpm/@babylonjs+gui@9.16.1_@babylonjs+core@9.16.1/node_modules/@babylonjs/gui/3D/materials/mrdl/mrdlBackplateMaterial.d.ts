/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./mrdlBackplateMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./mrdlBackplateMaterial.pure.js";
import "./shaders/mrdlBackplate.fragment.js";
import "./shaders/mrdlBackplate.vertex.js";
