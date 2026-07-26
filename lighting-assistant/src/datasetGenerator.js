import {
  aggregateConditionFeatures,
  conditionFeaturesCsv,
  darkReplacementCsv,
  imageFeaturesCsv,
  parseCsv,
  responsesTemplateCsv,
} from './imageFeatures.js';

export const DATASET_SCHEMA_VERSION = '1.0';
export const DATASET_COORDINATE_SYSTEM = 'threejs_y_up';

const DEFAULT_LIGHTS = [
  {
    id: 'light-1',
    type: 'spot',
    position: [2.8, 4.6, 3.6],
    target: [0, 1.5, 0],
    intensity: 240,
    color: '#fff8f4',
    angle: 0.38,
    penumbra: 0.25,
    distance: 36,
    decay: 1,
  },
  {
    id: 'light-2',
    type: 'area',
    position: [-2.6, 3.2, 3],
    target: [0, 1.5, 0],
    intensity: 130,
    color: '#fff8f4',
    width: 0.5,
    height: 0.5,
  },
  {
    id: 'light-3',
    type: 'spot',
    position: [0, 5.2, -3.5],
    target: [0, 1.5, 0],
    intensity: 85,
    color: '#fff8f4',
    angle: 0.55,
    penumbra: 0.25,
    distance: 36,
    decay: 1,
  },
];

export function createDefaultDatasetRecord(id = '000001') {
  return normalizeDatasetRecord({
    schemaVersion: DATASET_SCHEMA_VERSION,
    id,
    createdAt: new Date().toISOString(),
    coordinateSystem: DATASET_COORDINATE_SYSTEM,
    scene: {
      model: 'dav',
      backgroundColor: '#15161a',
      material: 'study_white',
      ambientIntensity: 0.28,
      modelTransform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    },
    camera: {
      position: [0, 2.4, 7.4],
      target: [0, 1.55, 0],
      fov: 42,
    },
    render: {
      width: 640,
      height: 640,
      pixelRatio: 1,
    },
    lights: DEFAULT_LIGHTS,
  });
}

export function normalizeDatasetRecord(value, fallbackId = '000001') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('照明条件はJSONオブジェクトで指定してください。');
  }

  const scene = value.scene || {};
  const camera = value.camera || {};
  const render = value.render || {};
  const lights = Array.isArray(value.lights) ? value.lights : [];
  if (!lights.length) throw new Error('lightsには1件以上のライトが必要です。');

  const material = String(scene.material || 'study_white');
  if (!['study_white', 'original'].includes(material)) {
    throw new Error('scene.materialはstudy_whiteまたはoriginalにしてください。');
  }

  const normalized = {
    schemaVersion: String(value.schemaVersion || DATASET_SCHEMA_VERSION),
    id: normalizeDatasetId(value.id || fallbackId),
    createdAt: normalizeIsoDate(value.createdAt),
    coordinateSystem: DATASET_COORDINATE_SYSTEM,
    scene: {
      model: String(scene.model || 'dav'),
      backgroundColor: normalizeColor(scene.backgroundColor || '#15161a'),
      material,
      ambientIntensity: finiteInRange(scene.ambientIntensity, 0.28, 0, 4, 'scene.ambientIntensity'),
      modelTransform: {
        position: finiteVector(scene.modelTransform?.position, [0, 0, 0]),
        rotation: finiteVector(scene.modelTransform?.rotation, [0, 0, 0]),
        scale: positiveVector(scene.modelTransform?.scale, [1, 1, 1]),
      },
    },
    camera: {
      position: finiteVector(camera.position, [0, 2.4, 7.4]),
      target: finiteVector(camera.target, [0, 1.55, 0]),
      fov: finiteInRange(camera.fov, 42, 10, 120, 'camera.fov'),
    },
    render: {
      width: integerInRange(render.width, 640, 64, 4096, 'render.width'),
      height: integerInRange(render.height, 640, 64, 4096, 'render.height'),
      pixelRatio: finiteInRange(render.pixelRatio, 1, 0.25, 4, 'render.pixelRatio'),
    },
    lights: lights.map((light, index) => normalizeLight(light, index)),
  };
  if (value.design) normalized.design = sanitizeFiniteJson(value.design, 'design');
  if (value.generator) normalized.generator = sanitizeFiniteJson(value.generator, 'generator');
  if (value.rendererSettings) normalized.rendererSettings = normalizeRendererSettings(value.rendererSettings);
  if (value.featureExtraction) normalized.featureExtraction = sanitizeFiniteJson(value.featureExtraction, 'featureExtraction');
  if (Array.isArray(value.angles)) {
    normalized.angles = value.angles.map((view, index) => ({
      angle: String(view.angle || `view_${index + 1}`),
      camera: {
        position: finiteVector(view.camera?.position, normalized.camera.position),
        target: finiteVector(view.camera?.target, normalized.camera.target),
        fov: finiteInRange(view.camera?.fov, normalized.camera.fov, 10, 120, `angles[${index}].camera.fov`),
      },
    }));
  }
  if (value.outputs) normalized.outputs = sanitizeFiniteJson(value.outputs, 'outputs');
  return normalized;
}

