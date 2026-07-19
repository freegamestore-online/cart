/**
 * Re-exports the pure implementation and applies the runtime registration side effect.
 * Import "./inputPassword.pure" for tree-shakeable, side-effect-free usage.
 */
export * from "./inputPassword.pure.js";
import { RegisterInputPassword } from "./inputPassword.pure.js";
RegisterInputPassword();
//# sourceMappingURL=inputPassword.js.map