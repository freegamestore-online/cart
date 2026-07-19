/* eslint-disable @typescript-eslint/no-restricted-imports */
import * as GUI from "../index.js";
/**
 * Legacy support, defining window.BABYLON.GUI (global variable).
 *
 * This is the entry point for the UMD module.
 * The entry point for a future ESM package should be index.ts
 */
const GlobalObject = typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : undefined;
if (typeof GlobalObject !== "undefined") {
    GlobalObject.BABYLON = GlobalObject.BABYLON || {};
    if (!GlobalObject.BABYLON.GUI) {
        GlobalObject.BABYLON.GUI = GUI;
    }
}
export * from "../index.js";
//# sourceMappingURL=legacy.js.map