/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./fluentButtonMaterial.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./fluentButtonMaterial.pure.js";
import "./shaders/fluentButton.fragment.js";
import "./shaders/fluentButton.vertex.js";
import { RegisterFluentButtonMaterial } from "./fluentButtonMaterial.pure.js";
RegisterFluentButtonMaterial();
//# sourceMappingURL=fluentButtonMaterial.js.map