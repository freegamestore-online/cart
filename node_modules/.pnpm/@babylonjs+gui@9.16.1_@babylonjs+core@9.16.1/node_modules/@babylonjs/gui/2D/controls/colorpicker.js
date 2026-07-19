/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./colorpicker.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./colorpicker.pure.js";
import { RegisterColorPicker } from "./colorpicker.pure.js";
RegisterColorPicker();
//# sourceMappingURL=colorpicker.js.map