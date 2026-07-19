import { GaussianSplattingMesh } from "@babylonjs/core/Meshes/GaussianSplatting/gaussianSplattingMesh.js";
import { type Scene } from "@babylonjs/core/scene.js";
import { type Nullable } from "@babylonjs/core/types.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo.js";
/**
 * A single LOD variant of a tree node: a contiguous splat range inside one streamed SOG file.
 */
interface ISOGLODEntry {
    /** Index into {@link ISOGLODMetadata.filenames}. */
    file: number;
    /** First splat index inside that file. */
    offset: number;
    /** Number of splats. */
    count: number;
}
/**
 * A node of the PlayCanvas-style SOG LOD octree. Internal nodes have `children`; leaves have `lods`.
 */
interface ISOGLODNode {
    bound: {
        min: number[];
        max: number[];
    };
    children?: ISOGLODNode[];
    lods?: {
        [level: string]: ISOGLODEntry;
    };
    /** LOD level currently streamed/rendered for this node, or undefined until its base LOD is ready. */
    activeLod?: number;
    /** Distance-based ideal LOD level for this node, recomputed per frame. */
    optimalLod?: number;
    /** Available LOD levels for this leaf, sorted ascending (0 = finest). Set during the tree walk. */
    availableLevels?: number[];
    /** Coarsest available level (= max key), always streamed as the permanent base layer. */
    baseLod?: number;
    /** Final LOD level the node should stream/render (distance optimal, capped by maxDetailLod). */
    targetLevel?: number;
    /** Frames remaining before this node may switch LOD again (oscillation damping). */
    lodCooldown?: number;
    /** True when the node's bounding box currently intersects the camera frustum. Drives the LOD bias that
     * pushes off-screen nodes to the coarsest level (they stay rendered, not hidden). */
    inFrustum?: boolean;
    /** Cached local-space bounding info used for the per-node frustum test (created once per leaf). */
    cullBounds?: BoundingInfo;
    /** File index this node currently has an in-flight/queued decode request for (its not-yet-decoded target),
     * or undefined when the node's target is already decoded. Drives pending-download reference counting. */
    pendingFile?: number;
    /** File index this node's current {@link activeLod} renders from, or undefined before any LOD is active.
     * Drives the resident reference count that keeps a file in the work buffer. */
    activeFile?: number;
}
/**
 * Parsed contents of a PlayCanvas-style `lod-meta.json` file.
 */
export interface ISOGLODMetadata {
    /** Number of LOD levels (0 = highest detail). */
    lodLevels: number;
    /** SOG `meta.json` paths, relative to the metadata file, indexed by `ISOGLODEntry.file`. */
    filenames: string[];
    /** Optional always-on environment `.sog` bundle, relative to the metadata file. */
    environment?: string;
    /** Root of the LOD octree. */
    tree: ISOGLODNode;
}
/**
 * Selects which LOD value drives the {@link GaussianSplattingStream} debug wireframe colors.
 */
export type GaussianSplattingStreamDebugLodSource = "optimal" | "current";
/**
 * Options for {@link GaussianSplattingStream}.
 */