export function parseDatasetInput(text) {
  if (!String(text || '').trim()) throw new Error('JSON本文を入力するか、JSONファイルを選択してください。');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`JSONを解析できません: ${error.message}`);
  }
  const records = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.conditions)
      ? parsed.conditions
      : [parsed];
  if (!records.length) throw new Error('照明条件がありません。');
  const normalized = records.map((record, index) => normalizeDatasetRecord(record, formatDatasetId(index + 1)));
  const ids = new Set();
  normalized.forEach((record) => {
    if (ids.has(record.id)) throw new Error(`ID ${record.id} が重複しています。`);
    ids.add(record.id);
  });
  return normalized;
}

export function serializeDatasetRecord(record) {
  return JSON.stringify(normalizeDatasetRecord(record, record?.id), null, 2);
}

export function formatDatasetId(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 999999) {
    throw new Error('IDには0〜999999の整数を指定してください。');
  }
  return String(number).padStart(6, '0');
}

export function normalizeDatasetId(value) {
  const stringValue = String(value || '').trim();
  if (/^\d{1,6}$/.test(stringValue)) return stringValue.padStart(6, '0');
  if (/^[A-Za-z0-9_-]+$/.test(stringValue)) return stringValue;
  throw new Error('IDには6桁以内の数字、英字、_、-だけを使用できます。');
}

export function createDatasetReadme() {
  return `# Lighting image dataset

One lighting condition is one evaluation unit. Each condition has front, left45, and right45 images and masks.

- Schema version: ${DATASET_SCHEMA_VERSION}
- Coordinate system: Three.js world coordinates (Y-up)
- Light, camera, model transform, material, background, and render settings are stored without randomization.
- Reapply a metadata JSON file in the dataset generator to reproduce its frame.
- Relative luminance is calculated from linearized sRGB.
- Signed left/right difference is right minus left. Signed top/bottom difference is top minus bottom.
- Feature thresholds are copied to each metadata JSON and \`features/feature-extraction.json\`.
- \`responses_template.csv\` joins to condition features with \`condition_id\`.
- Synthetic responses may be used only to verify the regression script. Their metrics are not research results.
`;
}

