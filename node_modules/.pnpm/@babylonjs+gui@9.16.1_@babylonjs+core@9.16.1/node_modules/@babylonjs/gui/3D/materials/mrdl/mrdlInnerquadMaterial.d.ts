/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./mrdlInnerquadMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./mrdlInnerquadMaterial.pure.js";
import "./shaders/mrdlInnerquad.fragment.js";
import "./shaders/mrdlInnerquad.vertex.js";
