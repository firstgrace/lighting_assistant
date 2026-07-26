import { createDefaultDatasetRecord, normalizeDatasetRecord } from './datasetGenerator.js';
import { DEFAULT_FEATURE_EXTRACTION_CONFIG } from './imageFeatures.js';

export const DATASET_ANGLE_IDS = Object.freeze(['front', 'left45', 'right45']);
export const DATASET_GENERATOR_GIT_COMMIT = 'e63c47d-dirty';
export const DATASET_THREE_VERSION = '0.165.0';

const MAIN_DIRECTIONS = [
  { id: 'left45', position: [-4.2, 4.4, 4.2] },
  { id: 'left25', position: [-2.2, 4.4, 5.2] },
  { id: 'front', position: [0, 4.4, 5.8] },
  { id: 'right25', position: [2.2, 4.4, 5.2] },
  { id: 'right45', position: [4.2, 4.4, 4.2] },
];
const MAIN_INTENSITIES = [180, 300, 420];
const FILL_INTENSITIES = [70, 160];
const BACK_INTENSITIES = [50, 130];
const SPOT_ANGLES = [0.25, 0.50];
const SOFTNESS_LEVELS = [
  { id: 'hard', penumbra: 0.10, areaSize: 0.75 },
  { id: 'soft', penumbra: 0.65, areaSize: 2.50 },
];

export const DARK_REPLACEMENT_IDS = Object.freeze([
  'condition_009',
  'condition_010',
  'condition_011',
  'condition_012',
  'condition_022',
  'condition_024',
  'condition_033',
  'condition_034',
  'condition_035',
  'condition_046',
  'condition_048',
  'condition_054',
  'condition_057',
  'condition_059',
  'condition_060',
]);

const DARK_REPLACEMENTS = Object.freeze({
  condition_009: replacement('very_dark', 'overall_dark', [55, 20, 10]),
  condition_010: replacement('dark', 'overall_dark', [90, 35, 20]),
  // These five are deliberately difficult visibility stimuli. The small ambient
  // values are part of the condition; do not compensate by changing renderer exposure.
  condition_011: replacement('extreme_dark', 'near_black_overall', [16, 3, 3], {
    ambientIntensity: 0.012,
    calibrationIntensityLimits: [[8, 20], [0, 5], [0, 5]],
  }),
  condition_012: replacement('extreme_dark', 'near_black_frontless', [10, 0, 2], {
    ambientIntensity: 0.008,
    calibrationIntensityLimits: [[5, 15], [0, 0], [0, 5]],
  }),
  condition_022: replacement('dark', 'overall_dark', [85, 55, 25]),
  condition_024: replacement('slightly_dark', 'left_side_dark', [170, 20, 30], { mainX: 4.4 }),
  condition_033: replacement('dark', 'right_side_dark', [110, 15, 30], { mainX: -4.4 }),
  condition_034: replacement('extreme_dark', 'near_black_side', [24, 0, 2], {
    mainX: 4.4,
    ambientIntensity: 0.01,
    calibrationIntensityLimits: [[15, 30], [0, 0], [0, 3]],
  }),
  condition_035: replacement('slightly_dark', 'right_side_dark', [190, 20, 25], { mainX: -4.4 }),
  condition_046: replacement('extreme_dark', 'near_black_backlight', [2, 0, 24], {
    ambientIntensity: 0.006,
    calibrationIntensityLimits: [[0, 5], [0, 0], [15, 30]],
  }),
  condition_048: replacement('dark', 'backlight_rim', [20, 10, 160]),
  condition_054: replacement('slightly_dark', 'backlight_rim', [35, 20, 220]),
  condition_057: replacement('extreme_dark', 'near_black_offcenter_spot', [32, 0, 0], {
    angle: 0.08,
    ambientIntensity: 0.006,
    target: [0.55, 1.72, 0.12],
    calibrationIntensityLimits: [[20, 40], [0, 0], [0, 0]],
  }),
  condition_059: replacement('dark', 'narrow_spot', [130, 10, 10], { angle: 0.14 }),
  condition_060: replacement('slightly_dark', 'narrow_spot', [190, 15, 15], { angle: 0.16 }),
});

export const BRIGHTNESS_TARGET_RANGES = Object.freeze({
  extreme_dark: { min: 0.10, max: 0.22 },
  very_dark: { min: 0.25, max: 0.35 },
  dark: { min: 0.35, max: 0.45 },
  slightly_dark: { min: 0.45, max: 0.60 },
});

