/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./mrdlFrontplateMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./mrdlFrontplateMaterial.pure.js";
import "./shaders/mrdlFrontplate.fragment.js";
import "./shaders/mrdlFrontplate.vertex.js";