export interface IGaussianSplattingStreamOptions {
    /** URL of the fflate UMD module used to unzip `.sog` environment bundles. */
    deflateURL?: string;
    /** Pre-loaded fflate module. */
    fflate?: any;
    /** When true, renders a wireframe box per LOD node, colored by the node's LOD level. */
    debugDisplay?: boolean;
    /** Which LOD value drives the debug wireframe colors. Defaults to `"optimal"`. */
    debugLodSource?: GaussianSplattingStreamDebugLodSource;
    /** Distance (in local units) of the first LOD transition. PlayCanvas default `5`. */
    lodBaseDistance?: number;
    /** Geometric ratio between successive LOD transition distances. PlayCanvas default `3`. */
    lodMultiplier?: number;
    /** Distance multiplier applied to nodes behind the camera (`1` = no penalty). PlayCanvas default `1`. */
    lodBehindPenalty?: number;
    /** Lowest LOD index the optimal-LOD heuristic may select. Defaults to `0`. */
    lodRangeMin?: number;
    /** Highest LOD index the optimal-LOD heuristic may select. Defaults to `lodLevels - 1`. */
    lodRangeMax?: number;
    /** Maximum number of LOD source files to GPU-decode per frame (spreads work to avoid hitches). Defaults to `1`. */
    maxDecodesPerFrame?: number;
    /** Frames a node must wait after switching LOD before it may switch again (oscillation damping). Defaults to `10`. */
    lodCooldownFrames?: number;
    /** Minimum number of frames between LOD re-evaluations (throttles per-frame work during motion). Defaults to `4`. */
    lodUpdateInterval?: number;
    /** Minimum camera movement (world units) required to re-evaluate LODs. Defaults to `0.5`. */
    lodUpdateDistance?: number;
    /**
     * Finest (most detailed) LOD level any node is allowed to render. `0` allows full detail (level 0);
     * `1` caps detail at the next-coarser level, and so on. Higher values force a coarser maximum detail.
     */
    maxDetailLod?: number;
    /**
     * When true (default), LOD nodes outside the camera frustum are biased to their coarsest LOD rather than
     * rendered at full detail. They stay in the sort/render set so they appear instantly (at low detail) when
     * the camera turns toward them, then refine. Set to `false` to render every node at its distance LOD.
     */
    frustumCulling?: boolean;
    /** Maximum number of LOD file downloads allowed to run concurrently. PlayCanvas default `2`. */
    maxConcurrentDownloads?: number;
    /** Number of times a failed file download is retried before giving up. PlayCanvas default `2`. */
    maxDownloadRetries?: number;
    /**
     * GPU memory budget (in megabytes) for resident splats. When set (and smaller than the full dataset),
     * LOD files are streamed through a fixed-size work buffer and unreferenced files are evicted to stay
     * within budget, allowing datasets larger than a single full-dataset buffer. Converted to a splat count
     * at ~84 bytes/splat. Combined with {@link maxResidentSplats} by taking the smaller of the two.
     */
    memoryBudgetMb?: number;
    /**
     * Maximum number of splats kept resident in the work buffer. When set (and smaller than the full
     * dataset), enables eviction-based streaming (see {@link memoryBudgetMb}). Default unset = size the work
     * buffer for the whole dataset (no eviction).
     */
    maxResidentSplats?: number;
    /**
     * Frames an unreferenced (no longer rendered) LOD file stays resident before it is evicted, so a quick
     * return to it avoids a re-download. Only used when a budget enables eviction. PlayCanvas default `100`.
     */
    evictionCooldownFrames?: number;
}
/**
 * Streams a PlayCanvas-style SOG LOD scene (`lod-meta.json`) into a single Gaussian Splatting mesh.
 *
 * Each selected SOG file (plus the environment) is loaded directly as GPU textures and decoded on the
 * GPU into one unified, PlayCanvas-style square work buffer (no CPU splat decode or `updateData`). Only
 * the splats of each node's currently-selected LOD are rendered/sorted via the mesh's interval filter.
 *
 * The coarsest (least-detail) LOD of every node is streamed first as a permanent base layer so the whole
 * scene is visible quickly with no holes. A distance-based "optimal" LOD is then computed per node (see
 * {@link evaluateOptimalLods}); finer LOD source files are streamed on demand and a node only switches to
 * a finer LOD once that file is decoded, so transitions never flash or leave gaps.
 *
 * @experimental
 */