export async function createAnalysisDatasetWriter(rootHandle, featureConfig, options = {}) {
  if (!rootHandle?.getDirectoryHandle) throw new Error('A writable folder is required for dataset generation.');
  const datasetDirectory = await rootHandle.getDirectoryHandle('dataset', { create: true });
  const directories = {
    images: await datasetDirectory.getDirectoryHandle('images', { create: true }),
    masks: await datasetDirectory.getDirectoryHandle('masks', { create: true }),
    metadata: await datasetDirectory.getDirectoryHandle('metadata', { create: true }),
    features: await datasetDirectory.getDirectoryHandle('features', { create: true }),
    responses: await datasetDirectory.getDirectoryHandle('responses', { create: true }),
  };
  const replacementIds = new Set(options.replaceConditionIds || []);
  const existingImageRows = options.mergeExisting
    ? await readCsvFile(directories.features, 'image_features.csv')
    : [];
  const existingConditionRows = options.mergeExisting
    ? await readCsvFile(directories.features, 'condition_features.csv')
    : [];
  const imageRows = existingImageRows.filter((row) => !replacementIds.has(row.condition_id));
  const conditionRows = existingConditionRows.filter((row) => !replacementIds.has(row.condition_id));
  const replacementRows = [];
  await writeFile(datasetDirectory, 'README.md', new Blob([createDatasetReadme()], { type: 'text/markdown' }));

  return {
    async writeCondition(result) {
      const rows = [];
      for (const view of result.views) {
        await writeFile(directories.images, `${result.record.id}_${view.angle}.png`, dataUrlToBlob(view.dataUrl));
        await writeFile(directories.masks, `${result.record.id}_${view.angle}_mask.png`, dataUrlToBlob(view.maskDataUrl));
        const row = {
          condition_id: result.record.id,
          angle: view.angle,
          image_path: view.imagePath,
          mask_path: view.maskPath,
          ...view.features,
        };
        rows.push(row);
        imageRows.push(row);
      }
      const aggregate = aggregateConditionFeatures(rows);
      conditionRows.push(aggregate);
      if (result.record.design?.replacement === true) {
        replacementRows.push({
          condition_id: result.record.id,
          darknessPattern: result.record.design.darknessPattern,
          light_1_intensity: result.record.lights[0]?.intensity ?? '',
          light_2_intensity: result.record.lights[1]?.intensity ?? '',
          light_3_intensity: result.record.lights[2]?.intensity ?? '',
          mean_luminance: aggregate.mean_luminance_mean,
          object_mean_luminance: aggregate.object_mean_luminance_mean,
          dark_ratio: aggregate.dark_ratio_mean,
          local_contrast: aggregate.local_contrast_mean,
          highlight_ratio: aggregate.highlight_ratio_mean,
        });
      }
      const metadata = {
        ...result.record,
        outputs: {
          images: result.views.map((view) => ({
            angle: view.angle,
            imagePath: view.imagePath,
            maskPath: view.maskPath,
            camera: view.camera,
          })),
        },
      };
      await writeFile(
        directories.metadata,
        `${result.record.id}.json`,
        new Blob([serializeDatasetRecord(metadata)], { type: 'application/json' }),
      );
    },
    async finalize() {
      await writeFile(directories.features, 'image_features.csv', new Blob([imageFeaturesCsv(imageRows)], { type: 'text/csv' }));
      await writeFile(
        directories.features,
        'condition_features.csv',
        new Blob([conditionFeaturesCsv(conditionRows)], { type: 'text/csv' }),
      );
      await writeFile(
        directories.features,
        'feature-extraction.json',
        new Blob([`${JSON.stringify(featureConfig, null, 2)}\n`], { type: 'application/json' }),
      );
      await writeFile(
        directories.responses,
        'responses_template.csv',
        new Blob([responsesTemplateCsv()], { type: 'text/csv' }),
      );
      if (replacementRows.length) {
        await writeFile(
          directories.features,
          'dark_replacements.csv',
          new Blob([darkReplacementCsv(replacementRows)], { type: 'text/csv' }),
        );
      }
      return { conditionCount: conditionRows.length, imageCount: imageRows.length };
    },
  };
}

export function downloadAnalysisCondition(result, featureConfig) {
  const rows = result.views.map((view) => ({
    condition_id: result.record.id,
    angle: view.angle,
    image_path: view.imagePath,
    mask_path: view.maskPath,
    ...view.features,
  }));
  for (const view of result.views) {
    downloadBlob(`${result.record.id}_${view.angle}.png`, dataUrlToBlob(view.dataUrl));
    downloadBlob(`${result.record.id}_${view.angle}_mask.png`, dataUrlToBlob(view.maskDataUrl));
  }
  const metadata = {
    ...result.record,
    outputs: {
      images: result.views.map((view) => ({
        angle: view.angle,
        imagePath: view.imagePath,
        maskPath: view.maskPath,
        camera: view.camera,
      })),
    },
  };
  downloadBlob(`${result.record.id}.json`, new Blob([serializeDatasetRecord(metadata)], { type: 'application/json' }));
  downloadBlob('image_features.csv', new Blob([imageFeaturesCsv(rows)], { type: 'text/csv' }));
  downloadBlob(
    'condition_features.csv',
    new Blob([conditionFeaturesCsv([aggregateConditionFeatures(rows)])], { type: 'text/csv' }),
  );
  downloadBlob('responses_template.csv', new Blob([responsesTemplateCsv()], { type: 'text/csv' }));
  downloadBlob('feature-extraction.json', new Blob([JSON.stringify(featureConfig, null, 2)], { type: 'application/json' }));
}

