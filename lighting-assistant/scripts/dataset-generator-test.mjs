import {
  createDefaultDatasetRecord,
  formatDatasetId,
  normalizeDatasetRecord,
  parseDatasetInput,
  serializeDatasetRecord,
} from '../src/datasetGenerator.js';
import {
  BRIGHTNESS_TARGET_RANGES,
  createBalancedConditionRecords60,
  createDatasetCameraViews,
  DARK_REPLACEMENT_IDS,
  EXTREME_DARK_TARGETS,
  getDarkReplacementRecords,
} from '../src/datasetConditions.js';
import {
  aggregateConditionFeatures,
  conditionFeaturesCsv,
  darkReplacementCsv,
  extractImageFeatures,
  imageFeaturesCsv,
  parseCsv,
  responsesTemplateCsv,
} from '../src/imageFeatures.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const defaultRecord = createDefaultDatasetRecord();
assert(defaultRecord.id === '000001', 'records should use a six-digit default ID');
assert(defaultRecord.coordinateSystem === 'threejs_y_up', 'records should declare the coordinate system');
assert(defaultRecord.lights.some((light) => light.type === 'spot'), 'spot lights should be supported');
assert(defaultRecord.lights.some((light) => light.type === 'area'), 'area lights should be supported');
assert(formatDatasetId(42) === '000042', 'numeric IDs should be zero padded');

const roundTrip = normalizeDatasetRecord(JSON.parse(serializeDatasetRecord(defaultRecord)));
assert(JSON.stringify(roundTrip) === JSON.stringify(defaultRecord), 'normalized JSON should round-trip without value changes');

const arrayRecords = parseDatasetInput(JSON.stringify([
  defaultRecord,
  { ...defaultRecord, id: '000002' },
]));
assert(arrayRecords.length === 2 && arrayRecords[1].id === '000002', 'JSON arrays should be accepted');

const exportRecords = parseDatasetInput(JSON.stringify({ conditions: [defaultRecord] }));
assert(exportRecords.length === 1, 'conditions export objects should be accepted');

let duplicateIdsRejected = false;
try {
  parseDatasetInput(JSON.stringify([defaultRecord, defaultRecord]));
} catch {
  duplicateIdsRejected = true;
}
assert(duplicateIdsRejected, 'duplicate dataset IDs should be rejected');

const areaRecord = normalizeDatasetRecord({
  ...defaultRecord,
  lights: [{
    id: 'area-test',
    type: 'area',
    position: [1, 2, 3],
    target: [0, 1, 0],
    intensity: 120,
    color: '#ffffff',
    width: 2.5,
    height: 1.25,
  }],
});
assert(areaRecord.lights[0].width === 2.5 && areaRecord.lights[0].height === 1.25, 'area dimensions should be preserved');

let invalidValueRejected = false;
try {
  normalizeDatasetRecord({ ...defaultRecord, camera: { ...defaultRecord.camera, fov: Number.NaN } });
} catch {
  invalidValueRejected = true;
}
assert(invalidValueRejected, 'non-finite values should be rejected');

const conditionRecords = createBalancedConditionRecords60();
assert(conditionRecords.length === 60, 'the balanced design should contain 60 conditions');
const conditionRoundTrip = normalizeDatasetRecord(JSON.parse(serializeDatasetRecord(conditionRecords[0])));
assert(JSON.stringify(conditionRoundTrip) === JSON.stringify(conditionRecords[0]), 'provenance and angle metadata should round-trip');
assert(new Set(conditionRecords.map((record) => record.id)).size === 60, 'condition IDs should be unique');
assert(conditionRecords[0].id === 'condition_001' && conditionRecords[59].id === 'condition_060', 'condition names should be stable');
assert(new Set(conditionRecords.map((record) => record.design.mainDirection)).size === 5, 'five main-light directions should be covered');
const replacementRecords = getDarkReplacementRecords(conditionRecords);
assert(replacementRecords.length === 15, 'exactly 15 conditions should be dark replacements');
assert(DARK_REPLACEMENT_IDS.every((id) => replacementRecords.some((record) => record.id === id)), 'all requested replacement IDs should exist');
assert(replacementRecords.filter((record) => ['overall_dark', 'near_black_overall', 'near_black_frontless'].includes(record.design.darknessPattern)).length === 5, 'five overall-dark family conditions are required');
assert(replacementRecords.filter((record) => record.design.darknessPattern.includes('side_dark') || record.design.darknessPattern === 'near_black_side').length === 4, 'four side-dark family conditions are required');
assert(replacementRecords.filter((record) => ['backlight_rim', 'near_black_backlight'].includes(record.design.darknessPattern)).length === 3, 'three backlight conditions are required');
assert(replacementRecords.filter((record) => ['narrow_spot', 'near_black_offcenter_spot'].includes(record.design.darknessPattern)).length === 3, 'three narrow-spot conditions are required');
assert(replacementRecords.filter((record) => record.design.brightnessCategory === 'extreme_dark').length === 5, 'five extreme-dark targets are required');
assert(replacementRecords.filter((record) => record.design.brightnessCategory === 'very_dark').length === 1, 'one legacy very-dark target should remain');
assert(replacementRecords.filter((record) => record.design.brightnessCategory === 'dark').length === 5, 'five dark targets are required');
assert(replacementRecords.filter((record) => record.design.brightnessCategory === 'slightly_dark').length === 4, 'four slightly-dark targets should remain');
assert(replacementRecords.every((record) => record.design.replacement === true && record.design.replacedConditionId === record.id), 'replacement metadata should be complete');
assert(BRIGHTNESS_TARGET_RANGES.extreme_dark.min === 0.10 && BRIGHTNESS_TARGET_RANGES.extreme_dark.max === 0.22, 'extreme-dark target range should match the specification');
assert(EXTREME_DARK_TARGETS.darkRatio.min === 0.75 && EXTREME_DARK_TARGETS.highlightRatio.max === 0.03, 'extreme-dark ratio targets should match the specification');
const extremeRecords = Object.fromEntries(replacementRecords
  .filter((record) => record.design.brightnessCategory === 'extreme_dark')
  .map((record) => [record.id, record]));
