import { InputText } from "./inputText.pure.js";
import { TextWrapper } from "./textWrapper.js";
/**
 * Class used to create a password control
 */
export declare class InputPassword extends InputText {
    protected _getTypeName(): string;
    protected _beforeRenderText(textWrapper: TextWrapper): TextWrapper;
}
/**
 * Registers the InputPassword class with the type store for serialization support.
 * Safe to call multiple times; only the first call has an effect.
 */
export declare function RegisterInputPassword(): void;