export async function writeDatasetDirectory(rootHandle, entries) {
  if (!rootHandle?.getDirectoryHandle) throw new Error('保存先フォルダを使用できません。');
  const datasetDirectory = await rootHandle.getDirectoryHandle('dataset', { create: true });
  const imageDirectory = await datasetDirectory.getDirectoryHandle('images', { create: true });
  const metadataDirectory = await datasetDirectory.getDirectoryHandle('metadata', { create: true });
  await writeFile(datasetDirectory, 'README.md', new Blob([createDatasetReadme()], { type: 'text/markdown' }));
  for (const entry of entries) {
    await writeFile(imageDirectory, `${entry.record.id}.png`, dataUrlToBlob(entry.dataUrl));
    await writeFile(
      metadataDirectory,
      `${entry.record.id}.json`,
      new Blob([serializeDatasetRecord(entry.record)], { type: 'application/json' }),
    );
  }
  return { ok: true, count: entries.length };
}

export function downloadDatasetEntries(entries) {
  entries.forEach((entry) => {
    downloadBlob(`${entry.record.id}.png`, dataUrlToBlob(entry.dataUrl));
    downloadBlob(
      `${entry.record.id}.json`,
      new Blob([serializeDatasetRecord(entry.record)], { type: 'application/json' }),
    );
  });
  downloadBlob('README.md', new Blob([createDatasetReadme()], { type: 'text/markdown' }));
}

export function renderDatasetGeneratorView(app, options) {
  const defaultRecord = options.initialRecord || createDefaultDatasetRecord();
  const modelOptions = options.models.map((model) => (
    `<option value="${escapeHtml(model.id)}">${escapeHtml(model.label)}</option>`
  )).join('');
  app.innerHTML = `
    <main class="dataset-generator-screen">
      <header class="dataset-header">
        <div>
          <p class="dataset-eyebrow">Dataset generator</p>
          <h1>感性評価モデル用 画像生成</h1>
          <p>照明条件JSONとUIを含まないPNGを、同じIDで保存します。</p>
        </div>
        <a class="dataset-back-link" href="/">通常画面へ戻る</a>
      </header>
      <section class="dataset-workspace">
        <aside class="dataset-controls">
          <div class="dataset-control-grid">
            <label>ID<input id="dataset-id" value="${escapeHtml(defaultRecord.id)}" inputmode="numeric"></label>
            <label>モデル<select id="dataset-model">${modelOptions}</select></label>
            <label>背景色<input id="dataset-background" type="color" value="${defaultRecord.scene.backgroundColor}"></label>
            <label>材質
              <select id="dataset-material">
                <option value="study_white">研究用白色</option>
                <option value="original">元の材質</option>
              </select>
            </label>
            <label>幅<input id="dataset-width" type="number" min="64" max="4096" value="${defaultRecord.render.width}"></label>
            <label>高さ<input id="dataset-height" type="number" min="64" max="4096" value="${defaultRecord.render.height}"></label>
            <label>画角<input id="dataset-fov" type="number" min="10" max="120" value="${defaultRecord.camera.fov}"></label>
            <label>Pixel ratio<input id="dataset-pixel-ratio" type="number" min="0.25" max="4" step="0.25" value="${defaultRecord.render.pixelRatio}"></label>
          </div>
          <label class="dataset-json-label" for="dataset-json">照明条件JSON</label>
          <textarea id="dataset-json" spellcheck="false">${escapeHtml(JSON.stringify(defaultRecord, null, 2))}</textarea>
          <div class="dataset-file-row">
            <input id="dataset-json-file" type="file" accept=".json,application/json" multiple>
          </div>
          <div class="dataset-actions">
            <button type="button" id="dataset-apply">JSONを反映</button>
            <button type="button" id="dataset-export" class="secondary">現在値をJSON保存</button>
            <button type="button" id="dataset-capture" class="secondary">3視点・マスク・特徴を保存</button>
            <button type="button" id="dataset-regenerate-dark" class="secondary">暗条件15件を再生成</button>
            <button type="button" id="dataset-batch">60条件を一括生成</button>
          </div>
          <label class="dataset-approval">
            <input type="checkbox" id="dataset-design-approved">
            60条件の設計表を確認し、この一括生成を実行する
          </label>
        </aside>
        <section class="dataset-preview-panel">
          <div class="dataset-preview-heading">
            <div>
              <h2>レンダリングプレビュー</h2>
              <p id="dataset-render-info"></p>
            </div>
            <span id="dataset-status" role="status">初期化しています</span>
          </div>
          <div id="dataset-preview"></div>
          <pre id="dataset-log" aria-label="処理ログ"></pre>
        </section>
      </section>
    </main>
  `;
  app.querySelector('#dataset-model').value = defaultRecord.scene.model;
  app.querySelector('#dataset-material').value = defaultRecord.scene.material;
  return bindDatasetGeneratorEvents(app, options);
}

