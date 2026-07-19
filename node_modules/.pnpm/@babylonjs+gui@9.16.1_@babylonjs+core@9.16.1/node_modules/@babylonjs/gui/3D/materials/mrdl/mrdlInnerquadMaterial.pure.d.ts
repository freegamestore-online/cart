import { type AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.pure.js";
import { type BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { type IAnimatable } from "@babylonjs/core/Animations/animatable.interface.js";
import { type Matrix } from "@babylonjs/core/Maths/math.vector.pure.js";
import { type Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { type Nullable } from "@babylonjs/core/types.js";
import { type Scene } from "@babylonjs/core/scene.js";
import { type SubMesh } from "@babylonjs/core/Meshes/subMesh.js";
import { Color4 } from "@babylonjs/core/Maths/math.color.pure.js";
import { PushMaterial } from "@babylonjs/core/Materials/pushMaterial.js";
export declare class MRDLInnerquadMaterial extends PushMaterial {
    /**
     * Gets or sets the color of the innerquad.
     */
    color: Color4;
    /**
     * Gets or sets the corner radius on the innerquad. If this value is changed, update the lineWidth to match.
     */
    radius: number;
    /**
     * Gets or sets whether the radius of the innerquad should be fixed.
     */
    fixedRadius: boolean;
    /** @hidden */
    _filterWidth: number;
    /**
     * Gets or sets the glow fraction of the innerquad.
     */
    glowFraction: number;
    /**
     * Gets or sets the maximum glow intensity of the innerquad.
     */
    glowMax: number;
    /**
     * Gets or sets the glow falloff effect of the innerquad.
     */
    glowFalloff: number;
    constructor(name: string, scene: Scene);
    needAlphaBlending(): boolean;
    needAlphaTesting(): boolean;
    getAlphaTestTexture(): Nullable<BaseTexture>;
    isReadyForSubMesh(mesh: AbstractMesh, subMesh: SubMesh): boolean;
    bindForSubMesh(world: Matrix, mesh: Mesh, subMesh: SubMesh): void;
    /**
     * Get the list of animatables in the material.
     * @returns the list of animatables object used in the material
     */
    getAnimatables(): IAnimatable[];
    dispose(forceDisposeEffect?: boolean): void;
    clone(name: string): MRDLInnerquadMaterial;
    serialize(): unknown;
    getClassName(): string;
    static Parse(source: any, scene: Scene, rootUrl: string): MRDLInnerquadMaterial;
}
/**
 * Registers the MRDLInnerquadMaterial class with the type store for serialization support.
 * Safe to call multiple times; only the first call has an effect.
 */
export declare function RegisterMRDLInnerquadMaterial(): void;
