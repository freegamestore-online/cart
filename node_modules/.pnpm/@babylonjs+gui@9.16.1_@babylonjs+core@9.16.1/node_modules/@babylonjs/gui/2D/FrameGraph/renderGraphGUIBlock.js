/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./renderGraphGUIBlock.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./renderGraphGUIBlock.pure.js";
import { RegisterNodeRenderGraphGUIBlock } from "./renderGraphGUIBlock.pure.js";
RegisterNodeRenderGraphGUIBlock();
//# sourceMappingURL=renderGraphGUIBlock.js.map