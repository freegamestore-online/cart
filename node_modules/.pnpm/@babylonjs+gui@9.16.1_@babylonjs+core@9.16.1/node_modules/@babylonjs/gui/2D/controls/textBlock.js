/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./textBlock.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./textBlock.pure.js";
import { RegisterTextBlock } from "./textBlock.pure.js";
RegisterTextBlock();
//# sourceMappingURL=textBlock.js.map