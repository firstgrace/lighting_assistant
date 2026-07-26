# Lighting image dataset

The `/dataset-generator` screen creates three fixed camera views for each lighting condition and pairs them with subject masks and extracted image features.

```text
dataset/
├── images/
│   ├── condition_001_front.png
│   ├── condition_001_left45.png
│   └── condition_001_right45.png
├── masks/
│   ├── condition_001_front_mask.png
│   ├── condition_001_left45_mask.png
│   └── condition_001_right45_mask.png
├── metadata/
│   └── condition_001.json
├── features/
│   ├── image_features.csv
│   ├── condition_features.csv
│   └── feature-extraction.json
├── responses/
│   └── responses_template.csv
└── README.md
```

Metadata uses Three.js world coordinates (`Y` is up). Reapply a metadata JSON file in the generator to reproduce the same model, material, background, camera, render size, and lighting state.

The generator does not use random values. `createdAt` records metadata creation time and does not affect rendering. The 60-condition design is stored in `config/conditions_60.json` and `config/conditions_60.csv`.

## Feature definitions

- Relative luminance uses linearized sRGB and coefficients 0.2126, 0.7152, and 0.0722.
- `mean_luminance` is the full-frame mean. `object_mean_luminance` is calculated only from white pixels in the generated bust-and-plinth mask.
- `subject_mask_coverage_ratio` records the fraction of white mask pixels, making a full-frame mask failure detectable from the CSV.
- Local contrast is the mean normalized Sobel magnitude in the subject mask after a small box blur.
- Edge density is the proportion of subject pixels whose normalized Sobel magnitude exceeds `edgeThreshold`.
- Signed left/right difference is right mean minus left mean.
- Signed top/bottom difference is top mean minus bottom mean.
- Thresholds are loaded from `public/dataset-config/feature-extraction.json` and copied into generated metadata.

## Regression check

Install `scripts/requirements-ml.txt`, then run:

```powershell
py -3 scripts/train_visibility_models.py --synthetic-responses
```

Synthetic responses are deterministic and exist only to verify the analysis pipeline. Accuracy obtained from synthetic responses must never be reported as a research result.
