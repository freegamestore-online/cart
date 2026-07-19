/**
 * Re-exports pure implementation and applies runtime side effects.
 * Import babylonFileLoader.pure for tree-shakeable, side-effect-free usage.
 */
export * from "./babylonFileLoader.pure.js";
import { RegisterBabylonFileLoader } from "./babylonFileLoader.pure.js";
RegisterBabylonFileLoader();
//# sourceMappingURL=babylonFileLoader.js.map