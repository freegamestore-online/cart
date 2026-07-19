/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./fluentBackplateMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./fluentBackplateMaterial.pure.js";
import "./shaders/fluentBackplate.fragment.js";
import "./shaders/fluentBackplate.vertex.js";
import { RegisterFluentBackplateMaterial } from "./fluentBackplateMaterial.pure.js";
RegisterFluentBackplateMaterial();
//# sourceMappingURL=fluentBackplateMaterial.js.map