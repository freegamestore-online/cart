import { type Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { type Scene } from "@babylonjs/core/scene.js";
import { type Nullable } from "@babylonjs/core/types.js";
import { type ISogTexturePack } from "./splatDefs.js";
/**
 * A unified, GPU-decoded Gaussian Splatting work buffer.
 *
 * Holds a square MRT texture set (centers / covA / covB / colors) sized to a fixed splat capacity
 * (PlayCanvas-style: `ceil(sqrt(capacity))`). Each streamed SOG file is decoded directly on the GPU
 * (no CPU readback) into its allocated pixel range. The decoded textures are consumed unchanged by the
 * standard (non-SOG) Gaussian Splatting draw path.
 *
 * @experimental
 */
export declare class GaussianSplattingWorkBuffer {
    private readonly _scene;
    private readonly _mrt;
    private readonly _textureSize;
    private readonly _shaderLanguage;
    private readonly _material;
    private readonly _quad;
    private _copyMaterial;
    private _relayoutMapData;
    private _relayoutMapTexture;
    private _disposed;
    private _readFbo;
    /**
     * True when the engine supports the non-blocking GPU readback used by {@link readCentersRangeAsync}:
     * WebGL2 (PBO + fence) or WebGPU (copyTextureToBuffer + mapAsync). When false (e.g. WebGL1), callers must
     * decode positions on the CPU instead.
     */
    get supportsAsyncCentersReadback(): boolean;
    /**
     * Square edge length (in pixels) of the work-buffer textures.
     */
    get textureSize(): number;
    /**
     * The decoded work-buffer textures: [centers, covA, covB, colors].
     */
    get textures(): Texture[];
    /**
     * Creates a work buffer sized to hold `capacity` splats.
     * @param scene hosting scene
     * @param capacity total number of splats the work buffer must address
     */
    constructor(scene: Scene, capacity: number);
    /**
     * Creates a 4-attachment MRT (centers F32 / covA F32 / covB F32 / colors U8) sized to the work buffer.
     * @param name MRT and attachment base name
     * @param disableClear when true, clearing is suppressed so renders accumulate (the decode buffer); when
     *   false the MRT clears to zero on each render (the temporary relayout buffer, so gaps stay zeroed)
     * @returns the created MRT
     */
    private _createMrt;
    /**
     * Decodes one SOG file into the work buffer at the given splat offset (accumulating; previously
     * decoded files are preserved). Resolves once the GPU decode has been issued. The caller may
     * dispose the source pack textures after this resolves.
     * @param pack the SOG texture pack (GPU source textures + per-file decode parameters)
     * @param offset first splat index (pixel offset) for this file in the work buffer
     */
    decodeAsync(pack: ISogTexturePack, offset: number): Promise<void>;
    /**
     * Whether the relayout copy shader is compiled and ready. Lazily creates the copy material on first call.
     * Callers should poll this before {@link relayoutSync} (which must only run when ready).
     * @returns true when {@link relayoutSync} can run this frame
     */
    isRelayoutReady(): boolean;
    /**
     * Relayouts the decoded work-buffer textures to a new (defragmented) splat layout, keeping the same
     * texture instances so the consuming mesh does not need to re-bind. `srcIndexByDst[d]` is the source splat
     * index whose decoded data should end up at destination index `d`, or a negative value for a gap (left
     * zeroed). Uses a temporary MRT ping-pong (old -> temp via the map, then temp -> old identity) so
     * overlapping moves stay correct. Must be called at a frame-safe point (inside `onBeforeRender`) and only
     * when {@link isRelayoutReady} returns true.
     * @param srcIndexByDst per-destination source splat index (negative = gap)
     */
    relayoutSync(srcIndexByDst: Float32Array): void;
    /**
     * Renders one relayout copy pass into the target MRT, sampling the given source textures.
     * @param target destination MRT
     * @param sources the four source work-buffer textures
     * @param mapTexture the R32F destination-to-source index map
     * @param useMap 1 to read source indices from the map (gaps discarded), 0 for an identity copy
     */
    private _renderRelayoutPass;
    private _createCopyMaterial;
    /**
     * Asynchronously reads back the decoded splat centers (stride-4 xyzw, w=1) for a contiguous splat range
     * from the work buffer's centers texture, using a non-blocking GPU readback (WebGL2 PBO + fence, or WebGPU
     * copyTextureToBuffer + mapAsync) so it never stalls the frame the way a CPU image decode does. The centers
     * texture already holds the GPU-decoded positions (identical to the CPU decode), so this replaces decoding
     * positions on the CPU from the means images. Returns null when async readback is unsupported (caller should
     * fall back to CPU decoding).
     * @param splatOffset first splat index of the range
     * @param splatCount number of splats in the range
     * @returns a stride-4 Float32Array of length `splatCount * 4`, or null when unsupported/failed
     */
    readCentersRangeAsync(splatOffset: number, splatCount: number): Promise<Nullable<Float32Array>>;
    /**
     * Disposes the work buffer and its decode resources.
     */
    dispose(): void;
    private _createQuad;
    private _createMaterial;
    private _applyPack;
}
