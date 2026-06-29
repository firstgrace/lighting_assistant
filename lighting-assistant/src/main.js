let THREE = null;
let RectAreaLightUniformsLib = null;
let scene = createFallbackScene();
const PASS_SCORE = 70;

const tasks = [
  {
    id: 'flat',
    title: '\u5e73\u51e1',
    detail: '\u5149\u306e\u504f\u308a\u304c\u5c11\u306a\u304f\u3001\u65e5\u5e38\u7684\u3067\u4e2d\u5eb8\u306a\u5370\u8c61\u3092\u76ee\u6307\u3057\u307e\u3059\u3002',
    rules: [
      (s) => balanceScore(s, 'intensity', 420, 180),
      (s) => Math.max(0, 100 - Math.abs(s.lights[0].x - 3) * 12 - Math.abs(s.lights[0].y - 3) * 12),
      (s) => Math.max(0, 100 - Math.abs(s.lights[0].elevation + 35) * 1.2),
    ],
    hint: (s) => [
      Math.abs(s.lights[0].intensity - s.lights[1].intensity) > 140 ? '\u5149\u91cf\u306e\u5dee\u3092\u5c0f\u3055\u304f\u3057\u3066\u3001\u76ee\u7acb\u3064\u9670\u5f71\u3092\u6291\u3048\u308b\u3002' : '',
      s.lights[0].z < 2.5 ? '\u4e3b\u5149\u3092\u5c11\u3057\u9ad8\u3044\u4f4d\u7f6e\u306b\u623b\u3059\u3002' : '',
    ],
  },
  {
    id: 'dread',
    title: '\u5a01\u5727\u611f',
    detail: '\u786c\u3044\u30b9\u30dd\u30c3\u30c8\u3068\u5f37\u3044\u660e\u6697\u5dee\u3067\u3001\u88ab\u5199\u4f53\u3092\u5727\u5012\u3059\u308b\u5370\u8c61\u3092\u4f5c\u308a\u307e\u3059\u3002',
    rules: [
      (s) => maxKindScore(s, 'spot', 'intensity', 820, 260),
      (s) => 100 - Math.min(100, minKindValue(s, 'spot', 'spread') * 130),
      (s) => Math.max(0, 100 - averageKindValue(s, 'area', 'intensity') * 0.12),
    ],
    hint: () => [
      '\u30b9\u30dd\u30c3\u30c8\u306e\u62e1\u6563\u7387\u3092\u7d5e\u308a\u3001\u5149\u91cf\u3092\u4e0a\u3052\u308b\u3002',
      '\u30a8\u30ea\u30a2\u30e9\u30a4\u30c8\u306f\u5f31\u3081\u3001\u9670\u306e\u6fc3\u3055\u3092\u6b8b\u3059\u3002',
    ],
  },
  {
    id: 'eeriness',
    title: '\u4e0d\u6c17\u5473',
    detail: '\u4e0b\u65b9\u304b\u3089\u306e\u5149\u3084\u5f37\u3044\u8272\u3067\u3001\u901a\u5e38\u306e\u8996\u899a\u611f\u899a\u3092\u305a\u3089\u3057\u307e\u3059\u3002',
    rules: [
      (s) => Math.max(...s.lights.map((l) => l.z < 0 ? 100 : Math.max(0, 100 - l.z * 42))),
      (s) => Math.max(...s.lights.map((l) => saturation(l.color) * 100)),
      (s) => Math.max(...s.lights.map((l) => Math.max(0, 100 - Math.abs(l.elevation - 35) * 2))),
    ],
    hint: () => [
      '\u3069\u308c\u304b\u4e00\u706f\u3092\u88ab\u5199\u4f53\u3088\u308a\u4f4e\u304f\u7f6e\u304f\u3002',
      '\u8272\u306e\u5f69\u5ea6\u3092\u4e0a\u3052\u3066\u3001\u81ea\u7136\u3067\u306f\u306a\u3044\u5149\u306b\u3059\u308b\u3002',
    ],
  },
  {
    id: 'calm',
    title: '\u7a4f\u3084\u304b',
    detail: '\u9762\u5149\u6e90\u3092\u4e3b\u5f79\u306b\u3057\u3001\u5f71\u3092\u8584\u304f\u67d4\u3089\u304b\u304f\u3057\u307e\u3059\u3002',
    rules: [
      (s) => maxKindScore(s, 'area', 'intensity', 720, 260),
      (s) => Math.max(...s.lights.filter((l) => l.kind === 'area').map((l) => clamp((l.width * l.height) / 32 * 100, 0, 100)), 0),
      (s) => Math.max(0, 100 - averageKindValue(s, 'spot', 'intensity') * 0.1),
    ],
    hint: () => [
      '\u30a8\u30ea\u30a2\u30e9\u30a4\u30c8\u306e\u5e45\u3068\u9ad8\u3055\u3092\u5927\u304d\u304f\u3059\u308b\u3002',
      '\u30b9\u30dd\u30c3\u30c8\u3092\u5f31\u3081\u3001\u786c\u3044\u5f71\u3092\u6e1b\u3089\u3059\u3002',
    ],
  },
  {
    id: 'mystery',
    title: '\u795e\u79d8\u7684',
    detail: '\u80cc\u9762\u3084\u5074\u9762\u304b\u3089\u8f2a\u90ed\u3092\u6d6e\u304b\u305b\u3001\u6b63\u9762\u60c5\u5831\u3092\u6291\u3048\u307e\u3059\u3002',
    rules: [
      (s) => Math.max(...s.lights.map((l) => l.y < -5 ? 100 : Math.max(0, 100 - (l.y + 5) * 15))),
      (s) => Math.max(0, 100 - averageIntensity(s) * 0.08),
      (s) => Math.max(...s.lights.map((l) => Math.max(0, 100 - Math.abs(Math.abs(l.azimuth) - 180) * 0.5))),
    ],
    hint: () => [
      '\u5149\u3092\u88ab\u5199\u4f53\u306e\u80cc\u9762\u3078\u56de\u3057\u3001\u6b63\u9762\u306e\u5149\u3092\u6291\u3048\u308b\u3002',
      '\u8f2a\u90ed\u3060\u3051\u304c\u8aad\u3081\u308b\u660e\u308b\u3055\u306b\u8abf\u6574\u3059\u308b\u3002',
    ],
  },
];

