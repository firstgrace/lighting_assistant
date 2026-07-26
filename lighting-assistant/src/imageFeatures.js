export const DEFAULT_FEATURE_EXTRACTION_CONFIG = Object.freeze({
  darkThreshold: 0.25,
  shadowThreshold: 0.10,
  brightThreshold: 0.75,
  highlightThreshold: 0.95,
  edgeThreshold: 0.10,
  blurRadius: 1,
});

export const IMAGE_FEATURE_NAMES = Object.freeze([
  // Full-frame relative luminance. It captures the overall image brightness.
  'mean_luminance',
  // Subject-mask mean luminance for the bust and plinth only.
  'object_mean_luminance',
  // White-pixel proportion in the generated subject mask; useful for QA.
  'subject_mask_coverage_ratio',
  'luminance_variance',
  'dark_ratio',
  'bright_ratio',
  'local_contrast',
  'object_background_difference',
  'left_right_difference',
  'left_right_absolute_difference',
  'top_bottom_difference',
  'top_bottom_absolute_difference',
  'edge_density',
  'shadow_ratio',
  'highlight_ratio',
]);

export function normalizeFeatureConfig(value = {}) {
  const config = { ...DEFAULT_FEATURE_EXTRACTION_CONFIG, ...(value || {}) };
  const result = {};
  for (const key of Object.keys(DEFAULT_FEATURE_EXTRACTION_CONFIG)) {
    const number = Number(config[key]);
    if (!Number.isFinite(number) || number < 0) throw new Error(`${key} must be a finite non-negative number.`);
    result[key] = key === 'blurRadius' ? Math.round(number) : number;
  }
  return result;
}

export function extractImageFeatures(imageData, maskData, configInput = DEFAULT_FEATURE_EXTRACTION_CONFIG) {
  validateImagePair(imageData, maskData);
  const config = normalizeFeatureConfig(configInput);
  const { width, height } = imageData;
  const luminance = new Float64Array(width * height);
  const objectMask = new Uint8Array(width * height);
  const source = imageData.data;
  const mask = maskData.data;
  let fullFrameLuminanceSum = 0;

  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    luminance[index] = relativeLuminance(source[offset], source[offset + 1], source[offset + 2]);
    fullFrameLuminanceSum += luminance[index];
    objectMask[index] = (mask[offset] + mask[offset + 1] + mask[offset + 2]) >= 384 ? 1 : 0;
  }

  const blurred = boxBlur(luminance, width, height, config.blurRadius);
  const gradient = sobelGradient(blurred, width, height);
  const objectValues = [];
  const backgroundValues = [];
  const leftValues = [];
  const rightValues = [];
  const topValues = [];
  const bottomValues = [];
  let edgeCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (objectMask[index]) {
        objectValues.push(luminance[index]);
        (x < width / 2 ? leftValues : rightValues).push(luminance[index]);
        (y < height / 2 ? topValues : bottomValues).push(luminance[index]);
        if (gradient[index] > config.edgeThreshold) edgeCount += 1;
      } else {
        backgroundValues.push(luminance[index]);
      }
    }
  }

  if (!objectValues.length) throw new Error('The subject mask does not contain any white pixels.');
  const objectMeanLuminance = mean(objectValues);
  const fullFrameMeanLuminance = fullFrameLuminanceSum / luminance.length;
  const leftRightDifference = meanOrNull(rightValues) - meanOrNull(leftValues);
  const topBottomDifference = meanOrNull(topValues) - meanOrNull(bottomValues);
  return {
    mean_luminance: fullFrameMeanLuminance,
    object_mean_luminance: objectMeanLuminance,
    subject_mask_coverage_ratio: objectValues.length / luminance.length,
    luminance_variance: variance(objectValues, objectMeanLuminance),
    dark_ratio: ratioBelow(objectValues, config.darkThreshold),
    bright_ratio: ratioAbove(objectValues, config.brightThreshold),
    local_contrast: maskedMean(gradient, objectMask),
    object_background_difference: objectMeanLuminance - meanOrNull(backgroundValues),
    left_right_difference: finiteOrZero(leftRightDifference),
    left_right_absolute_difference: Math.abs(finiteOrZero(leftRightDifference)),
    top_bottom_difference: finiteOrZero(topBottomDifference),
    top_bottom_absolute_difference: Math.abs(finiteOrZero(topBottomDifference)),
    edge_density: edgeCount / objectValues.length,
    shadow_ratio: ratioBelow(objectValues, config.shadowThreshold),
    highlight_ratio: ratioAbove(objectValues, config.highlightThreshold),
  };
}

