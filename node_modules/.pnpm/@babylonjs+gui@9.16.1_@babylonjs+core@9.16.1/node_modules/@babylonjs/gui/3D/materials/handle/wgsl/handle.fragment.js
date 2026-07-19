// Do not edit.
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore.js";
const name = "handlePixelShader";
const shader = `uniform color: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(uniforms.color,1.0);}
`;
// Sideeffect
if (!ShaderStore.ShadersStoreWGSL[name]) {
    ShaderStore.ShadersStoreWGSL[name] = shader;
}
/** @internal */
export const handlePixelShaderWGSL = { name, shader };
//# sourceMappingURL=handle.fragment.js.map