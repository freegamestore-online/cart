/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./statics.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./statics.pure.js";
import { RegisterGUIStatics } from "./statics.pure.js";
RegisterGUIStatics();
//# sourceMappingURL=statics.js.map