// Do not edit.
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore.js";
const name = "handleVertexShader";
const shader = `attribute position: vec3f;uniform positionOffset: vec3f;uniform worldViewProjection: mat4x4f;uniform scale: f32;@vertex
fn main(input: VertexInputs)->FragmentInputs {let vPos: vec4f=vec4f((vertexInputs.position+uniforms.positionOffset)*uniforms.scale,1.0);vertexOutputs.position=uniforms.worldViewProjection*vPos;}
`;
// Sideeffect
if (!ShaderStore.ShadersStoreWGSL[name]) {
    ShaderStore.ShadersStoreWGSL[name] = shader;
}
/** @internal */
export const handleVertexShaderWGSL = { name, shader };
//# sourceMappingURL=handle.vertex.js.map