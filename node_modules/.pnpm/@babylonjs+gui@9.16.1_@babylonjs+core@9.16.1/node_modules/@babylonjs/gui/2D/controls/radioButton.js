/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./radioButton.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./radioButton.pure.js";
import { RegisterRadioButton } from "./radioButton.pure.js";
RegisterRadioButton();
//# sourceMappingURL=radioButton.js.map