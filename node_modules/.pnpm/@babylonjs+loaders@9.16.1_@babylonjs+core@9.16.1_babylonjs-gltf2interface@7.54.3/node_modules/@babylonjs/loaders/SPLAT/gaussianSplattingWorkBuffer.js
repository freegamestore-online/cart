import { MultiRenderTarget } from "@babylonjs/core/Materials/Textures/multiRenderTarget.js";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial.js";
import { Constants } from "@babylonjs/core/Engines/constants.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3, Vector4 } from "@babylonjs/core/Maths/math.vector.js";
import { GaussianSplattingWorkBufferVertexShaderGLSL, GaussianSplattingWorkBufferFragmentShaderGLSL, GaussianSplattingWorkBufferVertexShaderWGSL, GaussianSplattingWorkBufferFragmentShaderWGSL, GaussianSplattingWorkBufferRelayoutFragmentShaderGLSL, GaussianSplattingWorkBufferRelayoutFragmentShaderWGSL, GaussianSplattingWorkBufferRelayoutShaderName, } from "./gaussianSplattingWorkBufferShaders.js";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
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
export class GaussianSplattingWorkBuffer {
    /**
     * True when the engine supports the non-blocking GPU readback used by {@link readCentersRangeAsync}:
     * WebGL2 (PBO + fence) or WebGPU (copyTextureToBuffer + mapAsync). When false (e.g. WebGL1), callers must
     * decode positions on the CPU instead.
     */
    get supportsAsyncCentersReadback() {
        const engine = this._scene.getEngine();
        if (engine.isWebGPU) {
            return true;
        }
        const glEngine = engine;
        return !!glEngine._gl && typeof glEngine._readPixelsAsync === "function" && (glEngine.webGLVersion ?? 0) >= 2;
    }
    /**
     * Square edge length (in pixels) of the work-buffer textures.
     */
    get textureSize() {
        return this._textureSize;
    }
    /**
     * The decoded work-buffer textures: [centers, covA, covB, colors].
     */
    get textures() {
        return this._mrt.textures;
    }
    /**
     * Creates a work buffer sized to hold `capacity` splats.
     * @param scene hosting scene
     * @param capacity total number of splats the work buffer must address
     */
    constructor(scene, capacity) {
        // Relayout (defrag) copy material, created lazily on first relayout.
        this._copyMaterial = null;
        // Reusable destination->source index map for the relayout pass (created lazily, sized to the work buffer).
        this._relayoutMapData = null;
        this._relayoutMapTexture = null;
        this._disposed = false;
        // Reused WebGL framebuffer for the async centers readback (created lazily, freed in dispose).
        this._readFbo = null;
        this._scene = scene;
        this._shaderLanguage = scene.getEngine().isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */;
        this._textureSize = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, capacity))));
        // The decode buffer accumulates (clear disabled) so each decode preserves previously-decoded files.
        this._mrt = this._createMrt("gsWorkBuffer", true);
        // One persistent decode material + fullscreen-triangle quad, reused (with per-file uniforms)
        // for every decode so the shader is compiled only once.
        this._material = this._createMaterial();
        this._quad = this._createQuad();
        this._quad.material = this._material;
    }
    /**
     * Creates a 4-attachment MRT (centers F32 / covA F32 / covB F32 / colors U8) sized to the work buffer.
     * @param name MRT and attachment base name
     * @param disableClear when true, clearing is suppressed so renders accumulate (the decode buffer); when
     *   false the MRT clears to zero on each render (the temporary relayout buffer, so gaps stay zeroed)
     * @returns the created MRT
     */
    _createMrt(name, disableClear) {
        const mrt = new MultiRenderTarget(name, { width: this._textureSize, height: this._textureSize }, 4, this._scene, {
            types: [Constants.TEXTURETYPE_FLOAT, Constants.TEXTURETYPE_FLOAT, Constants.TEXTURETYPE_FLOAT, Constants.TEXTURETYPE_UNSIGNED_BYTE],
            samplingModes: [
                Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            ],
            formats: [Constants.TEXTUREFORMAT_RGBA, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTUREFORMAT_RGBA],
            generateDepthBuffer: false,
            generateDepthTexture: false,
            generateMipMaps: false,
        }, [`${name}Centers`, `${name}CovA`, `${name}CovB`, `${name}Colors`]);
        mrt.clearColor = new Color4(0, 0, 0, 0);
        mrt.renderList = [];
        if (disableClear) {
            mrt.onClearObservable.add(() => { });
        }
        return mrt;
    }
    /**
     * Decodes one SOG file into the work buffer at the given splat offset (accumulating; previously
     * decoded files are preserved). Resolves once the GPU decode has been issued. The caller may
     * dispose the source pack textures after this resolves.
     * @param pack the SOG texture pack (GPU source textures + per-file decode parameters)
     * @param offset first splat index (pixel offset) for this file in the work buffer
     */
    async decodeAsync(pack, offset) {
        if (this._disposed) {
            return;
        }
        this._applyPack(pack, offset);
        // Render the decode pass at the start of a frame (the safe point for custom render targets),
        // once the shader is compiled — never re-entrantly from a promise/observable continuation.
        await new Promise((resolve) => {
            const attempt = () => {
                if (this._disposed) {
                    resolve();
                    return;
                }
                if (!this._material.isReady(this._quad)) {
                    this._scene.onBeforeRenderObservable.addOnce(attempt);
                    return;
                }
                this._mrt.renderList = [this._quad];
                this._mrt.render();
                resolve();
            };
            this._scene.onBeforeRenderObservable.addOnce(attempt);
        });
    }
    /**
     * Whether the relayout copy shader is compiled and ready. Lazily creates the copy material on first call.
     * Callers should poll this before {@link relayoutSync} (which must only run when ready).
     * @returns true when {@link relayoutSync} can run this frame
     */
    isRelayoutReady() {
        if (this._disposed) {
            return false;
        }
        if (!this._copyMaterial) {
            this._copyMaterial = this._createCopyMaterial();
        }
        return this._copyMaterial.isReady(this._quad);
    }
    /**
     * Relayouts the decoded work-buffer textures to a new (defragmented) splat layout, keeping the same
     * texture instances so the consuming mesh does not need to re-bind. `srcIndexByDst[d]` is the source splat
     * index whose decoded data should end up at destination index `d`, or a negative value for a gap (left
     * zeroed). Uses a temporary MRT ping-pong (old -> temp via the map, then temp -> old identity) so
     * overlapping moves stay correct. Must be called at a frame-safe point (inside `onBeforeRender`) and only
     * when {@link isRelayoutReady} returns true.
     * @param srcIndexByDst per-destination source splat index (negative = gap)
     */
    relayoutSync(srcIndexByDst) {
        if (this._disposed || !this._copyMaterial) {
            return;
        }
        const size = this._textureSize;
        // Reuse the map buffer and its GPU texture across relayouts (the work-buffer size is fixed).
        if (!this._relayoutMapData) {
            this._relayoutMapData = new Float32Array(size * size);
        }
        const mapData = this._relayoutMapData;
        mapData.fill(-1);
        mapData.set(srcIndexByDst.subarray(0, Math.min(srcIndexByDst.length, mapData.length)));
        if (!this._relayoutMapTexture) {
            this._relayoutMapTexture = new RawTexture(mapData, size, size, Constants.TEXTUREFORMAT_R, this._scene, false, false, Constants.TEXTURE_NEAREST_SAMPLINGMODE, Constants.TEXTURETYPE_FLOAT);
        }
        else {
            this._relayoutMapTexture.update(mapData);
        }
        const mapTexture = this._relayoutMapTexture;
        // The temporary ping-pong MRT is (re)created per relayout rather than kept resident: it is the same size
        // as the work buffer, so a persistent copy would double GPU memory and defeat the streaming memory budget.
        const temp = this._createMrt("gsRelayoutTemp", false);
        try {
            // Pass 1: old -> temp using the map (temp gets the new layout; gaps stay zeroed by the clear).
            this._renderRelayoutPass(temp, this._mrt.textures, mapTexture, 1);
            // Pass 2: temp -> old, identity (old textures get the new layout, full overwrite).
            this._renderRelayoutPass(this._mrt, temp.textures, mapTexture, 0);
        }
        finally {
            temp.dispose();
            this._quad.material = this._material;
        }
    }
    /**
     * Renders one relayout copy pass into the target MRT, sampling the given source textures.
     * @param target destination MRT
     * @param sources the four source work-buffer textures
     * @param mapTexture the R32F destination-to-source index map
     * @param useMap 1 to read source indices from the map (gaps discarded), 0 for an identity copy
     */
    _renderRelayoutPass(target, sources, mapTexture, useMap) {
        const material = this._copyMaterial;
        material.setTexture("uMapTex", mapTexture);
        material.setTexture("uSrc0", sources[0]);
        material.setTexture("uSrc1", sources[1]);
        material.setTexture("uSrc2", sources[2]);
        material.setTexture("uSrc3", sources[3]);
        material.setInt("uDstWidth", this._textureSize);
        material.setInt("uSrcWidth", this._textureSize);
        material.setInt("uUseMap", useMap);
        this._quad.material = material;
        target.renderList = [this._quad];
        target.render();
    }
    _createCopyMaterial() {
        const isWGSL = this._shaderLanguage === 1 /* ShaderLanguage.WGSL */;
        const material = new ShaderMaterial(GaussianSplattingWorkBufferRelayoutShaderName, this._scene, {
            vertexSource: isWGSL ? GaussianSplattingWorkBufferVertexShaderWGSL : GaussianSplattingWorkBufferVertexShaderGLSL,
            fragmentSource: isWGSL ? GaussianSplattingWorkBufferRelayoutFragmentShaderWGSL : GaussianSplattingWorkBufferRelayoutFragmentShaderGLSL,
        }, {
            attributes: ["position"],
            uniforms: ["uDstWidth", "uSrcWidth", "uUseMap"],
            samplers: ["uMapTex", "uSrc0", "uSrc1", "uSrc2", "uSrc3"],
            shaderLanguage: this._shaderLanguage,
        });
        material.backFaceCulling = false;
        material.disableDepthWrite = true;
        return material;
    }
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
    async readCentersRangeAsync(splatOffset, splatCount) {
        if (this._disposed || splatCount <= 0 || !this.supportsAsyncCentersReadback) {
            return null;
        }
        const width = this._textureSize;
        // The range maps to whole texel rows [rowStart, rowEnd); read that rectangle and slice the exact range.
        // Splat i lives at texel (i % width, floor(i / width)) in both decode and draw, so the readback (which
        // indexes the same texture storage directly, with no UV/flip) yields splat i at buffer position
        // i - rowStart * width on every backend.
        const rowStart = Math.floor(splatOffset / width);
        const rowEnd = Math.ceil((splatOffset + splatCount) / width);
        const rowCount = rowEnd - rowStart;
        const startInBuffer = (splatOffset - rowStart * width) * 4;
        const sliceEnd = startInBuffer + splatCount * 4;
        const centers = this._mrt.textures[0];
        const engine = this._scene.getEngine();
        if (engine.isWebGPU) {
            // WebGPU: copyTextureToBuffer of the row span + mapAsync (genuinely non-blocking). noDataConversion
            // returns the raw RGBA32F floats tightly packed (the 256-byte row alignment is removed internally).
            const result = await centers.readPixels(0, 0, null, true, true, 0, rowStart, width, rowCount);
            if (this._disposed || !result) {
                return null;
            }
            const floats = result instanceof Float32Array ? result : new Float32Array(result.buffer, result.byteOffset, result.byteLength / 4);
            return floats.length >= sliceEnd ? floats.subarray(startInBuffer, sliceEnd) : null;
        }
        // WebGL2: read directly from the centers texture via a reused FBO + async PBO readback.
        const glEngine = engine;
        const gl = glEngine._gl;
        const hardware = centers.getInternalTexture()?._hardwareTexture?.underlyingResource;
        if (!hardware) {
            return null;
        }
        const buffer = new Float32Array(width * rowCount * 4);
        if (!this._readFbo) {
            this._readFbo = gl.createFramebuffer();
        }
        const previousFbo = glEngine._currentFramebuffer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._readFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, hardware, 0);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        // _readPixelsAsync issues the readPixels into a PBO synchronously, then resolves once the GPU fence
        // signals — so the framebuffer can be restored immediately while the transfer completes off-thread.
        const promise = glEngine._readPixelsAsync(0, rowStart, width, rowCount, gl.RGBA, gl.FLOAT, buffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, previousFbo);
        // gl.readBuffer is global state: restore the default-framebuffer read source (BACK) so later
        // readPixels on the default framebuffer aren't left pointing at COLOR_ATTACHMENT0. When restoring to
        // another FBO, COLOR_ATTACHMENT0 is the correct default read buffer, so only reset for the default one.
        if (!previousFbo) {
            gl.readBuffer(gl.BACK);
        }
        if (!promise) {
            return null;
        }
        await promise;
        if (this._disposed || buffer.length < sliceEnd) {
            return null;
        }
        return buffer.subarray(startInBuffer, sliceEnd);
    }
    /**
     * Disposes the work buffer and its decode resources.
     */
    dispose() {
        this._disposed = true;
        if (this._readFbo) {
            this._scene.getEngine()._gl?.deleteFramebuffer(this._readFbo);
            this._readFbo = null;
        }
        this._quad.dispose();
        this._material.dispose(true, false);
        this._copyMaterial?.dispose(true, false);
        this._relayoutMapTexture?.dispose();
        this._mrt.dispose();
    }
    _createQuad() {
        const quad = new Mesh("gsWorkBufferQuad", this._scene);
        const vertexData = new VertexData();
        // Fullscreen triangle in clip space (the vertex shader passes positions straight through).
        vertexData.positions = [-1, -1, 0, 3, -1, 0, -1, 3, 0];
        vertexData.indices = [0, 1, 2];
        vertexData.applyToMesh(quad);
        // Render only inside the work-buffer MRT, never in the main scene pass.
        this._scene.removeMesh(quad);
        return quad;
    }
    _createMaterial() {
        const isWGSL = this._shaderLanguage === 1 /* ShaderLanguage.WGSL */;
        const material = new ShaderMaterial("gsSogDecode", this._scene, {
            vertexSource: isWGSL ? GaussianSplattingWorkBufferVertexShaderWGSL : GaussianSplattingWorkBufferVertexShaderGLSL,
            fragmentSource: isWGSL ? GaussianSplattingWorkBufferFragmentShaderWGSL : GaussianSplattingWorkBufferFragmentShaderGLSL,
        }, {
            attributes: ["position"],
            uniforms: ["sogMeansMin", "sogMeansMax", "sogScalesMin", "sogScalesMax", "sogSh0Min", "sogSh0Max", "uVersion", "uOffset", "uCount", "uDestWidth", "uSrcWidth"],
            samplers: ["sogMeansLTex", "sogMeansUTex", "sogScalesTex", "sogQuatsTex", "sogSh0Tex", "sogCodebookTex"],
            shaderLanguage: this._shaderLanguage,
        });
        material.backFaceCulling = false;
        material.disableDepthWrite = true;
        return material;
    }
    _applyPack(pack, offset) {
        const material = this._material;
        const srcWidth = pack.meansTextureL.getSize().width;
        material.setTexture("sogMeansLTex", pack.meansTextureL);
        material.setTexture("sogMeansUTex", pack.meansTextureU);
        material.setTexture("sogScalesTex", pack.scalesTexture);
        material.setTexture("sogQuatsTex", pack.quatsTexture);
        material.setTexture("sogSh0Tex", pack.sh0Texture);
        // Codebook only used for v2; bind a harmless placeholder otherwise so the sampler is always set.
        material.setTexture("sogCodebookTex", pack.codebookTexture ?? pack.sh0Texture);
        material.setVector3("sogMeansMin", new Vector3(pack.meansMin[0], pack.meansMin[1], pack.meansMin[2]));
        material.setVector3("sogMeansMax", new Vector3(pack.meansMax[0], pack.meansMax[1], pack.meansMax[2]));
        const sMin = pack.scalesMin ?? [0, 0, 0];
        const sMax = pack.scalesMax ?? [0, 0, 0];
        material.setVector3("sogScalesMin", new Vector3(sMin[0], sMin[1], sMin[2]));
        material.setVector3("sogScalesMax", new Vector3(sMax[0], sMax[1], sMax[2]));
        const c0Min = pack.sh0Min ?? [0, 0, 0, 0];
        const c0Max = pack.sh0Max ?? [0, 0, 0, 0];
        material.setVector4("sogSh0Min", new Vector4(c0Min[0], c0Min[1], c0Min[2], c0Min[3]));
        material.setVector4("sogSh0Max", new Vector4(c0Max[0], c0Max[1], c0Max[2], c0Max[3]));
        material.setInt("uVersion", pack.version);
        material.setInt("uOffset", offset);
        material.setInt("uCount", pack.splatCount);
        material.setInt("uDestWidth", this._textureSize);
        material.setInt("uSrcWidth", srcWidth);
    }
}
//# sourceMappingURL=gaussianSplattingWorkBuffer.js.map