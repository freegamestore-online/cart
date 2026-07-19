/**
 * Re-exports pure implementation and applies runtime side effects.
 * Import volumetricLightScatteringPostProcess.pure for tree-shakeable, side-effect-free usage.
 */
export * from "./volumetricLightScatteringPostProcess.pure.js";
import "../Shaders/depth.vertex.js";
import "../Shaders/volumetricLightScattering.fragment.js";
import "../Shaders/volumetricLightScatteringPass.vertex.js";
import "../Shaders/volumetricLightScatteringPass.fragment.js";
