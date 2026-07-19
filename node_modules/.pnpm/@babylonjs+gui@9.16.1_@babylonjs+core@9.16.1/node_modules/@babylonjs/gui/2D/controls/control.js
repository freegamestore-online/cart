/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./control.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./control.pure.js";
import { RegisterControl } from "./control.pure.js";
RegisterControl();
//# sourceMappingURL=control.js.map