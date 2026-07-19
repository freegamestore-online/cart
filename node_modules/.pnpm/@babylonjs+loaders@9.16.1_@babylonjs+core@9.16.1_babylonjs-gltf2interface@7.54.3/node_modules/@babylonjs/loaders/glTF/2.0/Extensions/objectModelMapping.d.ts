import { type TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { type IAnimation, type ICamera, type IGLTF, type IKHRLightsPunctual_Light, type IEXTLightsArea_Light, type IMaterial, type IMesh, type INode } from "../glTFLoaderInterfaces.js";
import { type Vector3, Matrix, Quaternion, Vector2 } from "@babylonjs/core/Maths/math.vector.pure.js";
import { type Color3, Color4 } from "@babylonjs/core/Maths/math.color.pure.js";
import { type PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { type Light } from "@babylonjs/core/Lights/light.js";
import { type Nullable } from "@babylonjs/core/types.js";
import { type IEXTLightsImageBased_LightImageBased } from "babylonjs-gltf2interface";
import { type BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { type IInterpolationPropertyInfo, type IObjectAccessor } from "@babylonjs/core/FlowGraph/typeDefinitions.js";
import { GLTFPathToObjectConverter } from "./gltfPathToObjectConverter.js";
import { type AnimationGroup } from "@babylonjs/core/Animations/animationGroup.js";
import { type Mesh } from "@babylonjs/core/Meshes/mesh.js";
/**
 * Describes the object model tree that maps glTF pointer paths to their corresponding Babylon objects.
 */
export interface IGLTFObjectModelTree {
    /** Mapping for the glTF cameras collection. */
    cameras: IGLTFObjectModelTreeCamerasObject;
    /** Mapping for the glTF nodes collection. */
    nodes: IGLTFObjectModelTreeNodesObject;
    /** Mapping for the glTF materials collection. */
    materials: IGLTFObjectModelTreeMaterialsObject;
    /** Mapping for the glTF extensions. */
    extensions: IGLTFObjectModelTreeExtensionsObject;
    /** Mapping for the glTF animations collection. */
    animations: {
        length: IObjectAccessor<IAnimation[], AnimationGroup[], number>;
        __array__: {};
    };
    /** Mapping for the glTF meshes collection. */
    meshes: {
        length: IObjectAccessor<IMesh[], (Mesh | undefined)[], number>;
        __array__: {};
    };
}
/**
 * Describes the mapping of glTF node properties to their corresponding Babylon transform node properties.
 */
export interface IGLTFObjectModelTreeNodesObject<GLTFTargetType = INode, BabylonTargetType = TransformNode> {
    /** Accessor for the number of nodes. */
    length: IObjectAccessor<GLTFTargetType[], BabylonTargetType[], number>;
    __array__: {
        __target__: boolean;
        translation: IObjectAccessor<GLTFTargetType, BabylonTargetType, Vector3>;
        rotation: IObjectAccessor<GLTFTargetType, BabylonTargetType, Quaternion>;
        scale: IObjectAccessor<GLTFTargetType, BabylonTargetType, Vector3>;
        matrix: IObjectAccessor<GLTFTargetType, BabylonTargetType, Matrix>;
        globalMatrix: IObjectAccessor<GLTFTargetType, BabylonTargetType, Matrix>;
        weights: {
            length: IObjectAccessor<GLTFTargetType, BabylonTargetType, number>;
            __array__: {
                __target__: boolean;
            } & IObjectAccessor<GLTFTargetType, BabylonTargetType, number>;
        } & IObjectAccessor<GLTFTargetType, BabylonTargetType, number[]>;
        extensions: {
            EXT_lights_ies?: {
                multiplier: IObjectAccessor<INode, Light, number>;
                color: IObjectAccessor<INode, Light, Color3>;
            };
            KHR_node_visibility?: {
                visible: IObjectAccessor<INode, Mesh, boolean>;
            };
        };
    };
}
/**
 * Describes the mapping of glTF camera properties to their corresponding Babylon camera properties.
 */
export interface IGLTFObjectModelTreeCamerasObject {
    __array__: {
        __target__: boolean;
        orthographic: {
            xmag: IObjectAccessor<ICamera, ICamera, Vector2>;
            ymag: IObjectAccessor<ICamera, ICamera, Vector2>;
            zfar: IObjectAccessor<ICamera, ICamera, number>;
            znear: IObjectAccessor<ICamera, ICamera, number>;
        };
        perspective: {
            yfov: IObjectAccessor<ICamera, ICamera, number>;
            zfar: IObjectAccessor<ICamera, ICamera, number>;
            znear: IObjectAccessor<ICamera, ICamera, number>;
            aspectRatio: IObjectAccessor<ICamera, ICamera, Nullable<number>>;
        };
    };
}
/**
 * Describes the mapping of glTF material properties to their corresponding Babylon material properties.
 */
export interface IGLTFObjectModelTreeMaterialsObject {
    __array__: {
        __target__: boolean;
        pbrMetallicRoughness: {
            baseColorFactor: IObjectAccessor<IMaterial, PBRMaterial, Color4>;
            metallicFactor: IObjectAccessor<IMaterial, PBRMaterial, Nullable<number>>;
            roughnessFactor: IObjectAccessor<IMaterial, PBRMaterial, Nullable<number>>;
            baseColorTexture: {
                extensions: {
                    KHR_texture_transform: ITextureDefinition;
                };
            };
            metallicRoughnessTexture: {
                extensions: {
                    KHR_texture_transform: ITextureDefinition;
                };
            };
        };
        emissiveFactor: IObjectAccessor<IMaterial, PBRMaterial, Color3>;
        normalTexture: {
            scale: IObjectAccessor<IMaterial, PBRMaterial, number>;
            extensions: {
                KHR_texture_transform: ITextureDefinition;
            };
        };
        occlusionTexture: {
            strength: IObjectAccessor<IMaterial, PBRMaterial, number>;
            extensions: {
                KHR_texture_transform: ITextureDefinition;
            };
        };
        emissiveTexture: {
            extensions: {
                KHR_texture_transform: ITextureDefinition;
            };
        };
        extensions: {
            KHR_materials_anisotropy: {
                anisotropyStrength: IObjectAccessor<IMaterial, PBRMaterial, number>;
                anisotropyRotation: IObjectAccessor<IMaterial, PBRMaterial, number>;
                anisotropyTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
            };
            KHR_materials_clearcoat: {
                clearcoatFactor: IObjectAccessor<IMaterial, PBRMaterial, number>;
                clearcoatRoughnessFactor: IObjectAccessor<IMaterial, PBRMaterial, number>;
                clearcoatTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
                clearcoatNormalTexture: {
                    scale: IObjectAccessor<IMaterial, PBRMaterial, number>;
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
                clearcoatRoughnessTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
            };
            KHR_materials_dispersion: {
                dispersion: IObjectAccessor<IMaterial, PBRMaterial, number>;
            };
            KHR_materials_emissive_strength: {
                emissiveStrength: IObjectAccessor<IMaterial, PBRMaterial, number>;
            };
            KHR_materials_ior: {
                ior: IObjectAccessor<IMaterial, PBRMaterial, number>;
            };
            KHR_materials_iridescence: {
                iridescenceFactor: IObjectAccessor<IMaterial, PBRMaterial, number>;
                iridescenceIor: IObjectAccessor<IMaterial, PBRMaterial, number>;
                iridescenceThicknessMinimum: IObjectAccessor<IMaterial, PBRMaterial, number>;
                iridescenceThicknessMaximum: IObjectAccessor<IMaterial, PBRMaterial, number>;
                iridescenceTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
                iridescenceThicknessTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
            };
            KHR_materials_sheen: {
                sheenColorFactor: IObjectAccessor<IMaterial, PBRMaterial, Color3>;
                sheenRoughnessFactor: IObjectAccessor<IMaterial, PBRMaterial, number>;
                sheenColorTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
                sheenRoughnessTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
            };
            KHR_materials_specular: {
                specularFactor: IObjectAccessor<IMaterial, PBRMaterial, number>;
                specularColorFactor: IObjectAccessor<IMaterial, PBRMaterial, Color3>;
                specularTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
                specularColorTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
            };
            KHR_materials_transmission: {
                transmissionFactor: IObjectAccessor<IMaterial, PBRMaterial, number>;
                transmissionTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
            };
            KHR_materials_diffuse_transmission: {
                diffuseTransmissionFactor: IObjectAccessor<IMaterial, PBRMaterial, number>;
                diffuseTransmissionTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
                diffuseTransmissionColorFactor: IObjectAccessor<IMaterial, PBRMaterial, Nullable<Color3>>;
                diffuseTransmissionColorTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
            };
            KHR_materials_volume: {
                thicknessFactor: IObjectAccessor<IMaterial, PBRMaterial, number>;
                attenuationColor: IObjectAccessor<IMaterial, PBRMaterial, Color3>;
                attenuationDistance: IObjectAccessor<IMaterial, PBRMaterial, number>;
                thicknessTexture: {
                    extensions: {
                        KHR_texture_transform: ITextureDefinition;
                    };
                };
            };
        };
    };
}
interface ITextureDefinition {
    offset: IObjectAccessor<IMaterial, PBRMaterial, Vector2>;
    rotation: IObjectAccessor<IMaterial, PBRMaterial, number>;
    scale: IObjectAccessor<IMaterial, PBRMaterial, Vector2>;
}
/**
 * Describes the mapping of glTF mesh properties to their corresponding Babylon mesh properties.
 */
export interface IGLTFObjectModelTreeMeshesObject {
}
/**
 * Describes the mapping of glTF extension properties to their corresponding Babylon properties.
 */
export interface IGLTFObjectModelTreeExtensionsObject {
    /** Mapping for the KHR_lights_punctual extension. */
    KHR_lights_punctual: {
        lights: {
            length: IObjectAccessor<IKHRLightsPunctual_Light[], Light[], number>;
            __array__: {
                __target__: boolean;
                color: IObjectAccessor<IKHRLightsPunctual_Light, Light, Color3>;
                intensity: IObjectAccessor<IKHRLightsPunctual_Light, Light, number>;
                range: IObjectAccessor<IKHRLightsPunctual_Light, Light, number>;
                spot: {
                    innerConeAngle: IObjectAccessor<IKHRLightsPunctual_Light, Light, number>;
                    outerConeAngle: IObjectAccessor<IKHRLightsPunctual_Light, Light, number>;
                };
            };
        };
    };
    /** Mapping for the EXT_lights_area extension. */
    EXT_lights_area: {
        lights: {
            length: IObjectAccessor<IEXTLightsArea_Light[], Light[], number>;
            __array__: {
                __target__: boolean;
                color: IObjectAccessor<IEXTLightsArea_Light, Light, Color3>;
                intensity: IObjectAccessor<IEXTLightsArea_Light, Light, number>;
                size: IObjectAccessor<IEXTLightsArea_Light, Light, number>;
                rect: {
                    aspect: IObjectAccessor<IEXTLightsArea_Light, Light, number>;
                };
            };
        };
    };
    /** Mapping for the EXT_lights_ies extension. */
    EXT_lights_ies: {
        lights: {
            length: IObjectAccessor<IKHRLightsPunctual_Light[], Light[], number>;
        };
    };
    /** Mapping for the EXT_lights_image_based extension. */
    EXT_lights_image_based: {
        lights: {
            __array__: {
                __target__: boolean;
                intensity: IObjectAccessor<IEXTLightsImageBased_LightImageBased, BaseTexture, number>;
                rotation: IObjectAccessor<IEXTLightsImageBased_LightImageBased, BaseTexture, Quaternion>;
            };
            length: IObjectAccessor<IEXTLightsImageBased_LightImageBased[], BaseTexture[], number>;
        };
    };
}
/**
 * get a path-to-object converter for the given glTF tree
 * @param gltf the glTF tree to use
 * @returns a path-to-object converter for the given glTF tree
 */
export declare function GetPathToObjectConverter(gltf: IGLTF): GLTFPathToObjectConverter<unknown, unknown, unknown>;
/**
 * This function will return the object accessor for the given key in the object model
 * If the key is not found, it will return undefined
 * @param key the key to get the mapping for, for example /materials/\{\}/emissiveFactor
 * @returns an object accessor for the given key, or undefined if the key is not found
 */
export declare function GetMappingForKey(key: string): IObjectAccessor | undefined;
/**
 * Set interpolation for a specific key in the object model
 * @param key the key to set, for example /materials/\{\}/emissiveFactor
 * @param interpolation the interpolation elements array
 */
export declare function SetInterpolationForKey(key: string, interpolation?: IInterpolationPropertyInfo[]): void;
/**
 * This will ad a new object accessor in the object model at the given key.
 * Note that this will NOT change the typescript types. To do that you will need to change the interface itself (extending it in the module that uses it)
 * @param key the key to add the object accessor at. For example /cameras/\{\}/perspective/aspectRatio
 * @param accessor the object accessor to add
 */
export declare function AddObjectAccessorToKey<GLTFTargetType = any, BabylonTargetType = any, BabylonValueType = any>(key: string, accessor: IObjectAccessor<GLTFTargetType, BabylonTargetType, BabylonValueType>): void;
export {};
