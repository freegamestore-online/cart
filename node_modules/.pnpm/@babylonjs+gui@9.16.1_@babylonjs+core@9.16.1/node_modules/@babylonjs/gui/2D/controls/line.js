/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./line.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./line.pure.js";
import { RegisterLine } from "./line.pure.js";
RegisterLine();
//# sourceMappingURL=line.js.map