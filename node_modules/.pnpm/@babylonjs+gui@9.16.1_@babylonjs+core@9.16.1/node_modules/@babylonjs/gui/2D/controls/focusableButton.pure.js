import { Button } from "./button.pure.js";
import { RegisterClass } from "@babylonjs/core/Misc/typeStore.js";
/**
 * Class used to create a focusable button that can easily handle keyboard events
 * @since 5.0.0
 */
export class FocusableButton extends Button {
    constructor(name) {
        super(name);
        this.name = name;
        this._unfocusedColor = this.color;
    }
    /**
     * @internal
     */
    _onPointerDown(target, coordinates, pointerId, buttonIndex, pi) {
        if (!this.isReadOnly) {
            // Clicking on button should focus
            this.focus();
        }
        return super._onPointerDown(target, coordinates, pointerId, buttonIndex, pi);
    }
}
let _Registered = false;
/**
 * Registers the FocusableButton class with the type store for serialization support.
 * Safe to call multiple times; only the first call has an effect.
 */
export function RegisterFocusableButton() {
    if (_Registered) {
        return;
    }
    _Registered = true;
    RegisterClass("BABYLON.GUI.FocusableButton", FocusableButton);
}
//# sourceMappingURL=focusableButton.pure.js.map