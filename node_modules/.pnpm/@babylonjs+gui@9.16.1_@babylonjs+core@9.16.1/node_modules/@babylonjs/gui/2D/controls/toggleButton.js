/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./toggleButton.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./toggleButton.pure.js";
import { RegisterToggleButton } from "./toggleButton.pure.js";
RegisterToggleButton();
//# sourceMappingURL=toggleButton.js.map