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
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    return this.children.filter((element) => matches(element, selector));
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

class MockDocument {
  constructor() {
    this.app = new MockElement('div', { id: 'app' }, this);
    this.scene = new MockCanvas('canvas', { id: 'scene' }, this);
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
  getContext() {
    return {
      setTransform() {},
      fillRect() {},
      beginPath() {},
      arc() {},
      fill() {},
      fillStyle: '',
    };
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
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  __LIGHTING_ASSISTANT_SKIP_3D__: true,
  addEventListener() {},
};
globalThis.console = console;

await import('../src/main.js');

const app = document.querySelector('#app');
const api = window.__lightingAssistant;

assert(api.isLightKindMismatch(null, { kind: 'area' }) === true, 'missing light entry should rebuild');
assert(api.isLightKindMismatch({ light: {} }, { kind: 'area' }) === false, 'RectAreaLight with undefined isSpotLight should not rebuild');
assert(api.isLightKindMismatch({ light: { isSpotLight: true } }, { kind: 'spot' }) === false, 'SpotLight should match spot data');
assert(api.isLightKindMismatch({ light: {} }, { kind: 'spot' }) === true, 'Area light should rebuild when data switches to spot');

assert(api.state.phase === 'setup', 'initial phase should be setup');
assert(app.querySelector('#start'), 'start button should exist');
assert(app.querySelectorAll('.task-choice').length === 7, 'tutorials plus five task choices should exist');
assert(app.innerHTML.includes('物体を照らしてみよう'), 'setup should show the first tutorial task');
assert(app.innerHTML.includes('物体をできるだけ照らさないようにしてみよう'), 'setup should show the second tutorial task');
assert(app.innerHTML.includes('作品全体を見やすくしよう'), 'setup should show the new uniform visibility title');
assert(app.innerHTML.includes('作品の形や凹凸を印象的に見せよう'), 'setup should show the new shape emphasis title');
assert(app.innerHTML.includes('作品をやわらかい印象に見せよう'), 'setup should show the new soft lighting title');
assert(app.innerHTML.includes('作品の輪郭を背景から際立たせよう'), 'setup should show the new background separation title');
assert(app.innerHTML.includes('中央上部に注目を集めよう'), 'setup should show the visual focus title');
assert(app.innerHTML.includes('明るすぎる部分や暗すぎる部分'), 'setup should show revised task descriptions');
assertAllButtonsAreNonSubmit(app);

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
assert(app.innerHTML.includes('ライト強度'), 'operation should use light-side intensity wording');
assert(!app.innerHTML.includes('照度</span>'), 'operation should not label light controls as illuminance');

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
assertAllButtonsAreNonSubmit(app);

const scoreText = app.innerHTML;
assert(scoreText.includes('/100'), 'feedback score should include /100');
assert(scoreText.includes('70/100'), 'feedback should explain the provisional target score');
assert(scoreText.includes('暫定スコア') || scoreText.includes('暫定目標'), 'feedback should avoid pass/fail wording and show provisional wording');
assert(!scoreText.includes('PASS') && !scoreText.includes('RETRY') && !scoreText.includes('合格'), 'feedback should not show pass/fail wording');
assert(scoreText.includes('フィードバック'), 'feedback critique should be separated from operation hints');
assert(scoreText.includes('良かった点'), 'feedback should have positive-feature section');
assert(scoreText.includes('主な問題'), 'feedback should have detected-issue section');
assert(scoreText.includes('次に見るべき点'), 'feedback should have next-observation section');
assert(scoreText.includes('内省の問い'), 'reflection question should be separated from score result');
assert(app.querySelector('.score-bar-row'), 'score bar rows should exist');
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
