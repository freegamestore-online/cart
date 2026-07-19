/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./fluentMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./fluentMaterial.pure.js";
import "./shaders/fluent.vertex.js";
import "./shaders/fluent.fragment.js";
import { RegisterFluentMaterial } from "./fluentMaterial.pure.js";
RegisterFluentMaterial();
//# sourceMappingURL=fluentMaterial.js.map