const models = [
  { id: 'abstract', label: '\u5e7e\u4f55' },
  { id: 'bust', label: '\u80f8\u50cf' },
  { id: 'figure', label: '\u4eba\u578b' },
];

const defaultLights = [
  { kind: 'spot', x: 3, y: 4, z: 4, intensity: 430, spread: 0.34, width: 3, height: 3, elevation: -35, azimuth: -135, color: '#ffffff' },
  { kind: 'area', x: -3, y: 2, z: 3.2, intensity: 360, spread: 0.55, width: 3.4, height: 2.8, elevation: -28, azimuth: 135, color: '#eef4ff' },
  { kind: 'spot', x: 0, y: -5, z: 3, intensity: 180, spread: 0.42, width: 2.4, height: 2.4, elevation: -18, azimuth: 0, color: '#ffffff' },
];

const state = {
  phase: 'setup',
  taskId: 'flat',
  modelId: 'abstract',
  assist: { hint: true, feedback: true },
  activeLight: 0,
  lights: clone(defaultLights),
  history: [],
  startedAt: 0,
  camera: { theta: -38, phi: 54, radius: 9.2, view: 'free' },
  feedbackPosition: { x: 0, y: 0 },
  result: null,
};

const app = document.querySelector('#app');

class LightingScene {
  constructor() {
    RectAreaLightUniformsLib.init();
    this.canvas = document.querySelector('#scene');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x15161a);
    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.lightObjects = [];
    this.markers = [];
    this.modelGroup = new THREE.Group();