function bindDatasetGeneratorEvents(app, options) {
  const jsonInput = app.querySelector('#dataset-json');
  const status = app.querySelector('#dataset-status');
  const log = app.querySelector('#dataset-log');
  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    log.textContent += `${new Date().toLocaleTimeString()} ${message}\n`;
    log.scrollTop = log.scrollHeight;
  };
  const readRecords = () => parseDatasetInput(jsonInput.value);
  const syncFirstRecordFromForm = () => {
    const records = readRecords();
    const record = records[0];
    record.id = normalizeDatasetId(app.querySelector('#dataset-id').value);
    record.scene.model = app.querySelector('#dataset-model').value;
    record.scene.backgroundColor = app.querySelector('#dataset-background').value;
    record.scene.material = app.querySelector('#dataset-material').value;
    record.render.width = Number(app.querySelector('#dataset-width').value);
    record.render.height = Number(app.querySelector('#dataset-height').value);
    record.render.pixelRatio = Number(app.querySelector('#dataset-pixel-ratio').value);
    record.camera.fov = Number(app.querySelector('#dataset-fov').value);
    records[0] = normalizeDatasetRecord(record, record.id);
    jsonInput.value = records.length === 1
      ? JSON.stringify(records[0], null, 2)
      : JSON.stringify(records, null, 2);
    return records;
  };
  const syncFormFromRecord = (record) => {
    app.querySelector('#dataset-id').value = record.id;
    app.querySelector('#dataset-model').value = record.scene.model;
    app.querySelector('#dataset-background').value = record.scene.backgroundColor;
    app.querySelector('#dataset-material').value = record.scene.material;
    app.querySelector('#dataset-width').value = String(record.render.width);
    app.querySelector('#dataset-height').value = String(record.render.height);
    app.querySelector('#dataset-pixel-ratio').value = String(record.render.pixelRatio);
    app.querySelector('#dataset-fov').value = String(record.camera.fov);
  };
  const run = async (callback) => {
    try {
      setStatus('処理中です');
      await callback();
    } catch (error) {
      console.error(error);
      setStatus(error.message || String(error), true);
    }
  };

  app.querySelector('#dataset-apply').addEventListener('click', () => run(async () => {
    const [record] = readRecords();
    syncFormFromRecord(record);
    await options.applyRecord(record);
    options.setActiveRecord(record);
    updateDatasetInfo(app, record);
    setStatus(`${record.id} をシーンへ反映しました`);
  }));

  app.querySelector('#dataset-export').addEventListener('click', () => run(async () => {
    const record = options.getActiveRecord() || readRecords()[0];
    downloadBlob(`${record.id}.json`, new Blob([serializeDatasetRecord(record)], { type: 'application/json' }));
    setStatus(`${record.id}.json を保存しました`);
  }));

  app.querySelector('#dataset-capture').addEventListener('click', () => run(async () => {
    const [record] = readRecords();
    syncFormFromRecord(record);
    const result = await options.generateCondition(record, (message) => setStatus(message));
    downloadAnalysisCondition(result, options.getFeatureConfig());
    options.setActiveRecord(record);
    setStatus(`${record.id} の3視点・マスク・特徴量を保存しました`);
  }));

  app.querySelector('#dataset-batch').addEventListener('click', () => run(async () => {
    if (!app.querySelector('#dataset-design-approved').checked) {
      throw new Error('60条件の設計表を確認し、承認チェックを入れてください。');
    }
    if (typeof window.showDirectoryPicker !== 'function') {
      throw new Error('60条件の保存にはフォルダ保存対応ブラウザが必要です。');
    }
    const records = options.conditionRecords;
    const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const writer = await createAnalysisDatasetWriter(directoryHandle, options.getFeatureConfig());
    for (const [index, record] of records.entries()) {
      setStatus(`${index + 1} / ${records.length}: ${record.id} を生成中`);
      const result = await options.generateCondition(record, (message) => {
        setStatus(`${index + 1} / ${records.length}: ${record.id} ${message}`);
      });
      await writer.writeCondition(result);
      await nextFrame();
    }
    const summary = await writer.finalize();
    options.setActiveRecord(records.at(-1));
    updateDatasetInfo(app, records.at(-1));
    setStatus(`${summary.conditionCount}条件・${summary.imageCount}画像の生成が完了しました`);
  }));

  app.querySelector('#dataset-regenerate-dark').addEventListener('click', () => run(async () => {
    if (typeof window.showDirectoryPicker !== 'function') {
      throw new Error('暗条件の上書きにはフォルダ保存対応ブラウザが必要です。');
    }
    const records = options.replacementRecords;
    const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const writer = await createAnalysisDatasetWriter(directoryHandle, options.getFeatureConfig(), {
      mergeExisting: true,
      replaceConditionIds: records.map((record) => record.id),
    });
    for (const [index, record] of records.entries()) {
      setStatus(`${index + 1} / ${records.length}: ${record.id} を暗さ調整中`);
      const result = await options.generateCalibratedCondition(record, (message) => {
        setStatus(`${index + 1} / ${records.length}: ${record.id} ${message}`);
      });
      await writer.writeCondition(result);
      await nextFrame();
    }
    const summary = await writer.finalize();
    setStatus(`暗条件15件を更新しました。特徴CSVは${summary.conditionCount}条件です`);
  }));

  app.querySelector('#dataset-json-file').addEventListener('change', () => run(async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const payloads = [];
    for (const file of files) {
      const parsed = JSON.parse(await file.text());
      if (Array.isArray(parsed)) payloads.push(...parsed);
      else if (Array.isArray(parsed?.conditions)) payloads.push(...parsed.conditions);
      else payloads.push(parsed);
    }
    const records = payloads.map((record, index) => normalizeDatasetRecord(record, formatDatasetId(index + 1)));
    jsonInput.value = JSON.stringify(records.length === 1 ? records[0] : records, null, 2);
    syncFormFromRecord(records[0]);
    setStatus(`${records.length}件のJSONを読み込みました`);
  }));

  [
    '#dataset-id',
    '#dataset-model',
    '#dataset-background',
    '#dataset-material',
    '#dataset-width',
    '#dataset-height',
    '#dataset-pixel-ratio',
    '#dataset-fov',
  ].forEach((selector) => {
    app.querySelector(selector).addEventListener('change', () => run(async () => {
      const [record] = syncFirstRecordFromForm();
      updateDatasetInfo(app, record);
      setStatus('固定設定をJSONへ反映しました');
    }));
  });

  const initialRecord = options.initialRecord || createDefaultDatasetRecord();
  syncFormFromRecord(initialRecord);
  updateDatasetInfo(app, initialRecord);
  return { setStatus };
}