assert(extremeRecords.condition_011.lights.map((light) => light.intensity).join(',') === '16,3,3', '011 should retain only a faint three-light contribution');
assert(extremeRecords.condition_012.lights.map((light) => light.intensity).join(',') === '10,0,2', '012 should remove its fill light');
assert(extremeRecords.condition_034.lights.map((light) => light.intensity).join(',') === '24,0,2', '034 should retain a weak one-sided key only');
assert(extremeRecords.condition_046.lights.map((light) => light.intensity).join(',') === '2,0,24', '046 should use weak backlighting only');
assert(extremeRecords.condition_057.lights[0].angle === 0.08 && extremeRecords.condition_057.lights[1].intensity === 0, '057 should use an off-center narrow spot without fill');
assert(JSON.stringify(extremeRecords.condition_012.design.calibrationIntensityLimits) === JSON.stringify([[5, 15], [0, 0], [0, 5]]), '012 should keep its calibrated intensity ceiling');
assert(JSON.stringify(extremeRecords.condition_057.design.calibrationIntensityLimits) === JSON.stringify([[20, 40], [0, 0], [0, 0]]), '057 should not add fill or backlight while calibrating');
const cameraViews = createDatasetCameraViews(conditionRecords[0]);
assert(cameraViews.map((view) => view.angle).join(',') === 'front,left45,right45', 'three fixed camera angles should be defined');
assert(cameraViews.every((view) => JSON.stringify(view.camera.target) === JSON.stringify(conditionRecords[0].camera.target)), 'camera targets should match');

const width = 4;
const height = 4;
const imagePixels = new Uint8ClampedArray(width * height * 4);
const maskPixels = new Uint8ClampedArray(width * height * 4);
for (let index = 0; index < width * height; index += 1) {
  const x = index % width;
  const y = Math.floor(index / width);
  const subject = x >= 1 && x <= 2 && y >= 1 && y <= 2;
  const value = subject ? (x === 1 ? 96 : 224) : 24;
  imagePixels.set([value, value, value, 255], index * 4);
  maskPixels.set([subject ? 255 : 0, subject ? 255 : 0, subject ? 255 : 0, 255], index * 4);
}
const extracted = extractImageFeatures(
  { width, height, data: imagePixels },
  { width, height, data: maskPixels },
);
assert(extracted.mean_luminance > 0 && extracted.mean_luminance < 1, 'mean relative luminance should be normalized');
assert(extracted.object_mean_luminance > extracted.mean_luminance, 'object luminance should use the subject mask instead of the full frame');
assert(extracted.subject_mask_coverage_ratio === 0.25, 'mask coverage should expose the white subject area');
assert(extracted.left_right_difference > 0, 'signed left/right difference should retain direction');
assert(extracted.left_right_absolute_difference === Math.abs(extracted.left_right_difference), 'absolute left/right difference should match');
assert(Object.values(extracted).every(Number.isFinite), 'all extracted features should be finite');

const featureRows = cameraViews.map((view, index) => ({
  condition_id: 'condition_001',
  angle: view.angle,
  image_path: `images/condition_001_${view.angle}.png`,
  mask_path: `masks/condition_001_${view.angle}_mask.png`,
  ...Object.fromEntries(Object.entries(extracted).map(([key, value]) => [key, value + index * 0.01])),
}));
const aggregate = aggregateConditionFeatures(featureRows);
assert(Number.isFinite(aggregate.mean_luminance_mean), 'condition aggregation should calculate means');
assert(Number.isFinite(aggregate.mean_luminance_std), 'condition aggregation should calculate standard deviations');
assert(imageFeaturesCsv(featureRows).includes('left_right_absolute_difference'), 'image CSV should include all requested columns');
assert(conditionFeaturesCsv([aggregate]).includes('mean_luminance_front'), 'condition CSV should retain angle values');
assert(conditionFeaturesCsv([aggregate]).includes('mean_luminance_std'), 'condition CSV should include aggregate statistics');
assert(responsesTemplateCsv().trim() === 'condition_id,participant_id,visibility_score,response_time_ms,created_at', 'response template should have join columns');
const parsedFeatureRows = parseCsv(imageFeaturesCsv(featureRows));
assert(parsedFeatureRows.length === 3 && parsedFeatureRows[0].condition_id === 'condition_001', 'feature CSV should be readable for replacement merging');
assert(darkReplacementCsv([{
  condition_id: 'condition_009',
  darknessPattern: 'overall_dark',
  light_1_intensity: 55,
  light_2_intensity: 20,
  light_3_intensity: 10,
  mean_luminance: 0.3,
  dark_ratio: 0.6,
  local_contrast: 0.1,
}]).includes('darknessPattern'), 'dark replacement report should include requested columns');

console.log('dataset-generator-test: schema and deterministic round-trip passed');