    this.buildStage();
    this.setModel(state.modelId);
    this.buildLights();
    this.updateCamera(state.camera);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  buildStage() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x47494f, roughness: 0.78 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 12),
      new THREE.MeshStandardMaterial({ color: 0x282a30, roughness: 0.82 }),
    );
    wall.position.set(0, 6, -5.6);
    this.scene.add(wall);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.38, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x6b6e75, roughness: 0.64 }),
    );
    plinth.position.set(0, 0.19, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    this.scene.add(plinth);

    const grid = new THREE.GridHelper(20, 20, 0x8a8f9c, 0x3b3d43);
    grid.material.opacity = 0.18;
    grid.material.transparent = true;
    this.scene.add(grid);
    this.scene.add(new THREE.HemisphereLight(0x9aa3b5, 0x111317, 0.28));
    this.scene.add(this.modelGroup);
  }

  setModel(modelId) {
    this.modelGroup.clear();
    const mat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.47 });

    if (modelId === 'bust') {
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.82, 1.45, 12, 32), mat);
      torso.position.set(0, 1.38, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.56, 32, 32), mat);
      head.position.set(0, 2.55, 0);
      this.modelGroup.add(torso, head);
    } else if (modelId === 'figure') {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.75, 10, 24), mat);
      body.position.set(0, 1.75, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), mat);
      head.position.set(0, 2.92, 0);
      const armGeo = new THREE.BoxGeometry(0.28, 1.3, 0.28);
      const leftArm = new THREE.Mesh(armGeo, mat);
      leftArm.position.set(-0.64, 1.78, 0);
      leftArm.rotation.z = -0.2;
      const rightArm = new THREE.Mesh(armGeo, mat);
      rightArm.position.set(0.64, 1.78, 0);
      rightArm.rotation.z = 0.2;
      this.modelGroup.add(body, head, leftArm, rightArm);
    } else {
      const geo = new THREE.IcosahedronGeometry(0.98, 1);
      const form = new THREE.Mesh(geo, mat);
      form.position.set(0, 1.7, 0);
      form.rotation.set(0.3, 0.7, 0.1);
      this.modelGroup.add(form);
    }

    this.modelGroup.traverse((item) => {
      if (item.isMesh) {
        item.castShadow = true;
        item.receiveShadow = true;
      }
    });
  }

  buildLights() {
    this.lightObjects.forEach((entry) => {
      this.scene.remove(entry.light);
      if (entry.target) this.scene.remove(entry.target);
    });
    this.markers.forEach((marker) => this.scene.remove(marker));
    this.lightObjects = [];
    this.markers = [];

    state.lights.forEach((light, index) => {
      const target = new THREE.Object3D();
      const source = light.kind === 'spot'
        ? new THREE.SpotLight(light.color, light.intensity, 36, light.spread, 0.25, 1)
        : new THREE.RectAreaLight(light.color, light.intensity, light.width, light.height);
      if (source.isSpotLight) {
        source.target = target;
        source.castShadow = true;
        source.shadow.mapSize.set(1024, 1024);
      }
      const marker = createLightMarker(light, index === state.activeLight);
      this.scene.add(target, source, marker);
      this.lightObjects.push({ light: source, target });
      this.markers.push(marker);
    });
    this.updateLights(state.lights);
  }

  updateLights(lights) {
    const needsRebuild = lights.some((data, index) => isLightKindMismatch(this.lightObjects[index], data));

    if (needsRebuild) {
      this.buildLights();
      return;
    }

    lights.forEach((data, index) => {
      const entry = this.lightObjects[index];
      const pos = toThree(data);
      const target = toThree(targetFromAngles(data));
      entry.light.position.copy(pos);
      entry.light.intensity = data.intensity;
      entry.light.color.set(data.color);
      entry.target.position.copy(target);
      if (entry.light.isSpotLight) {
        entry.light.angle = clamp(data.spread, 0.08, 0.9);
      } else {
        entry.light.width = data.width;
        entry.light.height = data.height;
        entry.light.lookAt(target);
      }
      orientLightMarker(this.markers[index], pos, target, data, index === state.activeLight);
      this.markers[index].material.color.set(index === state.activeLight ? 0xecff72 : 0x5265ff);
    });
  }

  updateCamera(cameraState) {
    const r = cameraState.radius;
    if (cameraState.view === 'top') {
      this.camera.up.set(0, 0, -1);
      this.camera.position.set(0, r + 1.55, 0);
      this.camera.lookAt(0, 1.55, 0);
      return;
    }

    this.camera.up.set(0, 1, 0);
    const theta = degToRad(cameraState.theta);
    const phi = degToRad(clamp(cameraState.phi, 6, 84));
    this.camera.position.set(
      Math.sin(theta) * Math.sin(phi) * r,
      Math.cos(phi) * r + 1.4,
      Math.cos(theta) * Math.sin(phi) * r,
    );
    this.camera.lookAt(0, 1.55, 0);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}

render();
if (typeof window !== 'undefined' && window.__LIGHTING_ASSISTANT_SKIP_3D__) {
  drawFallbackCanvas();
} else {
  initScene();
}

async function initScene() {
  try {
    const [threeModule, rectModule] = await Promise.all([
      import('https://esm.sh/three@0.165.0'),
      import('https://esm.sh/three@0.165.0/examples/jsm/lights/RectAreaLightUniformsLib.js'),
    ]);
    THREE = threeModule;
    RectAreaLightUniformsLib = rectModule.RectAreaLightUniformsLib;
    scene = new LightingScene();
    scene.setModel(state.modelId);
    scene.updateLights(state.lights);
    scene.updateCamera(state.camera);
  } catch (error) {
    console.error('Failed to initialize 3D scene. UI will continue with the 2D controls.', error);
    drawFallbackCanvas();
  }
}

function createFallbackScene() {
  return {
    buildLights: drawFallbackCanvas,
    setModel: drawFallbackCanvas,
    updateCamera: drawFallbackCanvas,
    updateLights: drawFallbackCanvas,
  };
}

