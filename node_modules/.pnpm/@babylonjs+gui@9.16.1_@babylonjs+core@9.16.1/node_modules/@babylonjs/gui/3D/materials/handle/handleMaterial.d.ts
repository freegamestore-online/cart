/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./handleMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./handleMaterial.pure.js";
import "./shaders/handle.vertex.js";
import "./shaders/handle.fragment.js";