export function aggregateConditionFeatures(imageRows, angles = ['front', 'left45', 'right45']) {
  if (!Array.isArray(imageRows) || !imageRows.length) throw new Error('At least one image feature row is required.');
  const conditionId = imageRows[0].condition_id;
  const result = { condition_id: conditionId };
  for (const featureName of IMAGE_FEATURE_NAMES) {
    for (const angle of angles) {
      const row = imageRows.find((candidate) => candidate.angle === angle);
      result[`${featureName}_${angle}`] = row ? finiteOrZero(Number(row[featureName])) : '';
    }
    const values = imageRows
      .map((row) => Number(row[featureName]))
      .filter(Number.isFinite);
    const average = mean(values);
    result[`${featureName}_mean`] = average;
    result[`${featureName}_min`] = Math.min(...values);
    result[`${featureName}_max`] = Math.max(...values);
    result[`${featureName}_std`] = standardDeviation(values, average);
  }
  return result;
}

export function imageFeaturesCsv(rows) {
  const headers = ['condition_id', 'angle', 'image_path', 'mask_path', ...IMAGE_FEATURE_NAMES];
  return rowsToCsv(headers, rows);
}

export function conditionFeaturesCsv(rows, angles = ['front', 'left45', 'right45']) {
  const headers = ['condition_id'];
  for (const featureName of IMAGE_FEATURE_NAMES) {
    headers.push(...angles.map((angle) => `${featureName}_${angle}`));
    headers.push(
      `${featureName}_mean`,
      `${featureName}_min`,
      `${featureName}_max`,
      `${featureName}_std`,
    );
  }
  return rowsToCsv(headers, rows);
}

export function responsesTemplateCsv() {
  return 'condition_id,participant_id,visibility_score,response_time_ms,created_at\r\n';
}

export function darkReplacementCsv(rows) {
  const headers = [
    'condition_id',
    'darknessPattern',
    'light_1_intensity',
    'light_2_intensity',
    'light_3_intensity',
    'mean_luminance',
    'object_mean_luminance',
    'dark_ratio',
    'local_contrast',
    'highlight_ratio',
  ];
  return rowsToCsv(headers, rows);
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, numericCsvValue(values[index] ?? '')]),
  ));
}

export async function imageDataFromDataUrl(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export function relativeLuminance(red, green, blue) {
  const [r, g, b] = [red, green, blue].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function validateImagePair(imageData, maskData) {
  if (!imageData?.data || !maskData?.data) throw new Error('Image and mask pixel data are required.');
  if (imageData.width !== maskData.width || imageData.height !== maskData.height) {
    throw new Error('Image and mask dimensions must match.');
  }
  if (imageData.data.length !== imageData.width * imageData.height * 4) {
    throw new Error('Image pixel data length is invalid.');
  }
}

function boxBlur(values, width, height, radius) {
  if (radius <= 0) return Float64Array.from(values);
  const result = new Float64Array(values.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const sampleY = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -radius; dx <= radius; dx += 1) {
          const sampleX = Math.min(width - 1, Math.max(0, x + dx));
          sum += values[sampleY * width + sampleX];
          count += 1;
        }
      }
      result[y * width + x] = sum / count;
    }
  }
  return result;
}

function sobelGradient(values, width, height) {
  const result = new Float64Array(values.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const topLeft = values[(y - 1) * width + x - 1];
      const top = values[(y - 1) * width + x];
      const topRight = values[(y - 1) * width + x + 1];
      const left = values[y * width + x - 1];
      const right = values[y * width + x + 1];
      const bottomLeft = values[(y + 1) * width + x - 1];
      const bottom = values[(y + 1) * width + x];
      const bottomRight = values[(y + 1) * width + x + 1];
      const gx = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
      const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
      result[y * width + x] = Math.min(1, Math.hypot(gx, gy) / 4);
    }
  }
  return result;
}

function rowsToCsv(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

function csvCell(value) {
  const normalized = typeof value === 'number' && Number.isFinite(value)
    ? Number(value.toFixed(10))
    : value ?? '';
  const text = String(normalized);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function numericCsvValue(value) {
  if (value === '') return '';
  const number = Number(value);
  return Number.isFinite(number) && String(number) === String(value).trim() ? number : value;
}

function ratioBelow(values, threshold) {
  return values.filter((value) => value < threshold).length / values.length;
}

function ratioAbove(values, threshold) {
  return values.filter((value) => value > threshold).length / values.length;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function meanOrNull(values) {
  return values.length ? mean(values) : 0;
}

function variance(values, average) {
  return mean(values.map((value) => (value - average) ** 2));
}

function standardDeviation(values, average) {
  return Math.sqrt(variance(values, average));
}

function maskedMean(values, mask) {
  let sum = 0;
  let count = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (!mask[index]) continue;
    sum += values[index];
    count += 1;
  }
  return count ? sum / count : 0;
}

function finiteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Generated image could not be decoded.'));
    image.src = dataUrl;
  });
}
