/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./displayGrid.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./displayGrid.pure.js";
import { RegisterDisplayGrid } from "./displayGrid.pure.js";
RegisterDisplayGrid();
//# sourceMappingURL=displayGrid.js.map