function updateDatasetInfo(app, record) {
  const info = app.querySelector('#dataset-render-info');
  if (info) info.textContent = `${record.id} / ${record.render.width} × ${record.render.height}px / ${record.scene.model}`;
}

function normalizeLight(light, index) {
  if (!light || typeof light !== 'object') throw new Error(`lights[${index}]が不正です。`);
  const type = light.type === 'area' ? 'area' : light.type === 'spot' ? 'spot' : '';
  if (!type) throw new Error(`lights[${index}].typeはspotまたはareaにしてください。`);
  const common = {
    id: String(light.id || `light-${index + 1}`),
    type,
    enabled: light.enabled !== false,
    position: finiteVector(light.position, [0, 3, 0]),
    target: finiteVector(light.target, [0, 1.5, 0]),
    intensity: nonNegative(light.intensity, 0, `lights[${index}].intensity`),
    color: normalizeColor(light.color || '#ffffff'),
  };
  if (type === 'spot') {
    return {
      ...common,
      angle: finiteInRange(light.angle, 0.4, 0.001, Math.PI / 2, `lights[${index}].angle`),
      penumbra: finiteInRange(light.penumbra, 0.25, 0, 1, `lights[${index}].penumbra`),
      distance: nonNegative(light.distance, 0, `lights[${index}].distance`),
      decay: nonNegative(light.decay, 1, `lights[${index}].decay`),
    };
  }
  return {
    ...common,
    width: positive(light.width, 0.5, `lights[${index}].width`),
    height: positive(light.height, 0.5, `lights[${index}].height`),
  };
}