export declare class GaussianSplattingStream extends GaussianSplattingMesh {
    private readonly _metadata;
    private readonly _rootUrl;
    private readonly _streamOptions;
    private readonly _leafNodes;
    private _lodBaseDistance;
    private _lodMultiplier;
    private _lodBehindPenalty;
    private _lodRangeMin;
    private _lodRangeMax;
    private _maxDecodesPerFrame;
    private _lodCooldownFrames;
    private _lodUpdateInterval;
    private _lodUpdateDistance;
    private _maxDetailLod;
    private _frustumCulling;
    private readonly _frustumPlanes;
    private readonly _cullViewProj;
    private _workBuffer;
    private _useGpuPositionReadback;
    private _readbackCandidate;
    private _readbackProbed;
    private _residency;
    private readonly _fileCounts;
    private readonly _fileMeta;
    private readonly _decodedFiles;
    private readonly _loadingFiles;
    private readonly _decodeQueue;
    private readonly _fileRefs;
    private readonly _cancelledDecodes;
    private _evictionEnabled;
    private _residentBudget;
    private _evictionCooldownFrames;
    private _decodeGate;
    private readonly _relayoutOldOffsets;
    private _relayoutSrcIndex;
    private readonly _downloadManager;
    private _environmentRange;
    private _environmentFiles;
    private _lodObserver;
    private _baseLayerReady;
    private _framesSinceLodUpdate;
    private readonly _lastLodCamPos;
    private _forceLodUpdate;
    private readonly _boundsMin;
    private readonly _boundsMax;
    private _debugDisplay;
    private _debugLodSource;
    private _debugMesh;
    private _debugObserver;
    private _debugColorData;
    private _debugSignature;
    private _disposed;
    /**
     * Returns true when the parsed JSON looks like a PlayCanvas-style `lod-meta.json` payload.
     * @param data parsed JSON
     * @returns whether the data is SOG LOD metadata
     */
    static IsLODMetadata(data: unknown): data is ISOGLODMetadata;
    /**
     * Creates a new SOG LOD streaming mesh and immediately starts streaming (non-blocking).
     * @param name mesh name
     * @param metadata parsed `lod-meta.json`
     * @param rootUrl base URL the metadata's relative paths resolve against
     * @param scene hosting scene
     * @param options streaming options
     */
    constructor(name: string, metadata: ISOGLODMetadata, rootUrl: string, scene: Scene, options?: IGaussianSplattingStreamOptions);
    getClassName(): string;
    /**
     * Resolves once the scene is fully streamed and displayed for the current camera: a LOD re-evaluation has
     * run for the current point of view, every reachable LOD file has finished downloading and decoding (no
     * downloads, decodes, or queued work remain), and the depth sort for the resulting splats has been applied
     * and rendered. Intended for deterministic automated testing and screenshot/image comparison.
     *
     * Streaming and settling require rendered frames. If an external render loop is already running, this waits
     * on it passively; otherwise (e.g. when awaited inside an async `createScene` before the host starts its
     * render loop) it drives `scene.render()` itself until settled, so it never deadlocks.
     *
     * Note: the promise only resolves while the camera is still — if the camera keeps moving, the target LODs
     * (and the depth sort) keep changing and the stream never settles. Position the camera, then await this.
     * @param stableFrames number of consecutive settled frames to require before resolving (defaults to 3), so
     *   the final sorted frame is actually on screen
     * @returns a promise that resolves when loading and rendering are complete for the current view
     */
    whenSettledAsync(stableFrames?: number): Promise<void>;
    /**
     * Whether the base layer is ready and there is no streaming work in flight (nothing queued for decode, no
     * decode running, and no downloads pending).
     * @returns true when no loading work remains
     */
    private _isLoadingIdle;
    /**
     * Finest (most detailed) LOD level any node is allowed to render. `0` allows full detail (level 0);
     * `1` caps detail at the next-coarser level, and so on. Nodes already coarser than this cap (by
     * distance) are unaffected. Changes take effect in real time.
     */
    get maxDetailLod(): number;
    set maxDetailLod(value: number);
    /**
     * Coarsest LOD level index in the scene (number of LOD levels minus one). Useful as the upper bound
     * for {@link maxDetailLod}.
     */
    get maxLodLevel(): number;
    /**
     * When true (default), nodes whose bounding box is outside the camera frustum are biased to the coarsest
     * LOD instead of being hidden. They stay in the sort/render set (their off-screen splats are clipped), so
     * turning the camera toward them shows low detail immediately with no invisible frames, then refines.
     * Changes take effect in real time.
     */
    get frustumCulling(): boolean;
    set frustumCulling(value: boolean);
    /**
     * When true, renders a wireframe box per LOD node, colored by the LOD level selected by {@link debugLodSource}.
     */
    get debugDisplay(): boolean;
    set debugDisplay(value: boolean);
    /**
     * Selects which LOD value drives the debug wireframe colors: the distance-based `"optimal"` LOD
     * (default, recomputed as the camera moves) or the `"current"` streamed/rendered LOD.
     */
    get debugLodSource(): GaussianSplattingStreamDebugLodSource;
    set debugLodSource(value: GaussianSplattingStreamDebugLodSource);
    dispose(doNotRecurse?: boolean): void;
    /**
     * Re-evaluates the optimal LOD for every node based on the camera position. The result is stored in
     * each node's `optimalLod`. Rendering is unaffected; this currently drives only diagnostics and the
     * debug wireframe display.
     * @param camera camera to evaluate against (defaults to the scene's active camera)
     */
    evaluateOptimalLods(camera?: Nullable<Camera>): void;
    /**
     * The LOD level used to color a node's debug box, per {@link debugLodSource}.
     * @param node leaf node
     * @returns the displayed LOD level
     */
    private _displayedLodLevel;
    /**
     * Rebuilds the debug wireframe (evaluating the optimal LOD first when needed) and wires up the per-frame
     * recolor observer. The observer runs for both LOD sources: "optimal" colors track the camera, and
     * "current" colors track LOD levels as they stream in/out.
     */
    private _refreshDebugDisplay;
    /**
     * Per-frame debug update: recolors the existing wireframe in place whenever the displayed LOD levels
     * change. For the "optimal" source the optimal LOD is recomputed first (it tracks the camera); for the
     * "current" source the levels are driven by the streaming loop, so no recomputation is needed here. The
     * geometry is never rebuilt, which avoids the dispose/recreate flicker while the camera moves.
     */
    private _onDebugFrame;
    /**
     * Builds the LOD-node wireframe boxes once (one box per leaf node), colored by the displayed LOD level.
     * The color vertex buffer is created updatable so subsequent recolors can happen in place.
     */
    private _buildDebugMesh;
    /**
     * Recolors the existing wireframe in place from the current displayed LOD levels, without rebuilding geometry.
     */
    private _updateDebugColors;
    /**
     * Computes a cheap 32-bit rolling hash of every leaf's displayed LOD level, used to detect when the
     * debug wireframe needs recoloring. Avoids per-frame string allocation in the render loop.
     * @returns a numeric signature of the current displayed LOD levels
     */
    private _computeDebugSignature;
    /**
     * Disposes the LOD-node wireframe boxes and stops live debug updates.
     */
    private _clearDebugDisplay;
    /**
     * Walks the LOD tree and records every leaf that carries renderable LOD entries, capturing the set of
     * available levels and the coarsest (base) level for each.
     * @param node current tree node
     */
    private _collectLodEntries;
    /**
     * Streams the scene: learns every source file's splat count, allocates one unified GPU work buffer
     * sized for all LOD files, decodes the environment and the coarsest LOD of every node as a permanent
     * base layer, then installs the per-frame loop that streams finer LODs on demand.
     */
    private _streamAllAsync;
    /**
     * Collects the unique set of source file indices referenced by any LOD of any leaf, sorted ascending.
     * @returns sorted unique file indices
     */
    private _collectAllFileIds;
    /**
     * Fetches the environment bundle and every referenced file's metadata to learn splat counts, caching
     * each file's parsed metadata for the later on-demand decode. Metadata fetches run in parallel.
     * @param fileIds file indices to fetch metadata for
     * @returns the environment splat count (0 when there is no environment)
     */
    private _gatherCountsAsync;
    /**
     * Queues a file for on-demand decode if it isn't already decoded, in flight, or already queued.
     * @param fileId file index to decode
     */
    private _enqueueDecode;
    /**
     * Starts up to {@link _maxDecodesPerFrame} queued decodes for this frame. Decodes run asynchronously
     * and promote any waiting nodes once they complete.
     */
    private _pumpDecodeQueue;
    /**
     * Writes a decoded splat range's positions into the shared buffer, expands the bounds, and incrementally
     * patches the sort worker.
     * @param positions stride-4 positions for the range
     * @param base first splat index of the range in the work buffer
     * @param count number of splats in the range
     */
    private _applyPositions;
    /**
     * One-time validation of GPU position readback: reads a sample of the just-decoded range back from the work
     * buffer and compares it to the CPU-decoded positions. Enables {@link _useGpuPositionReadback} only on an
     * exact (within float tolerance) match, so an unsupported or incorrect readback (e.g. a backend without the
     * required texture usage, or an orientation mismatch) safely keeps the CPU decode path.
     * @param base first splat index of the validated range
     * @param count number of splats in the range
     * @param cpuPositions the CPU-decoded stride-4 positions for the range (ground truth)
     */
    private _probeReadbackAsync;
    /**
     * Resolves the decoded positions for a splat range and applies them. Once GPU readback has been validated,
     * positions are read back from the work buffer (non-blocking) and `pack.positions` is empty; otherwise the
     * CPU-decoded `pack.positions` are used, and — on the first such decode — the GPU readback is validated
     * against them so subsequent decodes can use the fast path.
     * @param pack the parsed SOG pack (its `positions` is populated only on the CPU path)
     * @param base first splat index of the range in the work buffer
     * @param count number of splats in the range
     * @returns whether positions were applied
     */
    private _applyDecodedPositionsAsync;
    /**
     * Decodes the always-on environment bundle into its work-buffer block and activates its range.
     */
    private _decodeEnvironmentAsync;
    /**
     * Loads one LOD source file as GPU textures, decodes it into its fixed work-buffer block, records its
     * CPU centers for sorting, frees the source textures, then promotes any nodes that were waiting for it.
     * Concurrent or repeat requests for the same file are ignored. If the file is cancelled mid-flight
     * (because every node that wanted it retargeted), the decode bails cooperatively at the next checkpoint.
     * @param fileId file index to decode
     */
    private _decodeFileAsync;
    /**
     * Acquires the decode gate (a simple async mutex). Resolves once any prior holder releases, returning a
     * release function the caller must invoke in a `finally`.
     * @returns the release function
     */
    private _acquireDecodeGateAsync;
    /**
     * Defragments the work buffer to make room for a file that did not fit, then allocates its slot. Runs the
     * compaction + GPU relayout atomically inside a single `onBeforeRender` so no inconsistent CPU/GPU layout
     * is ever rendered. Returns the new slot offset, or null if even compaction cannot free enough contiguous
     * space (the caller refuses the upgrade).
     * @param fileId file to allocate after compaction
     * @param count splats the file needs
     * @returns the allocated offset, or null
     */
    private _relayoutAndAllocateAsync;
    /**
     * Compacts the resident set and relocates the corresponding GPU textures and CPU positions to the new
     * layout. Must run at a frame-safe point with the work buffer's relayout shader ready.
     */
    private _performRelayout;
    /**
     * Drops a file evicted by the residency controller from the decoded set so it will be re-decoded on demand.
     * The file had no remaining references, so no node was rendering or downloading it.
     * @param fileId evicted file index
     */
    private _onFileEvicted;
    /**
     * Snaps a desired LOD level to the nearest level the node provides, while never selecting a level finer
     * than {@link maxDetailLod} (i.e. with an index below the cap). Ties prefer the finer allowed level. If
     * the node has no level at or coarser than the cap, its coarsest available level is used.
     * @param node leaf node
     * @param desired desired LOD level
     * @returns the chosen available level
     */
    private _cappedLevelForNode;
    /**
     * Computes each node's {@link ISOGLODNode.targetLevel}: the distance-based optimal level snapped to an
     * available level, capped so no node renders finer (more detailed) than {@link maxDetailLod}.
     */
    private _computeTargetLevels;
    /**
     * Applies each node's {@link ISOGLODNode.targetLevel}: switches a node to its target level when that
     * level's file is already decoded, otherwise records a pending download request for the file and leaves
     * the node on its current LOD (so nothing ever disappears). Nodes within their post-switch cooldown are
     * left untouched to damp oscillation (and keep their existing pending request).
     *
     * Each node tracks the single file it currently needs but lacks ({@link ISOGLODNode.pendingFile}). When a
     * node's target changes before that file finished downloading, the old file's reference is released; if no
     * other node still needs it, its queued/in-flight download is cancelled (see {@link _releaseFileRef}).
     * @returns true when at least one node changed LOD (callers should refresh the active ranges)
     */
    private _applyDesiredLods;
    /**
     * Moves a node's resident reference from its previous active file to the one it now renders, so the file
     * count that keeps a block in the work buffer stays accurate (and cancels any pending eviction of the new
     * file). The new file is already decoded.
     * @param node leaf node switching its rendered file
     * @param file the file the node now renders from
     */
    private _switchActiveFile;
    /**
     * Adds a reference to a file (active render or pending download), cancelling any scheduled eviction.
     * @param fileId file index
     */
    private _acquireFileRef;
    /**
     * Records that a node needs a not-yet-decoded file, bumping its reference count and queueing the decode.
     * @param fileId file index the node now targets
     */
    private _acquirePendingFile;
    /**
     * Releases a node's reference to a file. When the last reference is dropped: a decoded file is scheduled
     * for eviction (when streaming under a budget), and a still-downloading file has its queued decode dropped
     * and any in-flight download cancelled.
     * @param fileId file index the node no longer references
     */
    private _releaseFileRef;
    /**
     * Per-frame LOD streaming loop. Ticks cooldowns and pumps the decode queue every frame, and runs the
     * cheap per-node frustum test every frame so the off-screen LOD bias tracks camera rotation. The LOD
     * re-evaluation is throttled to at most every {@link _lodUpdateInterval} frames once the camera has
     * translated far enough, but also runs immediately whenever a node enters/leaves the frustum (so its
     * detail upgrades/downgrades promptly) or a cap change forces it. Active ranges rebuild on any LOD change.
     */
    private _onLodFrame;
    /**
     * Updates each leaf node's {@link ISOGLODNode.inFrustum} flag from a per-node frustum test against the
     * active camera. When {@link frustumCulling} is disabled (or there is no camera) every node is marked
     * in-frustum. Bounds are static (from the LOD tree), so flags are valid for all nodes regardless of
     * decode state. Returns true when any node's in-frustum state changed (so the LOD bias must be re-applied).
     * @returns whether any node's in-frustum state changed
     */
    private _updateNodeFrustum;
    /**
     * Reads the splat count from SOG metadata.
     * @param data SOG metadata
     * @returns the splat count
     */
    private static _GetSplatCount;
    /**
     * Disposes all GPU source textures of a SOG pack (they are only needed for the one decode pass).
     * @param pack the SOG texture pack
     */
    private static _DisposePack;
    /**
     * Expands the running splat-center bounds with a newly decoded file's centers and updates the
     * mesh bounding info so the GS is correctly frustum-culled and pickable.
     * @param positions stride-4 splat centers for the new file
     * @param count number of splats
     */
    private _updateBounds;
    /**
     * Rebuilds the active interval set from the environment plus each node's currently-selected LOD entry,
     * coalesces adjacent ranges, and pushes the result to the sort worker.
     */
    private _refreshActiveRanges;
    /**
     * Sorts and merges adjacent/overlapping ranges to keep the interval list compact.
     * @param ranges raw ranges
     * @returns coalesced ranges
     */
    private static _CoalesceRanges;
    /**
     * Unzips a `.sog` bundle into a name -> bytes map, loading fflate on demand.
     * @param data zipped bytes
     * @returns map of entry name to bytes
     */
    private _unzipAsync;
}
export {};
