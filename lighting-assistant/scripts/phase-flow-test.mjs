class MockElement {
  constructor(tagName, attrs = {}, documentRef = null) {
    this.tagName = tagName.toUpperCase();
    this.attrs = attrs;
    this.ownerDocument = documentRef;
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.id = attrs.id || '';
    this.type = attrs.type || '';
    this.value = attrs.value || '';
    this.min = attrs.min || '';
    this.max = attrs.max || '';
    this.step = attrs.step || '';
    this.checked = Object.prototype.hasOwnProperty.call(attrs, 'checked');
    this.className = attrs.class || '';
    const classes = new Set(this.className.split(/\s+/).filter(Boolean));
    this.classList = {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      has: (name) => classes.has(name),
      contains: (name) => classes.has(name),
    };
    this.style = {};

    Object.entries(attrs).forEach(([key, value]) => {
      if (key.startsWith('data-')) {
        this.dataset[toCamel(key.slice(5))] = value;
      }
    });
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = parseElements(html, this.ownerDocument || document);
  }

  get innerHTML() {
    return this._innerHTML || '';
  }

  querySelector(selector) {
    return this.querySelectorAll(selector).item(0) || null;
  }

  querySelectorAll(selector) {
    return new MockNodeList(this.children.filter((element) => matches(element, selector)));
  }

  addEventListener(type, listener) {
    this.listeners[type] ||= [];
    this.listeners[type].push(listener);
  }

  dispatchEvent(event) {
    event.target ||= this;
    const listeners = this.listeners[event.type] || [];
    listeners.forEach((listener) => listener(event));
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  closest(selector) {
    return selector.split(',').some((part) => matches(this, part.trim())) ? this : null;
  }

  setPointerCapture() {}

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 160, height: 160 };
  }
}

class MockNodeList {
  constructor(items) {
    this.items = items;
    this.length = items.length;
    items.forEach((item, index) => {
      this[index] = item;
    });
  }

  item(index) {
    return this.items[index] || null;
  }

  forEach(callback) {
    this.items.forEach(callback);
  }

  find(callback) {
    return this.items.find(callback);
  }

  some(callback) {
    return this.items.some(callback);
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }
}

class MockDocument {
  constructor() {
    this.app = new MockElement('div', { id: 'app' }, this);
    this.scene = new MockCanvas('canvas', { id: 'scene' }, this);
  }

  createElement(tagName) {
    if (tagName.toLowerCase() === 'canvas') return new MockCanvas('canvas', {}, this);
    return new MockElement(tagName, {}, this);
  }

  querySelector(selector) {
    if (selector === '#app') return this.app;
    if (selector === '#scene') return this.scene;
    return this.app.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.app.querySelectorAll(selector);
  }
}

class MockCanvas extends MockElement {
  constructor(tagName, attrs = {}, documentRef = null) {
    super(tagName, attrs, documentRef);
    this.width = Number(attrs.width) || 1280;
    this.height = Number(attrs.height) || 800;
    this.dataUrlCalls = [];
  }

  toDataURL(type, quality) {
    this.dataUrlCalls.push({ type, quality, width: this.width, height: this.height });
    return `data:${type || 'image/png'};base64,phaseflowmock-${this.width}x${this.height}-q${quality ?? 'default'}`;
  }

  getContext() {
    return {
      setTransform() {},
      fillRect() {},
      beginPath() {},
      arc() {},
      fill() {},
      drawImage() {},
      fillStyle: '',
    };
  }
}

class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

function parseElements(html, documentRef) {
  const elements = [];
  const tagPattern = /<([a-zA-Z][\w-]*)([^>]*)>/g;
  let match;
  while ((match = tagPattern.exec(html))) {
    const tag = match[1].toLowerCase();
    if (tag.startsWith('/')) continue;
    elements.push(new MockElement(tag, parseAttrs(match[2]), documentRef));
  }
  return elements;
}

function parseAttrs(source) {
  const attrs = {};
  const attrPattern = /([\w-]+)(?:="([^"]*)")?/g;
  let match;
  while ((match = attrPattern.exec(source))) {
    attrs[match[1]] = match[2] ?? '';
  }
  return attrs;
}

