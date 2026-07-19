/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./mrdlSliderThumbMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./mrdlSliderThumbMaterial.pure.js";
import "./shaders/mrdlSliderThumb.fragment.js";
import "./shaders/mrdlSliderThumb.vertex.js";
import { RegisterMRDLSliderThumbMaterial } from "./mrdlSliderThumbMaterial.pure.js";
RegisterMRDLSliderThumbMaterial();
//# sourceMappingURL=mrdlSliderThumbMaterial.js.map