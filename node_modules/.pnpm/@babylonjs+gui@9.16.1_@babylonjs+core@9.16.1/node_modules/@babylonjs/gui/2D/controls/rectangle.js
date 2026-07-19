/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./rectangle.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./rectangle.pure.js";
import { RegisterRectangle } from "./rectangle.pure.js";
RegisterRectangle();
//# sourceMappingURL=rectangle.js.map