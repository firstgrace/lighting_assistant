# Canonical Normal pass export

This exporter is isolated from the normal lighting renderer. It adds only `public/normal-pass-export.html`; `src/main.js` and the existing candidate renderer are unchanged.

## How to export

From this repository:

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/normal-pass-export.html`, wait until the page shows `Ready`, then click **Export canonical_normal_C000.png**. Store the downloaded PNG outside Git, for example:

`output/normal-pass/canonical_normal_C000.png`

The output directory and `canonical_normal_*.png` are ignored. The page is a separate static entry point and does not import or mutate the application scene.

## Fixed alignment contract

The exporter duplicates the candidate-render contract found in `src/evaluationCandidateConditions.js` and `src/main.js`:

- model: `/models/dav.glb`
- model rotation: `[PI/2, 0, 0]` radians, target height `2.7`
- model placement: centered in X/Z, plinth top `y=0.38`, no additional transform
- camera position `[0, 2.4, 7.4]`
- camera target `[0, 1.55, 0]`
- FOV `42` degrees
- output `512 × 512`, pixel ratio `1`
- no light objects, no shadows, black background

The model fitting and placement follows the same rotation, target-height scaling, centering, and plinth-top placement sequence as `LightingScene.loadModel`. The camera values and output size match `CANDIDATE_RENDER_CONFIG` / `CANDIDATE_OUTPUT_SIZE`.

## Normal-space and encoding

- space: **camera/view space**, as produced by Three.js `MeshNormalMaterial`
- render target: `RGBAFormat`, `UnsignedByteType`
- renderer: `NoToneMapping`, `LinearSRGBColorSpace`
- background: opaque black
- encoded pixel: `RGB = normal * 0.5 + 0.5`
- decode in Python: `normal = RGB / 255 * 2 - 1`

The exporter reads pixels directly from a `WebGLRenderTarget` and flips the WebGL bottom-left row order before creating the PNG. Alpha is retained as the render-target alpha channel; shape analysis must use the independently aligned object mask rather than treating alpha as a substitute mask.

## Verification

Before using the map with `shape_analysis_poc`:

1. Confirm PNG dimensions are exactly `512 × 512`.
2. Confirm the object mask has the same dimensions and coordinate origin.
3. Compare the silhouette/centroid of the normal pass and the canonical subject mask; any one-pixel offset is a failure.
4. Confirm the decode range is approximately `[-1, 1]` and background is the known clear value.
5. Record browser/Three.js revision, model asset hash, camera values, and export timestamp.

No lighting parameter is read by this exporter, so the same canonical map is intended for all 20 fixed-pose lighting images.
