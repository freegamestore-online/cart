import { InputText } from "./inputText.pure.js";
import { RegisterClass } from "@babylonjs/core/Misc/typeStore.js";
import { TextWrapper } from "./textWrapper.js";
/**
 * Class used to create a password control
 */
export class InputPassword extends InputText {
    _getTypeName() {
        return "InputPassword";
    }
    _beforeRenderText(textWrapper) {
        const pwdTextWrapper = new TextWrapper();
        let txt = "";
        for (let i = 0; i < textWrapper.length; i++) {
            txt += "\u2022";
        }
        pwdTextWrapper.text = txt;
        return pwdTextWrapper;
    }
}
let _Registered = false;
/**
 * Registers the InputPassword class with the type store for serialization support.
 * Safe to call multiple times; only the first call has an effect.
 */
export function RegisterInputPassword() {
    if (_Registered) {
        return;
    }
    _Registered = true;
    RegisterClass("BABYLON.GUI.InputPassword", InputPassword);
}
//# sourceMappingURL=inputPassword.pure.js.map