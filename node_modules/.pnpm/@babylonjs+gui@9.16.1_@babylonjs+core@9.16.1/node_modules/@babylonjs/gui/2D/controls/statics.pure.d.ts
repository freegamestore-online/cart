/**
 * Forcing an export so that this code will execute
 * @internal
 */
declare const Name = "Statics";
export { Name as name };
/**
 * Registers GUI static helpers such as {@link Control.AddHeader}.
 * Safe to call multiple times; only the first call has an effect.
 */
export declare function RegisterGUIStatics(): void;
