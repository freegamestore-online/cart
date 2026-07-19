/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./focusableButton.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./focusableButton.pure.js";
import { RegisterFocusableButton } from "./focusableButton.pure.js";
RegisterFocusableButton();
//# sourceMappingURL=focusableButton.js.map