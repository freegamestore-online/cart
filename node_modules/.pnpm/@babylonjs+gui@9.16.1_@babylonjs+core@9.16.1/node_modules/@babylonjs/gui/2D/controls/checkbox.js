/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./checkbox.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./checkbox.pure.js";
import { RegisterCheckbox } from "./checkbox.pure.js";
RegisterCheckbox();
//# sourceMappingURL=checkbox.js.map