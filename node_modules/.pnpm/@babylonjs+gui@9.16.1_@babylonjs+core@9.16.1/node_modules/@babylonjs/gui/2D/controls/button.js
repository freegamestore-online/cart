/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./button.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./button.pure.js";
import { RegisterButton } from "./button.pure.js";
RegisterButton();
//# sourceMappingURL=button.js.map