function matches(element, selector) {
  if (!element) return false;
  if (selector.startsWith('#')) return element.id === selector.slice(1);
  if (selector.startsWith('.')) return element.classList.has(selector.slice(1));
  const tagMatch = selector.match(/^([a-zA-Z][\w-]*)/);
  if (tagMatch && element.tagName.toLowerCase() !== tagMatch[1].toLowerCase()) return false;

  const attrMatches = [...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
  return attrMatches.every(([, key, expected]) => {
    const actual = element.attrs[key];
    if (actual === undefined) return false;
    return expected === undefined || actual === expected;
  });
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertAllButtonsAreNonSubmit(context) {
  const buttons = context.querySelectorAll('button');
  assert(buttons.length > 0, 'expected buttons to exist');
  buttons.forEach((button) => {
    assert(button.type === 'button', `button should be type=button: ${button.id || button.className}`);
  });
}

function input(element, value) {
  element.value = String(value);
  element.dispatchEvent({ type: 'input', target: element });
}

function changeValue(element, value) {
  element.value = String(value);
  element.dispatchEvent({ type: 'change', target: element });
}

function change(element, checked) {
  element.checked = checked;
  element.dispatchEvent({ type: 'change', target: element });
}

globalThis.document = new MockDocument();
globalThis.localStorage = new MockLocalStorage();
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  __LIGHTING_ASSISTANT_SKIP_3D__: true,
  location: { pathname: '/', search: '?participant=P001' },
  addEventListener() {},
  confirm() {
    return true;
  },
};
globalThis.console = console;

await import('../src/main.js');

const app = document.querySelector('#app');
const api = window.__lightingAssistant;

assert(api.isLightKindMismatch(null, { kind: 'area' }) === true, 'missing light entry should rebuild');
assert(api.isLightKindMismatch({ light: {} }, { kind: 'area' }) === false, 'RectAreaLight with undefined isSpotLight should not rebuild');
assert(api.isLightKindMismatch({ light: { isSpotLight: true } }, { kind: 'spot' }) === false, 'SpotLight should match spot data');
assert(api.isLightKindMismatch({ light: {} }, { kind: 'spot' }) === true, 'Area light should rebuild when data switches to spot');

const summary = api.summarizeIlluminanceSamples([
  { position: {}, normal: {}, illuminance: 10, valid: true },
  { position: {}, normal: {}, illuminance: 20, valid: true },
  { position: {}, normal: {}, illuminance: 40, valid: true },
]);
assert(summary.averageIlluminance === 70 / 3, 'summary should calculate average illuminance');
assert(summary.minIlluminance === 10, 'summary should calculate minimum illuminance');
assert(summary.maxIlluminance === 40, 'summary should calculate maximum illuminance');
assert(summary.percentile10Illuminance === 12, 'summary should calculate interpolated 10th percentile illuminance');
assert(Math.abs(summary.uniformity - (12 / (70 / 3))) < 0.000001, 'summary should calculate p10 over average uniformity');
assert(summary.validSampleCount === 3 && summary.totalSampleCount === 3, 'summary should count valid samples');

const filteredSummary = api.summarizeIlluminanceSamples([
  { position: {}, normal: {}, illuminance: 30, valid: true },
  { position: {}, normal: {}, illuminance: Number.NaN, valid: true },
  { position: {}, normal: {}, illuminance: Number.POSITIVE_INFINITY, valid: true },
  { position: {}, normal: {}, illuminance: -1, valid: true },
  { position: {}, normal: {}, illuminance: 99, valid: false },
]);
assert(filteredSummary.averageIlluminance === 30, 'summary should ignore invalid illuminance values');
assert(filteredSummary.validSampleCount === 1 && filteredSummary.totalSampleCount === 5, 'summary should retain total sample count');

const emptySummary = api.summarizeIlluminanceSamples([]);
assert(emptySummary.averageIlluminance === null, 'empty summary average should be null');
assert(emptySummary.minIlluminance === null, 'empty summary minimum should be null');
assert(emptySummary.maxIlluminance === null, 'empty summary maximum should be null');
assert(emptySummary.uniformity === null, 'empty summary uniformity should be null');
assert(emptySummary.validSampleCount === 0 && emptySummary.totalSampleCount === 0, 'empty summary should have zero samples');

const zeroSummary = api.summarizeIlluminanceSamples([
  { position: {}, normal: {}, illuminance: 0, valid: true },
  { position: {}, normal: {}, illuminance: 0, valid: true },
]);
assert(zeroSummary.uniformity === 0, 'all-zero summary should not produce NaN uniformity');
assert(zeroSummary.uniformity >= 0 && zeroSummary.uniformity <= 1, 'uniformity should stay in the 0-1 range');
const singleZeroOutlierSummary = api.summarizeIlluminanceSamples([
  { position: {}, normal: {}, illuminance: 0, valid: true },
  ...Array.from({ length: 10 }, () => ({ position: {}, normal: {}, illuminance: 100, valid: true })),
]);
assert(singleZeroOutlierSummary.percentile10Illuminance > 0, 'a single zero sample should not force p10 illuminance to zero');
assert(singleZeroOutlierSummary.uniformity > 0, 'a single zero sample should not force uniformity to zero');

const allOffSamples = api.generateSurfaceMeasurementPoints('abstract').map((sample) => ({
  ...sample,
  illuminance: api.calculateDirectIlluminanceAtSample(sample, api.state.lights.map((light) => ({ ...light, enabled: false }))),
}));
const allOffSummary = api.summarizeIlluminanceSamples(allOffSamples);
assert(allOffSummary.averageIlluminance === 0, 'all lights off should produce zero average illuminance without throwing');

const uniformTask = api.tasks.find((task) => task.id === 'uniform_visibility');
const shapeTask = api.tasks.find((task) => task.id === 'shape_emphasis');
const directEvaluation = api.evaluateTask(uniformTask, { ...api.state, surfaceIlluminanceSummary: summary });
assert(directEvaluation.evaluationSource === 'direct_illuminance', 'uniform visibility should use direct illuminance when summary exists');
assert(Number.isFinite(directEvaluation.visibilityBreakdown.legacyScore), 'direct evaluation should retain legacy score');
assert(Number.isFinite(directEvaluation.visibilityBreakdown.directScore), 'direct evaluation should calculate diagnostic direct score');
assert(directEvaluation.score === Math.round(directEvaluation.visibilityBreakdown.legacyScore * 0.7 + directEvaluation.visibilityBreakdown.directScore * 0.3), 'uniform score should combine legacy score with at most 30 percent direct illuminance score');
const fallbackEvaluation = api.evaluateTask(uniformTask, { ...api.state, surfaceIlluminanceSummary: emptySummary });
assert(fallbackEvaluation.evaluationSource === 'legacy', 'uniform visibility should fall back to legacy without valid summary');
const shapeEvaluation = api.evaluateTask(shapeTask, { ...api.state, surfaceIlluminanceSummary: summary });
assert(shapeEvaluation.evaluationSource === 'legacy', 'other tasks should keep legacy evaluation');
['shape_emphasis', 'soft_lighting', 'background_separation', 'visual_focus'].forEach((taskId) => {
  const task = api.tasks.find((item) => item.id === taskId);
  assert(api.evaluateTask(task, { ...api.state, surfaceIlluminanceSummary: summary }).evaluationSource === 'legacy', `${taskId} should not use direct illuminance evaluation yet`);
});

const excludedVisible = { visible: true, userData: { excludeFromCapture: true } };
const excludedHidden = { visible: false, userData: { excludeFromCapture: true } };
const includedVisible = { visible: true, userData: {} };
const fakeCaptureRoot = {
  traverse(callback) {
    [excludedVisible, excludedHidden, includedVisible].forEach(callback);
  },
};
const hiddenRecords = api.hideCaptureExcludedObjects(fakeCaptureRoot);
assert(excludedVisible.visible === false, 'capture excluded visible object should be hidden during capture');
assert(excludedHidden.visible === false, 'capture excluded hidden object should stay hidden during capture');
assert(includedVisible.visible === true, 'non-excluded object should remain visible during capture');
assert(hiddenRecords.length === 2, 'hideCaptureExcludedObjects should record excluded objects');
api.restoreCaptureExcludedObjects(hiddenRecords);
assert(excludedVisible.visible === true, 'capture excluded visible object should be restored after capture');
assert(excludedHidden.visible === false, 'capture excluded hidden object should restore to hidden after capture');
assert(includedVisible.visible === true, 'non-excluded object should remain unchanged after restore');
excludedVisible.visible = true;
const wrapperRecords = api.hideCaptureExcludedObjects(fakeCaptureRoot);
assert(excludedVisible.visible === false, 'capture wrapper setup should hide excluded objects');
api.restoreCaptureExcludedObjects(wrapperRecords);
assert(excludedVisible.visible === true, 'capture wrapper cleanup should restore excluded objects');

assert(api.state.phase === 'setup', 'initial phase should be setup');
assert(app.querySelector('#start'), 'start button should exist');
assert(api.state.participantId === 'P001', 'participant id should initialize from URL query');
assert(app.querySelector('#participant-id').value === 'P001', 'participant input should show URL participant id');
window.location.pathname = '/admin';
api.render();
assert(app.querySelector('#admin-passcode'), 'admin route should show passcode input');
assert(app.innerHTML.includes('菫晏ｭ倥＆繧後◆謠仙・繝・・繧ｿ縺ｯ縺ゅｊ縺ｾ縺帙ｓ') === false, 'admin empty state should be hidden before authentication');
input(app.querySelector('#admin-passcode'), 'dev-admin');
app.querySelector('#admin-login').click();
assert(api.state.admin.authenticated === true, 'admin passcode should authenticate in development fallback');
assert(!app.querySelector('.admin-submission-row'), 'admin should show no rows when there are no submissions');
window.location.pathname = '/';
api.render();
assert(app.querySelector('#start'), 'study route should still render setup after leaving admin');
assert(app.querySelectorAll('.task-choice').length === 7, 'tutorials plus five task choices should exist');
assertAllButtonsAreNonSubmit(app);

app.querySelectorAll('.task-choice').find((button) => button.dataset.task === 'uniform_visibility').click();
input(app.querySelector('#participant-id'), '');
app.querySelector('#start').click();
assert(api.state.participantId.startsWith('anonymous-'), 'empty participant id should generate anonymous id on start');
assert(api.state.sessionId.startsWith('session-'), 'session id should be generated on start');
assert(app.querySelector('#surface-samples-visible'), 'surface sample debug toggle should exist');
assert(app.querySelector('#surface-samples-visible').checked === false, 'surface sample debug toggle should be off by default');
change(app.querySelector('#surface-samples-visible'), true);
assert(api.state.showSurfaceSamples === true, 'surface sample debug toggle should update state');
api.state.camera = { theta: 23, phi: 48, radius: 8.4, view: 'free' };
app.querySelector('#submit').click();
assert(api.state.camera.theta === 23 && api.state.camera.phi === 48 && api.state.camera.radius === 8.4, 'submission capture should restore user camera state');
assert(api.state.result.feedbackInput.evaluationSource === 'direct_illuminance', 'uniform feedback input should use direct illuminance source');
assert(api.state.result.feedbackInput.metrics.validSampleCount > 0, 'uniform feedback input should include valid sample count');
assert(api.state.result.feedbackInput.metrics.highlightClippingRate === null, 'highlight clipping metric should remain null');
assert(api.state.result.submissionId.startsWith('submission-'), 'submission id should be generated on submit');
assert(api.state.result.createdAt, 'submission createdAt should be set');
assert(api.state.submissions.length === 0, 'lighting confirmation should not store a completed submission in memory');
assert(api.loadSubmissions().length === 0, 'lighting confirmation should not persist a completed submission');
assert(api.state.result.draftSubmission.submissionId === api.state.result.submissionId, 'lighting confirmation should create a draft submission');
assert(api.state.result.submission === null, 'state.result should not reference a completed submission before self evaluation is saved');
assert(app.querySelector('#complete-submission'), 'feedback should show a completion button before final save');
app.querySelector('#complete-submission').click();
assert(api.state.submissions.length === 0, 'invalid user impression should not save a completed submission');
assert(api.loadSubmissions().length === 0, 'invalid user impression should not persist a completed submission');
assert(api.state.completionError, 'invalid user impression should show a validation message');
assert(api.state.persistenceStatus === null, 'lighting confirmation should not report completed browser storage');
assert(api.state.persistenceMessage === '', 'lighting confirmation should not show a successful storage message');
assert(api.state.result.draftSubmission.participantId === api.state.participantId, 'draft submission should include participant id');
assert(api.state.result.draftSubmission.sessionId === api.state.sessionId, 'draft submission should include session id');
assert(api.state.result.draftSubmission.lightingState.lights.length === 3, 'draft submission should include serialized lighting state');
assert(api.state.result.draftSubmission.systemDiagnostics.evaluationSource === 'direct_illuminance', 'draft submission should include system diagnostics');
assert(api.state.result.draftSubmission.analysisFlags.hasMultipleViews === true, 'draft submission should include analysis flags');
const expectedViewIds = ['user_view', 'front', 'left_45', 'right_45', 'upper_front'];
assert(api.state.result.submissionImages.length === 5, 'result should include five submission images');
assert(expectedViewIds.every((viewId) => api.state.result.submissionImages.some((image) => image.viewId === viewId)), 'submission images should include all required view ids');
assert(app.querySelector('.submission-images-preview'), 'submission images preview should exist');
assert(app.querySelectorAll('.submission-image-card').length === 5, 'submission images preview should render five cards');
assert(expectedViewIds.every((viewId) => app.innerHTML.includes(viewId)), 'submission images preview should show all required view ids');
api.state.result.submissionImages.forEach((image) => {
  assert(image.dataUrl.startsWith('data:image/jpeg'), `image ${image.viewId} should be saved as JPEG`);
  assert(image.dataUrl.includes('420x263'), `image ${image.viewId} should be downscaled for storage`);
  assert(image.dataUrl.includes('q0.7'), `image ${image.viewId} should use compressed JPEG quality`);
  ['cameraPosition', 'cameraTarget'].forEach((key) => {
    assert(Number.isFinite(image[key].x), `${image.viewId} ${key}.x should be finite`);
    assert(Number.isFinite(image[key].y), `${image.viewId} ${key}.y should be finite`);
    assert(Number.isFinite(image[key].z), `${image.viewId} ${key}.z should be finite`);
  });
});
const sanitizedRecord = api.sanitizeSubmissionRecord({ a: Number.NaN, b: undefined, c: Number.POSITIVE_INFINITY, d: { ok: 1 } });
assert(sanitizedRecord.a === null && sanitizedRecord.b === null && sanitizedRecord.c === null && sanitizedRecord.d.ok === 1, 'sanitizeSubmissionRecord should remove invalid JSON values');
assert(api.downloadSubmissionJson() === null, 'downloadSubmissionJson should require completed self evaluation');
assert(api.state.history.some((entry) => entry.param === 'decision' && entry.evaluationSource === 'direct_illuminance' && entry.illuminanceSummary), 'decision log should include illuminance summary and source');
assert(app.querySelector('#visibility-rating'), 'visibility rating select should exist');
assert(app.querySelector('#impression-confidence'), 'confidence select should exist');
assert(app.querySelector('#impression-comment'), 'comment textarea should exist');
const reasonTag = app.querySelectorAll('input[name="reason-tags"]')[0];
assert(reasonTag, 'reason tag checkbox should exist');
const impressionTag = app.querySelectorAll('input[name="impression-tags"]')[0];
assert(impressionTag, 'impression tag checkbox should exist');
const reasonTagValue = reasonTag.value;
const impressionTagValue = impressionTag.value;
assert(app.querySelector('#primary-impression'), 'primary impression select should exist');
change(reasonTag, true);
input(app.querySelector('#impression-comment'), 'partial comment should stay');
app.querySelector('#complete-submission').click();
assert(api.state.submissions.length === 0, 'missing visibility rating should not save completed submission');
assert(api.state.result.userImpression.comment === 'partial comment should stay', 'validation error should keep comment input in state');
assert(app.innerHTML.includes('partial comment should stay'), 'validation error should keep comment input in rendered form');
assert(app.querySelectorAll('input[name="reason-tags"]').some((inputElement) => inputElement.value === reasonTagValue && inputElement.checked), 'validation error should keep reason tag input');
const reasonTagAfterValidation = app.querySelectorAll('input[name="reason-tags"]').find((inputElement) => inputElement.value === reasonTagValue);
const impressionTagAfterValidation = app.querySelectorAll('input[name="impression-tags"]').find((inputElement) => inputElement.value === impressionTagValue);
changeValue(app.querySelector('#visibility-rating'), 4);
change(reasonTagAfterValidation, true);
change(impressionTagAfterValidation, true);
changeValue(app.querySelector('#primary-impression'), impressionTagValue);
input(app.querySelector('#impression-comment'), 'visibility confirmed');
changeValue(app.querySelector('#impression-confidence'), 3);
assert(api.state.result.userImpression.visibilityRating === 4, 'visibility rating should update result user impression');
assert(api.state.result.userImpression.reasonTags.includes(reasonTagValue), 'reason tag should update result user impression');
assert(api.state.result.userImpression.impressionTags.includes(impressionTagValue), 'impression tag should update result user impression');
assert(api.state.result.userImpression.primaryImpression === impressionTagValue, 'primary impression should update result user impression');
assert(api.state.result.userImpression.comment === 'visibility confirmed', 'comment should update result user impression');
assert(api.state.result.userImpression.confidence === 3, 'confidence should update result user impression');assert(api.state.result.draftSubmission.userImpression.visibilityRating === 4, 'visibility rating should update draft submission');
assert(api.state.result.draftSubmission.userImpression.impressionTags.includes(impressionTagValue), 'impression tag should update draft submission');
assert(api.state.result.draftSubmission.userImpression.primaryImpression === impressionTagValue, 'primary impression should update draft submission');
assert(api.state.submissions.length === 0, 'self evaluation edits should not save completed submission before completion');
app.querySelector('#complete-submission').click();
assert(api.state.result.completed === true, 'completion button should mark result as completed');
assert(api.state.submissions.length === 1, 'completion button should store completed submission in memory');
assert(api.loadSubmissions().length === 1, 'completion button should persist completed submission');
assert(api.state.persistenceStatus.ok === true, 'completion button should report successful browser storage');
assert(Boolean(api.state.completionMessage), 'completion should show a thank-you message');
assert(api.state.submissions[0].participantId === api.state.participantId, 'completed submission should include participant id');
assert(api.state.submissions[0].sessionId === api.state.sessionId, 'completed submission should include session id');
assert(api.state.submissions[0].submissionId === api.state.result.submissionId, 'completed submission should include submission id');
assert(api.state.result.submission.submissionId === api.state.result.submissionId, 'state.result should reference the completed submission record');
assert(api.state.submissions[0].createdAt === api.state.result.createdAt, 'completed submission should include createdAt');
assert(api.state.submissions[0].taskId === 'uniform_visibility', 'completed submission should include task id');
assert(api.state.submissions[0].lightingState.lights.length === 3, 'completed submission should include serialized lighting state');
assert(api.state.submissions[0].submissionImages.length === 5, 'completed submission should include five submission images');
assert(api.state.submissions[0].userImpression.visibilityRating === 4, 'completed submission should include visibility rating');
assert(api.state.submissions[0].userImpression.impressionTags.includes(impressionTagValue), 'completed submission should include impression tags');
assert(api.state.submissions[0].userImpression.primaryImpression === impressionTagValue, 'completed submission should include primary impression');
const downloadedJson = api.downloadSubmissionJson();
const downloadedSubmission = JSON.parse(downloadedJson);
assert(downloadedSubmission.userImpression.visibilityRating === 4, 'downloaded completed submission should include user impression');
window.location.pathname = '/admin';
api.render();
assert(app.querySelector('.admin-submission-row'), 'admin should show submission rows after authentication');
assert(app.innerHTML.includes(api.state.result.submissionId), 'admin list should include submission id');
assert(app.innerHTML.includes('user_view') && app.innerHTML.includes('front') && app.innerHTML.includes('upper_front'), 'admin detail should show submission image view ids');
assert(app.innerHTML.includes('systemDiagnostics'), 'admin detail should show system diagnostics');
assert(app.innerHTML.includes('userImpression'), 'admin detail should show user impression JSON');
assert(app.querySelector('#admin-import-file'), 'admin should provide a JSON file import input');
const singleAdminJson = api.downloadSingleSubmissionJson(api.state.result.submissionId);
assert(JSON.parse(singleAdminJson).submissionId === api.state.result.submissionId, 'single admin download should return selected submission JSON');
const allAdminJson = api.downloadAllSubmissionsJson();
assert(JSON.parse(allAdminJson).length >= 1, 'all admin download should return submissions array JSON');
const exportedAdminJson = api.exportAllSubmissionsJson();
assert(JSON.parse(exportedAdminJson).length === 1, 'admin export should return persisted submissions JSON');
assert(api.isSubmissionRecord(JSON.parse(singleAdminJson)), 'single submission JSON should be recognized as a submission record');
api.state.submissions = [];
api.render();
assert(app.querySelector('.admin-submission-row'), 'admin should reload persisted submissions after memory is cleared');
assert(api.state.submissions.length === 1, 'admin render should sync state from dataStore');
api.deleteSingleSubmission(api.state.result.submissionId);
assert(api.loadSubmissions().length === 0, 'single delete should remove persisted submission');
assert(!app.querySelector('.admin-submission-row'), 'single delete should remove row from admin list');
const emptyImport = api.importSubmissionsJson('');
assert(emptyImport.ok === false && emptyImport.importedCount === 0 && Boolean(emptyImport.error), 'empty import should return a helpful error');
const filenameImport = api.importSubmissionsJson('submission.json');
assert(filenameImport.ok === false && filenameImport.importedCount === 0 && Boolean(filenameImport.error), 'filename-only import should return a helpful error');
input(app.querySelector('#admin-import-json'), singleAdminJson);
app.querySelector('#import-submissions').click();
assert(api.loadSubmissions().length === 1, 'admin import should restore a single submission object');
assert(Boolean(api.state.admin.message), 'admin import should show the imported single submission count');
assert(app.querySelector('.admin-submission-row'), 'admin import should render restored row');
api.clearAllSubmissionData();
const arrayImport = api.importSubmissionsJson(exportedAdminJson);
assert(arrayImport.ok === true && arrayImport.importedCount === 1 && api.loadSubmissions().length === 1, 'array import should import submissions');
api.clearAllSubmissionData();
const wrappedImport = api.importSubmissionsJson(JSON.stringify({ submissions: JSON.parse(exportedAdminJson) }));
assert(wrappedImport.ok === true && wrappedImport.importedCount === 1 && api.loadSubmissions().length === 1, 'wrapped submissions import should import submissions');
const replacement = { ...JSON.parse(singleAdminJson), participantId: 'replacement-participant' };
const replaceImport = api.importSubmissionsJson(JSON.stringify(replacement));
assert(replaceImport.ok === true && replaceImport.importedCount === 1, 'duplicate import should report the imported count');
assert(api.loadSubmissions().length === 1, 'duplicate import should replace instead of adding another row');
assert(api.getSubmissionById(replacement.submissionId).participantId === 'replacement-participant', 'duplicate import should replace the existing submission record');
api.clearAllSubmissionData();
assert(api.loadSubmissions().length === 0, 'clear all should remove persisted submissions');
assert(!app.querySelector('.admin-submission-row'), 'clear all should remove rows from admin list');
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = () => {
  const error = new Error('quota');
  error.name = 'QuotaExceededError';
  throw error;
};
const failedSave = api.saveSubmission({ submissionId: 'quota-test' });
assert(failedSave.ok === false && failedSave.error.includes('JSON'), 'dataStore save failure should return a JSON fallback message');
api.appendSubmissionToLog({ submissionId: 'quota-test' });
assert(Boolean(api.state.persistenceMessage), 'appendSubmissionToLog should expose a save failure message');
assert(api.state.persistenceStatus.ok === false, 'save failure should update persistence status');
assert(Boolean(api.state.persistenceStatus.error), 'save failure should keep the failure reason');
localStorage.setItem = originalSetItem;
api.clearAllSubmissionData();
api.state.persistenceMessage = '';
window.location.pathname = '/';
api.render();
assert(!app.innerHTML.includes('NaN'), 'feedback should not show NaN');
assert(!app.innerHTML.includes('undefined'), 'feedback should not show undefined');
assert(!app.innerHTML.includes('null lx'), 'feedback should not show null lx');
assert(!app.innerHTML.includes(' lx'), 'relative illuminance should not be labeled as lx');
app.querySelector('#new-task').click();
assert(api.state.phase === 'setup', 'new task should return to setup after uniform feedback check');

app.querySelectorAll('.task-choice').find((button) => button.dataset.task === 'shape_emphasis').click();
assert(api.state.taskId === 'shape_emphasis', 'task card click should select shape emphasis');

app.querySelectorAll('.model-btn')[2].click();
assert(api.state.modelId === 'figure', 'model button should switch subject model');

change(app.querySelector('#hint-toggle'), false);
assert(api.state.assist.hint === false, 'hint toggle should update state');
change(app.querySelector('#feedback-toggle'), true);
assert(api.state.assist.feedback === true, 'feedback toggle should update state');

app.querySelector('#start').click();
assert(api.state.phase === 'operation', 'start should move to operation phase');
assert(app.querySelector('#submit'), 'submit button should exist in operation phase');
assert(app.querySelectorAll('.tab-btn').length === 3, 'three light tabs should exist');
assert(app.querySelector('#top-map'), 'top map should exist');
assert(app.querySelector('#light-enabled'), 'light on/off control should exist');
assert(app.querySelector('#helper-visible'), 'helper visibility control should exist');
assert(app.querySelector('#reset-lights'), 'reset lights control should exist');
assertAllButtonsAreNonSubmit(app);

app.querySelectorAll('.tab-btn')[1].click();
assert(api.state.activeLight === 1, 'light tab should switch active light');

app.querySelectorAll('.type-btn').find((button) => button.dataset.kind === 'spot').click();
assert(api.state.lights[1].kind === 'spot', 'type toggle should switch active light to spot');

assert(api.allowLightColorEditing === false, 'basic training should disable light color editing');
assert(!app.querySelector('#color'), 'color input should be hidden in basic training');
assert(api.state.lights.every((light) => light.color === api.BASIC_TRAINING_LIGHT_COLOR), 'basic training lights should use fixed white color');
assert(app.innerHTML.includes(api.BASIC_TRAINING_LIGHT_COLOR_LABEL), 'operation should describe fixed day-white color');
assert(app.querySelector('input[data-param="intensity"]'), 'operation should include light intensity control');
assert(!app.querySelector('input[data-param="illuminance"]'), 'operation should not expose illuminance as a light control');

change(app.querySelector('#light-enabled'), false);
assert(api.state.lights[1].enabled === false, 'light on/off control should update active light enabled state');
change(app.querySelector('#helper-visible'), false);
assert(api.state.lights[1].showHelper === false, 'helper visibility control should update active light helper state');
app.querySelector('#reset-lights').click();
assert(api.state.activeLight === 0, 'reset should return active light to first light');
assert(api.state.lights[2].enabled === false, 'reset should restore initial light enabled states');
assert(api.state.sessionStats.resetCount === 1, 'reset should increment reset count');
app.querySelectorAll('.tab-btn')[1].click();

const xSlider = app.querySelectorAll('input[type="range"][data-param]').find((slider) => slider.dataset.param === 'x');
input(xSlider, 6);
assert(api.state.lights[1].x === 6, 'x slider should update active light x');

const yNumber = app.querySelectorAll('input[type="number"][data-param]').find((inputElement) => inputElement.dataset.param === 'y');
changeValue(yNumber, -3.5);
assert(api.state.lights[1].y === -3.5, 'numeric input should update active light y');

const pane = app.querySelector('#preview-stage');
const oldTheta = api.state.camera.theta;
pane.dispatchEvent({ type: 'pointerdown', target: pane, clientX: 10, clientY: 10, pointerId: 1 });
pane.dispatchEvent({ type: 'pointermove', target: pane, clientX: 30, clientY: 20, pointerId: 1 });
pane.dispatchEvent({ type: 'pointerup', target: pane, clientX: 30, clientY: 20, pointerId: 1 });
assert(api.state.camera.theta !== oldTheta, 'preview drag should rotate camera');

app.querySelectorAll('.view-btn').find((button) => button.dataset.view === 'top').click();
assert(api.state.camera.view === 'top' && api.state.camera.phi === 0, 'top view button should set exact top camera');

const map = app.querySelector('#top-map');
map.dispatchEvent({ type: 'pointerdown', target: map, clientX: 120, clientY: 40, pointerId: 2 });
assert(api.state.lights[1].x > 0 && api.state.lights[1].y < 0, 'top map pointer should match top preview x/y direction');

app.querySelector('#submit').click();
assert(api.state.phase === 'feedback', 'submit should move to feedback phase');
assert(app.querySelector('#retry'), 'retry should exist in feedback phase');
assert(app.querySelector('#next-task'), 'next task should exist in feedback phase');
assert(app.querySelector('.score-bars-panel'), 'score bars panel should exist in feedback phase');
assert(app.querySelector('.feedback-screen').classList.contains('is-scrollable'), 'feedback screen should have scrollable class');
assertAllButtonsAreNonSubmit(app);

const scoreText = app.innerHTML;
assert(scoreText.includes('/100'), 'feedback score should include /100');
assert(scoreText.includes('70/100'), 'feedback should explain the diagnostic guide value');
assert(app.querySelector('.critique-block'), 'feedback critique should be separated from operation hints');
assert(app.querySelector('.reflection-block'), 'reflection question should be separated from score result');
assert(app.querySelector('.feedback-list'), 'feedback should render structured feedback lists');assert(app.querySelector('.score-bar-row'), 'score bar rows should exist');
assert(api.state.result.feedbackInput.metrics.highlightClippingRate === null, 'unimplemented physical metrics should remain null');
assert(api.state.history.some((entry) => entry.param === 'decision' && entry.actionSummary), 'decision log should include action summary');
const feedbackHandle = app.querySelector('.feedback-drag-handle');
feedbackHandle.dispatchEvent({ type: 'pointerdown', target: feedbackHandle, clientX: 20, clientY: 20, pointerId: 3 });
feedbackHandle.dispatchEvent({ type: 'pointermove', target: feedbackHandle, clientX: 70, clientY: 45, pointerId: 3 });
feedbackHandle.dispatchEvent({ type: 'pointerup', target: feedbackHandle, clientX: 70, clientY: 45, pointerId: 3 });
assert(api.state.feedbackPosition.x === 50 && api.state.feedbackPosition.y === 25, 'feedback card should be draggable');

app.querySelector('#retry').click();
assert(api.state.phase === 'operation', 'retry should return to operation phase');

app.querySelector('#submit').click();
const previousTask = api.state.taskId;
app.querySelector('#next-task').click();
assert(api.state.phase === 'operation', 'next task should start operation phase');
assert(api.state.taskId !== previousTask, 'next task should change selected task');

app.querySelector('#back').click();
assert(api.state.phase === 'setup', 'back button should return to setup phase');

app.querySelector('#start').click();
app.querySelector('#submit').click();
app.querySelector('#new-task').click();
assert(api.state.phase === 'setup', 'new task button should return to setup phase');

console.log('phase-flow-test: all phase operations passed');