function drawFallbackCanvas() {
  const canvas = document.querySelector('#scene');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) {
    canvas.style.background = '#15161a';
    return;
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * Math.min(window.devicePixelRatio || 1, 2);
  canvas.height = height * Math.min(window.devicePixelRatio || 1, 2);
  context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  context.fillStyle = '#15161a';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#24262b';
  context.fillRect(width * 0.08, height * 0.18, width * 0.56, height * 0.58);
  context.fillStyle = '#5f626b';
  context.fillRect(width * 0.24, height * 0.48, width * 0.18, height * 0.15);
  context.fillStyle = '#d7dce6';
  context.beginPath();
  context.arc(width * 0.33, height * 0.39, 46, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#aeb4c0';
  context.fillRect(width * 0.3, height * 0.43, width * 0.06, height * 0.14);
  state.lights.forEach((light, index) => {
    const x = width * 0.34 + light.x * 18;
    const y = height * 0.42 - light.y * 10 - light.z * 8;
    context.fillStyle = index === state.activeLight ? '#ecff72' : '#5265ff';
    context.beginPath();
    context.arc(x, y, index === state.activeLight ? 9 : 6, 0, Math.PI * 2);
    context.fill();
  });
}

function render() {
  if (state.phase === 'setup') renderSetup();
  if (state.phase === 'operation') renderOperation();
  if (state.phase === 'feedback') renderFeedback();
}

function renderSetup() {
  app.innerHTML = `
    <main class="screen setup-screen">
      <section class="setup-card">
        <div class="setup-main">
          <h1 class="app-title">\u304a\u984c</h1>
          <p class="app-subtitle">\u307e\u305a\u306f\u76ee\u6307\u3059\u5370\u8c61\u3092\u9078\u3073\u307e\u3059\u3002\u8a73\u7d30\u306f\u30ab\u30fc\u30c9\u306b\u30ab\u30fc\u30bd\u30eb\u3092\u91cd\u306d\u308b\u3068\u8868\u793a\u3055\u308c\u307e\u3059\u3002</p>
          <div class="task-list">
            ${tasks.map((task) => `
              <button type="button" class="task-choice ${task.id === state.taskId ? 'is-selected' : ''}" data-task="${task.id}">
                <span class="task-dot"></span>
                <span class="task-name">${task.title}</span>
                <span class="task-detail">${task.detail}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <aside class="setup-side">
          <div class="setting-panel">
            <h2 class="panel-title">\u652f\u63f4\u8a2d\u5b9a</h2>
            ${switchRow('hint-toggle', '\u30d2\u30f3\u30c8', state.assist.hint)}
            ${switchRow('feedback-toggle', '\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af', state.assist.feedback)}
          </div>
          <div class="upload-panel">
            <h2 class="panel-title">\u88ab\u5199\u4f53\u306e3D\u30e2\u30c7\u30eb</h2>
            <p class="muted">\u5b9f\u9a13\u7528\u306e\u7c21\u6613\u30e2\u30c7\u30eb\u3092\u5207\u308a\u66ff\u3048\u307e\u3059\u3002GLB\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u306f\u6b21\u306e\u5b9f\u88c5\u30b9\u30c6\u30c3\u30d7\u3067\u63a5\u7d9a\u3067\u304d\u308b\u69cb\u6210\u3067\u3059\u3002</p>
            <div class="model-grid">
              ${models.map((model) => `<button type="button" class="model-btn ${state.modelId === model.id ? 'is-selected' : ''}" data-model="${model.id}">${model.label}</button>`).join('')}
            </div>
          </div>
          <div class="setup-actions">
            <button type="button" class="primary-btn" id="start">\u30b9\u30bf\u30fc\u30c8</button>
          </div>
        </aside>
      </section>
    </main>
  `;

  app.querySelectorAll('.task-choice').forEach((button) => {
    button.addEventListener('click', () => {
      state.taskId = button.dataset.task;
      renderSetup();
    });
  });
  app.querySelectorAll('.model-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.modelId = button.dataset.model;
      scene.setModel(state.modelId);
      renderSetup();
    });
  });
  app.querySelector('#hint-toggle').addEventListener('change', (event) => {
    state.assist.hint = event.target.checked;
  });
  app.querySelector('#feedback-toggle').addEventListener('change', (event) => {
    state.assist.feedback = event.target.checked;
  });
  app.querySelector('#start').addEventListener('click', startTask);
}

function renderOperation() {
  const task = currentTask();
  const light = state.lights[state.activeLight];
  const hints = state.assist.hint ? task.hint(state).filter(Boolean).slice(0, 3) : ['\u73fe\u5728\u306e\u8a2d\u5b9a\u3067\u306f\u30d2\u30f3\u30c8\u3092\u8868\u793a\u3057\u307e\u305b\u3093\u3002'];
  app.innerHTML = `
    <main class="screen operation-screen">
      <header class="toolbar">
        <div class="topic">[\u984c\uff1a${task.title}]</div>
        <div class="toolbar-actions">
          <button type="button" class="secondary-btn" id="save">\u4fdd\u5b58</button>
          <button type="button" class="secondary-btn" id="render">\u30ec\u30f3\u30c0\u30ea\u30f3\u30b0</button>
        </div>
        <button type="button" class="ghost-btn" id="back">\u304a\u984c\u306b\u623b\u308b</button>
      </header>
      <section class="hint-strip">
        <div class="hint-label">\u30d2\u30f3\u30c8</div>
        <ul>${hints.map((hint) => `<li>${hint}</li>`).join('')}</ul>
      </section>
      <section class="operation-grid">
        <div class="preview-shell">
          <div class="preview-head">
            <h2>\u30d7\u30ec\u30d3\u30e5\u30fc</h2>
            <span class="muted">\u30c9\u30e9\u30c3\u30b0\u3067\u8996\u70b9\u56de\u8ee2</span>
          </div>
          <div class="preview-stage" id="preview-stage">
            <div class="view-controls">
              ${viewButton('front', '\u6b63\u9762')}
              ${viewButton('side', '\u5074\u9762')}
              ${viewButton('top', '\u4e0a')}
            </div>
            <label class="zoom-control">
              <span>\u9060\u8fd1</span>
              <input id="zoom" type="range" min="5" max="15" step="0.1" value="${state.camera.radius}" />
            </label>
          </div>
        </div>
        <aside class="work-card">
          <div class="editor-head">
            <h2>\u64cd\u4f5c\u30a6\u30a3\u30f3\u30c9\u30a6</h2>
            <div class="light-tabs">
              ${state.lights.map((_, index) => `<button type="button" class="tab-btn ${index === state.activeLight ? 'is-selected' : ''}" data-light-index="${index}">${index + 1}</button>`).join('')}
            </div>
          </div>
          <div class="type-tabs">
            <button type="button" class="type-btn ${light.kind === 'spot' ? 'is-selected' : ''}" data-kind="spot">\u30b9\u30dd\u30c3\u30c8</button>
            <button type="button" class="type-btn ${light.kind === 'area' ? 'is-selected' : ''}" data-kind="area">\u30a8\u30ea\u30a2</button>
          </div>
          <div class="map-and-values">
            ${topMap()}
            <div class="slider-list">
              ${slider('x', 'x', -10, 10, 0.1)}
              ${slider('y', 'y', -10, 10, 0.1)}
              ${slider('z', 'z', -2, 10, 0.1)}
              ${slider('intensity', '\u7167\u5ea6', 0, 1000, 10)}
              ${light.kind === 'spot' ? slider('spread', '\u62e1\u6563\u7387', 0.08, 0.9, 0.01) : ''}
              ${light.kind === 'area' ? slider('width', '\u6a2a\u5e45', 0.5, 8, 0.1) + slider('height', '\u7e26\u5e45', 0.5, 8, 0.1) : ''}
              ${slider('elevation', '\u4ef0\u4fef\u89d2', -80, 80, 1)}
              ${slider('azimuth', '\u65b9\u4f4d\u89d2', -180, 180, 1)}
            </div>
          </div>
          <label class="color-row">
            <span>\u30e9\u30a4\u30c8\u8272</span>
            <input type="color" id="color" value="${light.color}" />
          </label>
          <div class="submit-wrap">
            <button type="button" class="primary-btn" id="submit">\u63d0\u51fa</button>
          </div>
        </aside>
      </section>
    </main>
  `;
  bindOperation();
}

function renderFeedback() {
  const task = currentTask();
  const result = state.result;
  app.innerHTML = `
    <main class="screen feedback-screen">
      <section class="feedback-card">
        <div class="feedback-head feedback-drag-handle">
          <div>
            <h1 class="feedback-title">\u304a\u984c\uff1a${task.title}</h1>
            <p class="muted">\u5168\u304a\u984c\u306e\u8a55\u4fa1\u3092\u78ba\u8a8d\u3057\u3001\u6210\u529f\u3059\u308b\u307e\u3067\u30ea\u30c8\u30e9\u30a4\u3067\u304d\u307e\u3059\u3002</p>
          </div>
          <button type="button" class="ghost-btn" id="new-task">\u304a\u984c\u9078\u629e\u3078</button>
        </div>
        <div class="feedback-body">
          <div class="score-panel">
            <div class="score-line">
              <span class="score-state">${result.pass ? 'PASS' : 'RETRY'}</span>
              <strong>${result.current}<span>/100\u70b9</span></strong>
            </div>
            <p class="pass-line">\u5408\u683c\u30e9\u30a4\u30f3: ${PASS_SCORE}/100\u70b9\u4ee5\u4e0a</p>
            <p class="critique">${result.critique}</p>
          </div>
          <div class="score-bars-panel">
            ${scoreBars(result.allScores, state.taskId)}
          </div>
        </div>
        <div class="feedback-actions">
          <button type="button" class="secondary-btn" id="retry">\u30ea\u30c8\u30e9\u30a4</button>
          <button type="button" class="secondary-btn" id="next-task">\u6b21\u306e\u304a\u984c\u3078</button>
        </div>
      </section>
    </main>
  `;
  app.querySelector('#retry').addEventListener('click', () => {
    state.phase = 'operation';
    renderOperation();
  });
  app.querySelector('#next-task').addEventListener('click', () => {
    const index = tasks.findIndex((item) => item.id === state.taskId);
    state.taskId = tasks[(index + 1) % tasks.length].id;
    startTask();
  });
  app.querySelector('#new-task').addEventListener('click', () => {
    state.phase = 'setup';
    renderSetup();
  });
  bindFeedbackDrag();
  applyFeedbackPosition();
}

function switchRow(id, label, checked) {
  return `
    <label class="switch-row">
      <span>${label}</span>
      <span class="switch">
        <input id="${id}" type="checkbox" ${checked ? 'checked' : ''} />
        <span></span>
      </span>
    </label>
  `;
}

function viewButton(id, label) {
  return `<button type="button" class="view-btn" data-view="${id}">${label}</button>`;
}

function slider(param, label, min, max, step) {
  const light = state.lights[state.activeLight];
  return `
    <label class="slider-row">
      <span>${label}</span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${light[param]}" data-param="${param}" />
      <input class="value-chip" type="number" min="${min}" max="${max}" step="${step}" value="${format(light[param])}" data-param="${param}" />
    </label>
  `;
}

function topMap() {
  const active = state.lights[state.activeLight];
  const shapes = state.lights.map((light, index) => mapShape(light, index === state.activeLight)).join('');
  return `
    <svg class="top-map" id="top-map" viewBox="0 0 160 160" role="img" aria-label="top view">
      <rect x="0" y="0" width="160" height="160" fill="#24262b"></rect>
      <line x1="80" y1="8" x2="80" y2="152" stroke="#3f424b"></line>
      <line x1="8" y1="80" x2="152" y2="80" stroke="#3f424b"></line>
      <polygon points="80,102 72,90 88,90" fill="#f8fafc"></polygon>
      <text x="80" y="86" fill="#f8fafc" text-anchor="middle" font-size="18">*</text>
      ${shapes}
      <circle cx="${mapX(active.x)}" cy="${mapY(active.y)}" r="8" fill="transparent" stroke="#ecff72" stroke-width="2"></circle>
    </svg>
  `;
}

function mapShape(light, active) {
  const x = mapX(light.x);
  const y = mapY(light.y);
  const beamAngle = mapBeamAngle(light.azimuth);
  const color = active ? '#ecff72' : '#5265ff';
  if (light.kind === 'area') {
    const angle = beamAngle + Math.PI / 2;
    const half = light.width * 5;
    const dx = Math.cos(angle) * half;
    const dy = Math.sin(angle) * half;
    return `<line x1="${x - dx}" y1="${y - dy}" x2="${x + dx}" y2="${y + dy}" stroke="${color}" stroke-width="${active ? 4 : 3}" stroke-linecap="round"></line>`;
  }
  const len = 42;
  const spread = light.spread * 0.95;
  const a1 = beamAngle - spread;
  const a2 = beamAngle + spread;
  const p1 = `${x + Math.cos(a1) * len},${y + Math.sin(a1) * len}`;
  const p2 = `${x + Math.cos(a2) * len},${y + Math.sin(a2) * len}`;
  return `<polygon points="${x},${y} ${p1} ${p2}" fill="${active ? 'rgba(236,255,114,.22)' : 'rgba(82,101,255,.18)'}" stroke="${color}" stroke-width="2"></polygon>`;
}

function bindOperation() {
  app.querySelector('#back').addEventListener('click', () => {
    state.phase = 'setup';
    renderSetup();
  });
  app.querySelector('#save').addEventListener('click', () => logChange('save', 'snapshot'));
  app.querySelector('#render').addEventListener('click', () => logChange('render', 'snapshot'));
  app.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeLight = Number(button.dataset.lightIndex);
      scene.updateLights(state.lights);
      renderOperation();
    });
  });
  app.querySelectorAll('.type-btn').forEach((button) => {
    button.addEventListener('click', () => {
      updateLight('kind', button.dataset.kind);
      scene.buildLights();
      renderOperation();
    });
  });
  app.querySelectorAll('input[type="range"][data-param]').forEach((input) => {
    input.addEventListener('input', (event) => {
      updateLight(event.target.dataset.param, Number(event.target.value));
      renderOperation();
    });
  });
  app.querySelectorAll('input[type="number"][data-param]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const param = event.target.dataset.param;
      const value = clamp(Number(event.target.value), Number(event.target.min), Number(event.target.max));
      updateLight(param, value);
      renderOperation();
    });
  });
  app.querySelector('#color').addEventListener('input', (event) => {
    updateLight('color', event.target.value);
    const colorInput = app.querySelector('#color');
    if (colorInput) colorInput.value = event.target.value;
  });
  app.querySelector('#zoom').addEventListener('input', (event) => {
    state.camera.radius = Number(event.target.value);
    scene.updateCamera(state.camera);
  });
  app.querySelectorAll('.view-btn').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  app.querySelector('#submit').addEventListener('click', submit);
  bindPreviewDrag();
  bindMapDrag();
}

function bindPreviewDrag() {
  const pane = app.querySelector('#preview-stage');
  if (!pane) return;
  let dragging = false;
  let last = { x: 0, y: 0 };
  pane.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button,input,label')) return;
    dragging = true;
    last = { x: event.clientX, y: event.clientY };
    try {
      if (event.pointerId !== undefined && pane.setPointerCapture) {
        pane.setPointerCapture(event.pointerId);
      }
    } catch {
      // Synthetic pointer events in tests may not have a capturable pointer.
    }
  });
  pane.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    state.camera.view = 'free';
    state.camera.theta += (event.clientX - last.x) * 0.35;
    state.camera.phi = clamp(state.camera.phi + (event.clientY - last.y) * 0.28, 6, 84);
    last = { x: event.clientX, y: event.clientY };
    scene.updateCamera(state.camera);
  });
  pane.addEventListener('pointerup', () => {
    dragging = false;
  });
}

function bindMapDrag() {
  const map = app.querySelector('#top-map');
  const setPosition = (event) => {
    const rect = map.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 160;
    const y = ((event.clientY - rect.top) / rect.height) * 160;
    updateLight('x', clamp((x - 80) / 7, -10, 10));
    updateLight('y', clamp((y - 80) / 7, -10, 10));
    renderOperation();
  };
  map.addEventListener('pointerdown', (event) => {
    try {
      if (event.pointerId !== undefined && map.setPointerCapture) {
        map.setPointerCapture(event.pointerId);
      }
    } catch {
      // Synthetic pointer events in tests may not have a capturable pointer.
    }
    setPosition(event);
    map.onpointermove = setPosition;
  });
  map.addEventListener('pointerup', () => {
    map.onpointermove = null;
  });
}

function startTask() {
  state.phase = 'operation';
  state.activeLight = 0;
  state.lights = clone(defaultLights);
  state.history = [];
  state.startedAt = performance.now();
  scene.buildLights();
  scene.updateLights(state.lights);
  renderOperation();
}

function submit() {
  const allScores = scoreAllTasks(state);
  const current = allScores.find((score) => score.id === state.taskId).score;
  state.result = {
    current,
    pass: current >= PASS_SCORE,
    allScores,
    critique: state.assist.feedback
      ? buildCritique(current)
      : '\u8a55\u4fa1\u30b9\u30b3\u30a2\u3068\u5168\u304a\u984c\u306e\u30d0\u30e9\u30f3\u30b9\u306e\u307f\u3092\u8868\u793a\u3057\u3066\u3044\u307e\u3059\u3002\u6279\u8a55\u306f\u652f\u63f4\u8a2d\u5b9a\u3067\u30aa\u30d5\u3067\u3059\u3002',
  };
  state.phase = 'feedback';
  render();
}

function bindFeedbackDrag() {
  const card = app.querySelector('.feedback-card');
  const handle = app.querySelector('.feedback-drag-handle');
  if (!card || !handle) return;

  let dragging = false;
  let start = { x: 0, y: 0 };
  let origin = { ...state.feedbackPosition };

  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    dragging = true;
    start = { x: event.clientX, y: event.clientY };
    origin = { ...state.feedbackPosition };
    handle.classList.add('is-dragging');
    try {
      if (event.pointerId !== undefined && handle.setPointerCapture) {
        handle.setPointerCapture(event.pointerId);
      }
    } catch {
      // Some synthetic events do not expose capturable pointers.
    }
  });

  handle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    state.feedbackPosition.x = origin.x + event.clientX - start.x;
    state.feedbackPosition.y = origin.y + event.clientY - start.y;
    applyFeedbackPosition();
  });

  const stop = () => {
    dragging = false;
    handle.classList.remove('is-dragging');
  };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}

function applyFeedbackPosition() {
  const card = app.querySelector('.feedback-card');
  if (!card) return;
  card.style.transform = `translate(${state.feedbackPosition.x}px, ${state.feedbackPosition.y}px)`;
}

function updateLight(param, value) {
  state.lights[state.activeLight][param] = value;
  logChange(param, value);
  scene.updateLights(state.lights);
}

function logChange(param, value) {
  state.history.push({
    at: new Date().toISOString(),
    elapsed: (performance.now() - state.startedAt) / 1000,
    light: state.activeLight + 1,
    param,
    value,
    lights: clone(state.lights),
  });
}

function setView(view) {
  if (view === 'front') state.camera = { ...state.camera, view: 'free', theta: 0, phi: 58 };
  if (view === 'side') state.camera = { ...state.camera, view: 'free', theta: 90, phi: 58 };
  if (view === 'top') state.camera = { ...state.camera, view: 'top', theta: 0, phi: 0 };
  scene.updateCamera(state.camera);
}

function scoreAllTasks(snapshot) {
  return tasks.map((task) => {
    const score = Math.round(task.rules.reduce((sum, rule) => sum + rule(snapshot), 0) / task.rules.length);
    return { id: task.id, title: task.title, score: clamp(score, 0, 100) };
  });
}

function buildCritique(score) {
  if (score >= PASS_SCORE) {
    return '\u4e3b\u8981\u306a\u7269\u7406\u6761\u4ef6\u306f\u76ee\u6a19\u306b\u8fd1\u304f\u3001\u304a\u984c\u306e\u5370\u8c61\u306f\u6210\u7acb\u3057\u3066\u3044\u307e\u3059\u3002\u6b21\u306f\u8996\u7dda\u304c\u96c6\u307e\u308b\u5834\u6240\u3092\u3088\u308a\u660e\u78ba\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
  }
  return '\u73fe\u5728\u306e\u5149\u306f\u304a\u984c\u306e\u6838\u3068\u306a\u308b\u7279\u5fb4\u304c\u307e\u3060\u5f31\u3044\u72b6\u614b\u3067\u3059\u3002\u5149\u306e\u5411\u304d\u3001\u786c\u3055\u3001\u9762\u7a4d\u3001\u7167\u5ea6\u306e\u3069\u308c\u3092\u512a\u5148\u3057\u3066\u5909\u3048\u308b\u304b\u3092\u4e00\u3064\u306b\u7d5e\u308b\u3068\u3001\u8ff7\u3044\u304c\u6e1b\u308a\u307e\u3059\u3002';
}

function scoreBars(scores, currentId) {
  return `
    <div class="bars-head">
      <h2>\u5168\u304a\u984c\u306e\u8a55\u4fa1</h2>
      <span>\u5408\u683c\u30e9\u30a4\u30f3 ${PASS_SCORE}\u70b9</span>
    </div>
    <div class="score-bars" role="img" aria-label="\u5168\u304a\u984c\u306e\u6a2a\u68d2\u30b0\u30e9\u30d5">
      ${scores.map((score) => `
        <div class="score-bar-row ${score.id === currentId ? 'is-current' : ''}">
          <span class="bar-label">${score.title}</span>
          <div class="bar-track">
            <span class="bar-pass" style="left:${PASS_SCORE}%"></span>
            <span class="bar-fill" style="width:${score.score}%"></span>
          </div>
          <strong>${score.score}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function currentTask() {
  return tasks.find((task) => task.id === state.taskId) || tasks[0];
}

function isLightKindMismatch(entry, data) {
  if (!entry) return true;
  const entryIsSpot = entry.light?.isSpotLight === true;
  return entryIsSpot !== (data.kind === 'spot');
}

function createLightMarker(light, active) {
  const color = active ? 0xecff72 : 0x5265ff;
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: light.kind === 'area' ? 0.78 : 0.92,
    side: THREE.DoubleSide,
    wireframe: light.kind === 'spot',
  });
  const geometry = light.kind === 'area'
    ? new THREE.PlaneGeometry(1, 1)
    : new THREE.ConeGeometry(1, 1, 24, 1, true);
  if (light.kind === 'spot') {
    geometry.translate(0, -0.5, 0);
  }
  const marker = new THREE.Mesh(geometry, material);
  marker.userData.kind = light.kind;
  return marker;
}

function orientLightMarker(marker, pos, target, light, active) {
  const focus = active ? 1.18 : 1;
  marker.position.copy(pos);
  if (light.kind === 'spot') {
    const direction = target.clone().sub(pos).normalize();
    marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
    const radius = Math.max(light.spread * 0.75, 0.12) * focus;
    marker.scale.set(radius, 0.9 * focus, radius);
    return;
  }
  marker.lookAt(target);
  marker.scale.set(Math.max(light.width, 0.5) * focus, Math.max(light.height, 0.5) * focus, 1);
}

function toThree(light) {
  return new THREE.Vector3(light.x, light.z, light.y);
}

function targetFromAngles(light) {
  const az = degToRad(light.azimuth);
  const el = degToRad(light.elevation);
  const reach = 7;
  return {
    x: light.x + Math.sin(az) * Math.cos(el) * reach,
    y: light.y + Math.cos(az) * Math.cos(el) * reach,
    z: light.z + Math.sin(el) * reach,
  };
}

function mapX(value) {
  return 80 + value * 7;
}

function mapY(value) {
  return 80 + value * 7;
}

function mapBeamAngle(azimuth) {
  return degToRad(90 - azimuth);
}

function balanceScore(snapshot, key, target, tolerance) {
  const values = snapshot.lights.map((light) => light[key]);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const spread = Math.max(...values) - Math.min(...values);
  return clamp(100 - Math.abs(avg - target) / tolerance * 40 - spread / tolerance * 55, 0, 100);
}

function maxKindScore(snapshot, kind, key, target, tolerance) {
  const values = snapshot.lights.filter((light) => light.kind === kind).map((light) => light[key]);
  if (!values.length) return 0;
  return clamp(100 - Math.abs(Math.max(...values) - target) / tolerance * 100, 0, 100);
}

function averageKindValue(snapshot, kind, key) {
  const values = snapshot.lights.filter((light) => light.kind === kind).map((light) => light[key]);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function minKindValue(snapshot, kind, key) {
  const values = snapshot.lights.filter((light) => light.kind === kind).map((light) => light[key]);
  return values.length ? Math.min(...values) : 1;
}

function averageIntensity(snapshot) {
  return snapshot.lights.reduce((sum, light) => sum + light.intensity, 0) / snapshot.lights.length;
}

function saturation(hex) {
  const rgb = hex.replace('#', '').match(/.{1,2}/g).map((part) => parseInt(part, 16) / 255);
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  return max === 0 ? 0 : (max - min) / max;
}

function degToRad(value) {
  return value * Math.PI / 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function format(value) {
  return Number.isInteger(value) ? `${value}` : Number(value).toFixed(2);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

if (typeof window !== 'undefined') {
  window.__lightingAssistant = {
    get state() {
      return state;
    },
    get tasks() {
      return tasks;
    },
    render,
    renderSetup,
    renderOperation,
    renderFeedback,
    startTask,
    submit,
    scoreAllTasks,
    isLightKindMismatch,
  };
}