// `mean_luminance` is full-frame brightness; `object_mean_luminance` is sampled
// from the generated bust-and-plinth mask only.
export const EXTREME_DARK_TARGETS = Object.freeze({
  meanLuminance: { min: 0.10, max: 0.22 },
  objectMeanLuminance: { min: 0.08, max: 0.25 },
  darkRatio: { min: 0.75, max: 0.92 },
  highlightRatio: { min: 0, max: 0.03 },
  minimumPerViewObjectMeanLuminance: 0.025,
  maximumFrontObjectMeanLuminance: 0.18,
  minimumFrontDarkRatio: 0.75,
});

export function createDatasetCameraViews(record) {
  const target = record.camera.target;
  const dx = record.camera.position[0] - target[0];
  const dz = record.camera.position[2] - target[2];
  const horizontalDistance = Math.hypot(dx, dz) || 7.4;
  const y = record.camera.position[1];
  const cameraForDegrees = (degrees) => {
    const radians = degrees * Math.PI / 180;
    return {
      position: [
        target[0] + Math.sin(radians) * horizontalDistance,
        y,
        target[2] + Math.cos(radians) * horizontalDistance,
      ],
      target: [...target],
      fov: record.camera.fov,
    };
  };
  return [
    { angle: 'front', camera: cameraForDegrees(0) },
    { angle: 'left45', camera: cameraForDegrees(-45) },
    { angle: 'right45', camera: cameraForDegrees(45) },
  ];
}

export function createBalancedConditionRecords60(options = {}) {
  const createdAt = options.createdAt || '2026-07-27T00:00:00.000Z';
  const featureConfig = options.featureConfig || DEFAULT_FEATURE_EXTRACTION_CONFIG;
  const records = [];
  let sequence = 1;
  for (let directionIndex = 0; directionIndex < MAIN_DIRECTIONS.length; directionIndex += 1) {
    for (let mainIndex = 0; mainIndex < MAIN_INTENSITIES.length; mainIndex += 1) {
      for (let run = 0; run < 4; run += 1) {
        const fillIndex = run % 2;
        const backIndex = Math.floor(run / 2);
        const angleIndex = (run + mainIndex + directionIndex) % 2;
        const softnessIndex = (Math.floor(run / 2) + mainIndex + directionIndex) % 2;
        const direction = MAIN_DIRECTIONS[directionIndex];
        const softness = SOFTNESS_LEVELS[softnessIndex];
        const base = createDefaultDatasetRecord(`condition_${String(sequence).padStart(3, '0')}`);
        const target = [0, 1.5, 0];
        const fillX = direction.position[0] > 0 ? -2.8 : 2.8;
        const record = normalizeDatasetRecord({
          ...base,
          createdAt,
          lights: [
            {
              ...base.lights[0],
              position: direction.position,
              target,
              intensity: MAIN_INTENSITIES[mainIndex],
              angle: SPOT_ANGLES[angleIndex],
              penumbra: softness.penumbra,
            },
            {
              ...base.lights[1],
              position: [fillX, 3.0, 3.8],
              target,
              intensity: FILL_INTENSITIES[fillIndex],
              width: softness.areaSize,
              height: softness.areaSize,
            },
            {
              ...base.lights[2],
              position: [0, 4.8, -4.0],
              target,
              intensity: BACK_INTENSITIES[backIndex],
              angle: 0.48,
              penumbra: softness.penumbra,
            },
          ],
          design: {
            mainDirection: direction.id,
            mainIntensity: MAIN_INTENSITIES[mainIndex],
            fillIntensity: FILL_INTENSITIES[fillIndex],
            backIntensity: BACK_INTENSITIES[backIndex],
            spotAngle: SPOT_ANGLES[angleIndex],
            softness: softness.id,
          },
          generator: {
            threeVersion: DATASET_THREE_VERSION,
            gitCommit: DATASET_GENERATOR_GIT_COMMIT,
          },
          rendererSettings: defaultRendererSettings(),
          featureExtraction: featureConfig,
        });
        record.angles = createDatasetCameraViews(record);
        records.push(applyDarkReplacement(record));
        sequence += 1;
      }
    }
  }
  return records;
}

export function conditionDesignCsv(records = createBalancedConditionRecords60()) {
  const headers = [
    'condition_id',
    'main_direction',
    'main_intensity',
    'fill_intensity',
    'back_intensity',
    'spot_angle',
    'softness',
    'main_penumbra',
    'area_width',
    'area_height',
    'brightness_category',
    'darkness_pattern',
    'replacement',
  ];
  const rows = records.map((record) => [
    record.id,
    record.design.mainDirection,
    record.design.mainIntensity,
    record.design.fillIntensity,
    record.design.backIntensity,
    record.design.spotAngle,
    record.design.softness,
    record.lights[0].penumbra,
    record.lights[1].width,
    record.lights[1].height,
    record.design.brightnessCategory || '',
    record.design.darknessPattern || '',
    record.design.replacement === true,
  ]);
  return `${headers.join(',')}\r\n${rows.map((row) => row.join(',')).join('\r\n')}\r\n`;
}