function normalizeRendererSettings(value) {
  return {
    antialias: value.antialias !== false,
    preserveDrawingBuffer: value.preserveDrawingBuffer !== false,
    toneMapping: String(value.toneMapping || 'NeutralToneMapping'),
    exposure: finiteInRange(value.exposure, 1, 0, 20, 'rendererSettings.exposure'),
    outputColorSpace: String(value.outputColorSpace || 'SRGBColorSpace'),
    shadowMap: {
      enabled: value.shadowMap?.enabled !== false,
      type: String(value.shadowMap?.type || 'PCFSoftShadowMap'),
    },
  };
}

function sanitizeFiniteJson(value, path) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} contains a non-finite number.`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => sanitizeFiniteJson(item, `${path}[${index}]`));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeFiniteJson(item, `${path}.${key}`)]),
    );
  }
  throw new Error(`${path} contains an unsupported value.`);
}

function finiteVector(value, fallback) {
  const source = Array.isArray(value) ? value : fallback;
  if (source.length !== 3) throw new Error('3次元ベクトルは3要素の配列で指定してください。');
  return source.map((item, index) => finiteRequired(item, `vector[${index}]`));
}

function positiveVector(value, fallback) {
  return finiteVector(value, fallback).map((item) => {
    if (item <= 0) throw new Error('scaleは0より大きい値にしてください。');
    return item;
  });
}

function finiteRequired(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label}には有限値を指定してください。`);
  return number;
}

function finiteInRange(value, fallback, min, max, label) {
  const number = value === undefined ? fallback : finiteRequired(value, label);
  if (number < min || number > max) throw new Error(`${label}は${min}〜${max}で指定してください。`);
  return number;
}

function integerInRange(value, fallback, min, max, label) {
  const number = Math.round(value === undefined ? fallback : finiteRequired(value, label));
  if (number < min || number > max) throw new Error(`${label}は${min}〜${max}で指定してください。`);
  return number;
}

function nonNegative(value, fallback, label) {
  const number = value === undefined ? fallback : finiteRequired(value, label);
  if (number < 0) throw new Error(`${label}は0以上にしてください。`);
  return number;
}

function positive(value, fallback, label) {
  const number = value === undefined ? fallback : finiteRequired(value, label);
  if (number <= 0) throw new Error(`${label}は0より大きい値にしてください。`);
  return number;
}

function normalizeColor(value) {
  const color = String(value || '').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error(`色 "${color}" は#RRGGBB形式で指定してください。`);
  return color.toLowerCase();
}

function normalizeIsoDate(value) {
  if (!value) return new Date().toISOString();
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error('createdAtはISO 8601形式で指定してください。');
  return new Date(time).toISOString();
}

function dataUrlToBlob(dataUrl) {
  const [header, payload] = String(dataUrl || '').split(',');
  const mime = header?.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = atob(payload || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

async function writeFile(directory, filename, blob) {
  const handle = await directory.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function readCsvFile(directory, filename) {
  try {
    const handle = await directory.getFileHandle(filename);
    const file = await handle.getFile();
    return parseCsv(await file.text());
  } catch (error) {
    if (error?.name === 'NotFoundError') return [];
    throw error;
  }
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
