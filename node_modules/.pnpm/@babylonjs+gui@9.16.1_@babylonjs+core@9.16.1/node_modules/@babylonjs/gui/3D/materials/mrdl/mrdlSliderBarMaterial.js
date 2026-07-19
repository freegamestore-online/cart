/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./mrdlSliderBarMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./mrdlSliderBarMaterial.pure.js";
import "./shaders/mrdlSliderBar.fragment.js";
import "./shaders/mrdlSliderBar.vertex.js";
import { RegisterMRDLSliderBarMaterial } from "./mrdlSliderBarMaterial.pure.js";
RegisterMRDLSliderBarMaterial();
//# sourceMappingURL=mrdlSliderBarMaterial.js.map