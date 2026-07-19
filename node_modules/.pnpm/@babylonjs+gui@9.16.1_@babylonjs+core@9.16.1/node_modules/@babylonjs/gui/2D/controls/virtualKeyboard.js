/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./virtualKeyboard.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./virtualKeyboard.pure.js";
import { RegisterVirtualKeyboard } from "./virtualKeyboard.pure.js";
RegisterVirtualKeyboard();
//# sourceMappingURL=virtualKeyboard.js.map