export function getDarkReplacementRecords(records = createBalancedConditionRecords60()) {
  return records.filter((record) => DARK_REPLACEMENT_IDS.includes(record.id));
}

export function defaultRendererSettings() {
  return {
    antialias: true,
    preserveDrawingBuffer: true,
    toneMapping: 'NeutralToneMapping',
    exposure: 1,
    outputColorSpace: 'SRGBColorSpace',
    shadowMap: {
      enabled: true,
      type: 'PCFSoftShadowMap',
    },
  };
}

function replacement(brightnessCategory, darknessPattern, intensities, extra = {}) {
  return { brightnessCategory, darknessPattern, intensities, ...extra };
}

function applyDarkReplacement(record) {
  const replacementDefinition = DARK_REPLACEMENTS[record.id];
  if (!replacementDefinition) return record;
  const [mainIntensity, fillIntensity, backIntensity] = replacementDefinition.intensities;
  const lights = record.lights.map((light) => ({ ...light }));
  lights[0].intensity = mainIntensity;
  lights[1].intensity = fillIntensity;
  lights[2].intensity = backIntensity;

  if (replacementDefinition.darknessPattern.includes('side_dark')
    || replacementDefinition.darknessPattern === 'near_black_side') {
    lights[0].position = [replacementDefinition.mainX, 4.2, 4.4];
    lights[0].target = [0, 1.5, 0];
    lights[1].position = [-replacementDefinition.mainX, 3.0, 3.8];
    lights[1].width = 0.75;
    lights[1].height = 0.75;
  }
  if (replacementDefinition.darknessPattern === 'backlight_rim'
    || replacementDefinition.darknessPattern === 'near_black_backlight') {
    lights[0].position = [0, 3.6, 5.2];
    lights[0].angle = 0.42;
    lights[1].position = [2.5, 2.8, 3.5];
    lights[1].width = 0.75;
    lights[1].height = 0.75;
    lights[2].position = [0, 4.6, -4.5];
    lights[2].angle = 0.55;
  }
  if (replacementDefinition.darknessPattern === 'narrow_spot'
    || replacementDefinition.darknessPattern === 'near_black_offcenter_spot') {
    lights[0].position = [2.6, 4.2, 4.8];
    lights[0].target = replacementDefinition.target || [0, 1.85, 0];
    lights[0].angle = replacementDefinition.angle;
    lights[0].penumbra = 0.08;
    lights[1].width = 0.5;
    lights[1].height = 0.5;
  }

  return normalizeDatasetRecord({
    ...record,
    scene: {
      ...record.scene,
      ambientIntensity: replacementDefinition.ambientIntensity ?? (
        replacementDefinition.brightnessCategory === 'very_dark'
          ? 0.08
          : replacementDefinition.brightnessCategory === 'dark'
            ? 0.12
            : 0.18
      ),
    },
    lights,
    design: {
      ...record.design,
      mainDirection: replacementDefinition.darknessPattern === 'left_side_dark'
        || replacementDefinition.darknessPattern === 'near_black_side'
        ? 'right45'
        : replacementDefinition.darknessPattern === 'right_side_dark'
          ? 'left45'
          : replacementDefinition.darknessPattern === 'backlight_rim'
            || replacementDefinition.darknessPattern === 'near_black_backlight'
            ? 'front'
            : replacementDefinition.darknessPattern === 'narrow_spot'
              || replacementDefinition.darknessPattern === 'near_black_offcenter_spot'
              ? 'right25'
              : record.design.mainDirection,
      mainIntensity: lights[0].intensity,
      fillIntensity: lights[1].intensity,
      backIntensity: lights[2].intensity,
      spotAngle: lights[0].angle,
      softness: lights[0].penumbra >= 0.5 ? 'soft' : 'hard',
      brightnessCategory: replacementDefinition.brightnessCategory,
      darknessPattern: replacementDefinition.darknessPattern,
      replacement: true,
      replacedConditionId: record.id,
      ...(replacementDefinition.calibrationIntensityLimits ? {
        calibrationIntensityLimits: replacementDefinition.calibrationIntensityLimits,
      } : {}),
    },
  }, record.id);
}
