let THREE = null;
let RectAreaLightUniformsLib = null;
let scene = createFallbackScene();
const PASS_SCORE = 70;
const BASIC_TRAINING_LIGHT_COLOR = '#fffaf0';
const BASIC_TRAINING_LIGHT_COLOR_LABEL = '\u663c\u767d\u8272\uff085000K\u76f8\u5f53\uff09';
const SUBJECT_MATERIAL = { color: 0x7f93a8, roughness: 0.68, metalness: 0 };
const STAGE_MATERIALS = {
  floor: 0x575b62,
  wall: 0x383b42,
  plinth: 0x4b4f58,
};
const PROVISIONAL_VISIBILITY_THRESHOLDS = {
  averagePreferredMin: 55,
  averagePreferredMax: 180,
  minimumPreferred: 28,
  maximumAllowed: 360,
  uniformityPreferred: 0.42,
};
const EMPTY_ILLUMINANCE_SUMMARY = Object.freeze({
  averageIlluminance: null,
  minIlluminance: null,
  maxIlluminance: null,
  percentile10Illuminance: null,
  uniformity: null,
  validSampleCount: 0,
  totalSampleCount: 0,
});
const SURFACE_SAMPLE_OFFSET = 0.035;
const trainingMode = 'basic';
const allowLightColorEditing = trainingMode !== 'basic';

const supportCondition = {
  showHintsDuringOperation: true,
  showScoreAfterDecision: true,
  showPassFailAfterDecision: true,
  showCritiqueAfterDecision: true,
  showReflectionQuestionAfterDecision: true,
};

const legacyTaskIdMap = {
  flat: 'uniform_visibility',
  dread: 'shape_emphasis',
  calm: 'soft_lighting',
  mystery: 'background_separation',
  eeriness: 'visual_focus',
};

const tutorialTasks = [
  {
    id: 'tutorial_light_object',
    label: '\u7269\u4f53\u3092\u7167\u3089\u3057\u3066\u307f\u3088\u3046',
    shortLabel: '\u7167\u3089\u3059\u7df4\u7fd2',
    description: '\u30e9\u30a4\u30c8\u306e\u4f4d\u7f6e\u3084\u5411\u304d\u3092\u5909\u3048\u3001\u7269\u4f53\u5168\u4f53\u306b\u5149\u304c\u5c4a\u304f\u3088\u3046\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    learningPoints: ['\u30e9\u30a4\u30c8\u4f4d\u7f6e', '\u30e9\u30a4\u30c8\u306e\u5411\u304d', '\u30e9\u30a4\u30c8\u5f37\u5ea6'],
    internalEvaluationName: '\u57fa\u790e\u64cd\u4f5c',
    candidateMetrics: [],
    scoreEnabled: false,
    hint: hintTutorialLightObject,
    provisionalEvaluation: '\u3053\u306e\u7df4\u7fd2\u306f\u63a1\u70b9\u5bfe\u8c61\u5916\u3067\u3059\u3002',
    reflectionQuestion: '\u5149\u304c\u5c4a\u304d\u306b\u304f\u304b\u3063\u305f\u9762\u306f\u3069\u3053\u3067\u3057\u305f\u304b\uff1f',
  },
  {
    id: 'tutorial_reduce_light',
    label: '\u7269\u4f53\u3092\u3067\u304d\u308b\u3060\u3051\u7167\u3089\u3055\u306a\u3044\u3088\u3046\u306b\u3057\u3066\u307f\u3088\u3046',
    shortLabel: '\u6e1b\u5149\u7df4\u7fd2',
    description: '\u30e9\u30a4\u30c8\u306e\u5411\u304d\u3084\u70b9\u706f\u72b6\u614b\u3092\u5909\u3048\u3001\u7269\u4f53\u306b\u5c4a\u304f\u5149\u3092\u6e1b\u3089\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    learningPoints: ['\u70b9\u706f\u72b6\u614b', '\u7167\u5c04\u65b9\u5411', '\u5149\u306e\u5c4a\u304d\u65b9'],
    internalEvaluationName: '\u57fa\u790e\u64cd\u4f5c',
    candidateMetrics: [],
    scoreEnabled: false,
    hint: hintTutorialReduceLight,
    provisionalEvaluation: '\u3053\u306e\u7df4\u7fd2\u306f\u63a1\u70b9\u5bfe\u8c61\u5916\u3067\u3059\u3002',
    reflectionQuestion: '\u30e9\u30a4\u30c8\u3092\u6d88\u3059\u306e\u3068\u5411\u304d\u3092\u5916\u3059\u306e\u3067\u3001\u898b\u3048\u65b9\u306f\u3069\u3046\u5909\u308f\u308a\u307e\u3057\u305f\u304b\uff1f',
  },
];

const mainTasks = [
  {
    id: 'uniform_visibility',
    legacyIds: ['flat'],
    label: '\u4f5c\u54c1\u5168\u4f53\u3092\u898b\u3084\u3059\u304f\u3057\u3088\u3046',
    shortLabel: '\u898b\u3084\u3059\u3044',
    description: '\u660e\u308b\u3059\u304e\u308b\u90e8\u5206\u3084\u6697\u3059\u304e\u308b\u90e8\u5206\u3092\u6291\u3048\u3001\u4f5c\u54c1\u5168\u4f53\u306e\u5f62\u304c\u5206\u304b\u308b\u7167\u660e\u3092\u3064\u304f\u308a\u307e\u3059\u3002',
    learningPoints: ['\u7167\u5ea6\u5206\u5e03', '\u5747\u6589\u5ea6', '\u8907\u6570\u706f\u306e\u30d0\u30e9\u30f3\u30b9'],
    internalEvaluationName: '\u5168\u4f53\u306e\u660e\u77ad\u6027',
    candidateMetrics: ['\u5e73\u5747\u7167\u5ea6', '\u6700\u5c0f\u30fb\u6700\u5927\u7167\u5ea6', '\u5747\u6589\u5ea6'],
    scoreEnabled: true,
    provisionalEvaluation: '\u76f4\u63a5\u7167\u5ea6\u8a55\u4fa1\u304c\u672a\u63a5\u7d9a\u306e\u5834\u5408\u306f\u3001\u65e7\u300c\u5e73\u51e1\u300d\u8a55\u4fa1\u3092\u5747\u6589\u5ea6\u306e\u66ab\u5b9a\u6307\u6a19\u3068\u3057\u3066\u4f7f\u7528\u3057\u307e\u3059\u3002',
    rules: [scoreUniformVisibility],
    hint: hintUniformVisibility,
    critique: critiqueUniformVisibility,
    reflectionQuestion: '\u4f5c\u54c1\u306e\u4e2d\u3067\u3001\u307e\u3060\u6697\u304f\u611f\u3058\u308b\u90e8\u5206\u306f\u3069\u3053\u3067\u3057\u305f\u304b\uff1f',
  },
  {
    id: 'shape_emphasis',
    legacyIds: ['dread'],
    label: '\u4f5c\u54c1\u306e\u5f62\u3084\u51f9\u51f8\u3092\u5370\u8c61\u7684\u306b\u898b\u305b\u3088\u3046',
    shortLabel: '\u7acb\u4f53\u7684',
    description: '\u660e\u308b\u3044\u9762\u3068\u6697\u3044\u9762\u3092\u3064\u304f\u308a\u3001\u4f5c\u54c1\u306e\u7acb\u4f53\u7684\u306a\u5f62\u72b6\u304c\u4f1d\u308f\u308b\u7167\u660e\u3092\u3064\u304f\u308a\u307e\u3059\u3002',
    learningPoints: ['\u5165\u5c04\u65b9\u5411', '\u4e3b\u5149\u3068\u88dc\u52a9\u5149', '\u660e\u6697\u6bd4'],
    internalEvaluationName: '\u5f62\u72b6\u306e\u660e\u77ad\u6027',
    candidateMetrics: ['\u9762\u3054\u3068\u306e\u660e\u6697\u5dee', '\u4e3b\u5149\u65b9\u5411', '\u660e\u6697\u6bd4'],
    scoreEnabled: true,
    provisionalEvaluation: '\u65e7\u300c\u5a01\u5727\u611f\u300d\u8a55\u4fa1\u306e\u660e\u6697\u5dee\u30fb\u30b9\u30dd\u30c3\u30c8\u6027\u3092\u3001\u7acb\u4f53\u611f\u306e\u66ab\u5b9a\u6307\u6a19\u3068\u3057\u3066\u4f7f\u7528\u3057\u307e\u3059\u3002',
    rules: [scoreShapeEmphasis],
    hint: hintShapeEmphasis,
    critique: critiqueShapeEmphasis,
    reflectionQuestion: '\u660e\u308b\u3044\u9762\u3068\u6697\u3044\u9762\u306e\u9055\u3044\u306f\u3001\u5f62\u3092\u8aad\u3080\u52a9\u3051\u306b\u306a\u3063\u3066\u3044\u307e\u3057\u305f\u304b\uff1f',
  },
  {
    id: 'soft_lighting',
    legacyIds: ['calm'],
    label: '\u4f5c\u54c1\u3092\u3084\u308f\u3089\u304b\u3044\u5370\u8c61\u306b\u898b\u305b\u3088\u3046',
    shortLabel: '\u3084\u308f\u3089\u304b\u3044',
    description: '\u5f71\u306e\u5883\u754c\u3084\u660e\u6697\u306e\u5909\u5316\u3092\u7a4f\u3084\u304b\u306b\u3057\u3001\u843d\u3061\u7740\u3044\u3066\u898b\u3089\u308c\u308b\u7167\u660e\u3092\u3064\u304f\u308a\u307e\u3059\u3002',
    learningPoints: ['\u5149\u6e90\u9762\u7a4d', '\u62e1\u6563', '\u5f71\u306e\u67d4\u3089\u304b\u3055'],
    internalEvaluationName: '\u9670\u5f71\u306e\u7a4f\u3084\u304b\u3055',
    candidateMetrics: ['\u5149\u6e90\u9762\u7a4d', '\u660e\u6697\u52fe\u914d', '\u5f71\u5883\u754c\u306e\u6ed1\u3089\u304b\u3055'],
    scoreEnabled: true,
    provisionalEvaluation: '\u65e7\u300c\u7a4f\u3084\u304b\u300d\u8a55\u4fa1\u306e\u9762\u5149\u6e90\u9762\u7a4d\u30fb\u30b9\u30dd\u30c3\u30c8\u5f31\u5ea6\u3092\u66ab\u5b9a\u6307\u6a19\u3068\u3057\u3066\u4f7f\u7528\u3057\u307e\u3059\u3002',
    rules: [scoreSoftLighting],
    hint: hintSoftLighting,
    critique: critiqueSoftLighting,
    reflectionQuestion: '\u5f71\u306e\u5883\u754c\u306f\u3001\u5f37\u3059\u304e\u305a\u81ea\u7136\u306b\u898b\u3048\u3066\u3044\u307e\u3057\u305f\u304b\uff1f',
  },
  {
    id: 'background_separation',
    legacyIds: ['mystery'],
    label: '\u4f5c\u54c1\u306e\u8f2a\u90ed\u3092\u80cc\u666f\u304b\u3089\u969b\u7acb\u305f\u305b\u3088\u3046',
    shortLabel: '\u304f\u3063\u304d\u308a',
    description: '\u4f5c\u54c1\u3068\u80cc\u666f\u306e\u660e\u308b\u3055\u306b\u5dee\u3092\u3064\u3051\u3001\u8f2a\u90ed\u304c\u306f\u3063\u304d\u308a\u898b\u3048\u308b\u7167\u660e\u3092\u3064\u304f\u308a\u307e\u3059\u3002',
    learningPoints: ['\u9006\u5149', '\u8f2a\u90ed\u5149', '\u80cc\u666f\u3068\u306e\u5206\u96e2', '\u6b63\u9762\u5149\u3068\u306e\u6bd4\u7387'],
    internalEvaluationName: '\u80cc\u666f\u304b\u3089\u306e\u5206\u96e2',
    candidateMetrics: ['\u8f2a\u90ed\u5468\u8fba\u306e\u660e\u6697\u5dee', '\u80cc\u666f\u3068\u306e\u660e\u6697\u5dee', '\u30ea\u30e0\u5149'],
    scoreEnabled: true,
    provisionalEvaluation: '\u65e7\u300c\u795e\u79d8\u7684\u300d\u8a55\u4fa1\u306e\u80cc\u9762\u5149\u30fb\u6b63\u9762\u5149\u6291\u5236\u3092\u3001\u8f2a\u90ed\u5206\u96e2\u306e\u66ab\u5b9a\u6307\u6a19\u3068\u3057\u3066\u4f7f\u7528\u3057\u307e\u3059\u3002',
    rules: [scoreBackgroundSeparation],
    hint: hintBackgroundSeparation,
    critique: critiqueBackgroundSeparation,
    reflectionQuestion: '\u80cc\u666f\u3068\u4f5c\u54c1\u306e\u5883\u76ee\u306f\u3001\u898b\u5206\u3051\u3084\u3059\u304f\u306a\u3063\u3066\u3044\u307e\u3057\u305f\u304b\uff1f',
  },
  {
    id: 'visual_focus',
    legacyIds: ['eeriness'],
    label: '\u4e2d\u592e\u4e0a\u90e8\u306b\u6ce8\u76ee\u3092\u96c6\u3081\u3088\u3046',
    shortLabel: '\u76ee\u3092\u5f15\u304f',
    description: '\u4f5c\u54c1\u306e\u4e2d\u592e\u4e0a\u90e8\u3092\u5468\u56f2\u3088\u308a\u76ee\u7acb\u305f\u305b\u3001\u81ea\u7136\u306b\u8996\u7dda\u304c\u5411\u304f\u7167\u660e\u3092\u3064\u304f\u308a\u307e\u3059\u3002',
    learningPoints: ['\u5c40\u6240\u7167\u660e', '\u30b3\u30f3\u30c8\u30e9\u30b9\u30c8', '\u8996\u7dda\u8a98\u5c0e', '\u80cc\u666f\u3068\u306e\u660e\u6697\u5dee'],
    internalEvaluationName: '\u6ce8\u76ee\u9818\u57df\u306e\u5f37\u8abf',
    candidateMetrics: ['\u6307\u5b9a\u9818\u57df\u3068\u5468\u8fba\u306e\u660e\u6697\u5dee', '\u5149\u306e\u5c40\u6240\u6027', '\u767d\u98db\u3073\u9632\u6b62'],
    attentionTarget: '\u4e2d\u592e\u4e0a\u90e8',
    scoreEnabled: true,
    provisionalEvaluation: '\u8272\u5f69\u8a55\u4fa1\u3092\u4f7f\u308f\u305a\u3001\u65e7\u30ed\u30b8\u30c3\u30af\u306e\u4f4d\u7f6e\u30fb\u5c40\u6240\u7684\u306a\u5149\u306e\u7279\u5fb4\u3060\u3051\u3092\u66ab\u5b9a\u6307\u6a19\u3068\u3057\u3066\u4f7f\u7528\u3057\u307e\u3059\u3002',
    rules: [scoreVisualFocus],
    hint: hintVisualFocus,
    critique: critiqueVisualFocus,
    reflectionQuestion: '\u6700\u521d\u306b\u8996\u7dda\u304c\u5411\u304b\u3046\u5834\u6240\u306f\u3001\u610f\u56f3\u3057\u305f\u898b\u305b\u5834\u306b\u306a\u3063\u3066\u3044\u307e\u3057\u305f\u304b\uff1f',
  },
];

const tasks = [...tutorialTasks, ...mainTasks];

const models = [
  { id: 'abstract', label: '\u5e7e\u4f55' },
  { id: 'bust', label: '\u80f8\u50cf' },
  { id: 'figure', label: '\u4eba\u578b' },
];

const defaultLights = [
  { enabled: true, showHelper: true, kind: 'spot', x: 3.2, y: 4.2, z: 4.8, intensity: 320, spread: 0.42, width: 3, height: 3, elevation: -35, azimuth: -135, color: BASIC_TRAINING_LIGHT_COLOR },
  { enabled: true, showHelper: true, kind: 'area', x: -4, y: 2.5, z: 4, intensity: 260, spread: 0.55, width: 5, height: 3.8, elevation: -35, azimuth: 130, color: BASIC_TRAINING_LIGHT_COLOR },
  { enabled: false, showHelper: true, kind: 'spot', x: 0, y: -5, z: 3, intensity: 140, spread: 0.5, width: 2.4, height: 2.4, elevation: -18, azimuth: 0, color: BASIC_TRAINING_LIGHT_COLOR },
];

const state = {
  phase: 'setup',
  taskId: 'tutorial_light_object',
  modelId: 'abstract',
  assist: { hint: true, feedback: true },
  activeLight: 0,
  lights: clone(defaultLights),
  history: [],
  startedAt: 0,
  startedAtIso: '',
  sessionStats: createSessionStats(),
  showSurfaceSamples: false,
  surfaceIlluminanceSamples: [],
  surfaceIlluminanceSummary: clone(EMPTY_ILLUMINANCE_SUMMARY),
  uniformVisibilityEvaluation: null,
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
    if (THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.lightObjects = [];
    this.markers = [];
    this.modelGroup = new THREE.Group();
    this.surfaceSampleGroup = new THREE.Group();

    this.buildStage();
    this.setModel(state.modelId);
    this.buildLights();
    this.scene.add(this.surfaceSampleGroup);
    this.updateCamera(state.camera);
    this.updateSurfaceSamples(state.surfaceIlluminanceSamples, state.showSurfaceSamples);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  buildStage() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: STAGE_MATERIALS.floor, roughness: 0.78 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 12),
      new THREE.MeshStandardMaterial({ color: STAGE_MATERIALS.wall, roughness: 0.82 }),
    );
    wall.position.set(0, 6, -5.6);
    this.scene.add(wall);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.38, 2.4),
      new THREE.MeshStandardMaterial({ color: STAGE_MATERIALS.plinth, roughness: 0.64 }),
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
    const mat = new THREE.MeshStandardMaterial(SUBJECT_MATERIAL);

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
      entry.light.intensity = data.enabled === false ? 0 : data.intensity;
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
      this.markers[index].visible = data.showHelper !== false;
      this.markers[index].material.color.set(data.enabled === false ? 0x7a7f8c : (index === state.activeLight ? 0xecff72 : 0x5265ff));
      this.markers[index].material.opacity = data.enabled === false ? 0.36 : (data.kind === 'area' ? 0.78 : 0.92);
    });
  }

  updateSurfaceSamples(samples, visible) {
    if (!this.surfaceSampleGroup) return;
    this.surfaceSampleGroup.clear();
    this.surfaceSampleGroup.visible = visible;
    if (!visible || !samples?.length) return;
    const geometry = new THREE.SphereGeometry(0.035, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x37d5c5,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });
    samples.forEach((sample) => {
      if (!sample.valid) return;
      const p = offsetSamplePosition(sample);
      const dot = new THREE.Mesh(geometry, material);
      dot.position.set(p.x, p.z, p.y);
      dot.userData.ignoreForEvaluation = true;
      this.surfaceSampleGroup.add(dot);
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
    scene.updateSurfaceSamples(state.surfaceIlluminanceSamples, state.showSurfaceSamples);
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
    updateSurfaceSamples: () => {},
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
          <p class="app-subtitle">\u307e\u305a\u306f\u7df4\u7fd2\u3059\u308b\u7167\u660e\u306e\u76ee\u6a19\u3092\u9078\u3073\u307e\u3059\u3002\u57fa\u790e\u8ab2\u984c\u3067\u306f\u8272\u3067\u5370\u8c61\u3092\u4f5c\u3089\u305a\u3001\u914d\u7f6e\u30fb\u5411\u304d\u30fb\u30e9\u30a4\u30c8\u5f37\u5ea6\u3092\u5b66\u3073\u307e\u3059\u3002</p>
          <div class="task-list">
            ${tasks.map((task) => `
              <button type="button" class="task-choice ${task.id === state.taskId ? 'is-selected' : ''}" data-task="${task.id}">
                <span class="task-dot"></span>
                <span class="task-badge">${task.scoreEnabled === false ? '\u30c1\u30e5\u30fc\u30c8\u30ea\u30a2\u30eb' : '\u672c\u8ab2\u984c'}</span>
                <span class="task-name">${task.label}</span>
                <span class="task-detail">${task.description}<br><strong>\u4eca\u56de\u306e\u30dd\u30a4\u30f3\u30c8:</strong> ${task.learningPoints.join('\u30fb')}</span>
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
      state.taskId = normalizeTaskId(button.dataset.task);
      renderSetup();
    });
  });
  app.querySelectorAll('.model-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.modelId = button.dataset.model;
      updateDerivedIlluminance();
      scene.setModel(state.modelId);
      scene.updateSurfaceSamples(state.surfaceIlluminanceSamples, state.showSurfaceSamples);
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
  const hints = showHint(task, state);
  app.innerHTML = `
    <main class="screen operation-screen">
      <header class="toolbar">
        <div class="topic">
          <strong>[\u984c\uff1a${task.label}]</strong>
          <span>${task.description}</span>
          ${task.attentionTarget ? `<em class="attention-note">\u6ce8\u76ee\u9818\u57df: ${task.attentionTarget}</em>` : ''}
        </div>
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
          <div class="light-state-controls">
            <label class="check-row">
              <input id="light-enabled" type="checkbox" ${light.enabled === false ? '' : 'checked'} />
              <span>\u30e9\u30a4\u30c8\u3092\u70b9\u706f</span>
            </label>
            <label class="check-row">
              <input id="helper-visible" type="checkbox" ${light.showHelper === false ? '' : 'checked'} />
              <span>\u64cd\u4f5c\u30ac\u30a4\u30c9\u3092\u8868\u793a</span>
            </label>
            <label class="check-row">
              <input id="surface-samples-visible" type="checkbox" ${state.showSurfaceSamples ? 'checked' : ''} />
              <span>\u8868\u9762\u6e2c\u5b9a\u70b9\u3092\u8868\u793a</span>
            </label>
            <button type="button" class="tool-btn" id="reset-lights">\u521d\u671f\u72b6\u614b\u306b\u623b\u3059</button>
          </div>
          <div class="map-and-values">
            ${topMap()}
            <div class="slider-list">
              ${slider('x', 'x', -10, 10, 0.1)}
              ${slider('y', 'y', -10, 10, 0.1)}
              ${slider('z', 'z', -2, 10, 0.1)}
              ${slider('intensity', '\u30e9\u30a4\u30c8\u5f37\u5ea6', 0, 1000, 10)}
              ${light.kind === 'spot' ? slider('spread', '\u62e1\u6563\u7387', 0.08, 0.9, 0.01) : ''}
              ${light.kind === 'area' ? slider('width', '\u6a2a\u5e45', 0.5, 8, 0.1) + slider('height', '\u7e26\u5e45', 0.5, 8, 0.1) : ''}
              ${slider('elevation', '\u4ef0\u4fef\u89d2', -80, 80, 1)}
              ${slider('azimuth', '\u65b9\u4f4d\u89d2', -180, 180, 1)}
            </div>
          </div>
          ${allowLightColorEditing ? `
            <label class="color-row">
              <span>\u30e9\u30a4\u30c8\u8272</span>
              <input type="color" id="color" value="${light.color}" />
            </label>
          ` : `
            <div class="color-row is-locked">
              <span>\u30e9\u30a4\u30c8\u8272</span>
              <strong>\u57fa\u790e\u8ab2\u984c\u3067\u306f${BASIC_TRAINING_LIGHT_COLOR_LABEL}\u306b\u56fa\u5b9a</strong>
            </div>
          `}
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
    <main class="screen feedback-screen is-scrollable">
      <section class="feedback-card">
        <div class="feedback-head feedback-drag-handle">
          <div>
            <h1 class="feedback-title">\u304a\u984c\uff1a${task.label}</h1>
            <p class="muted">${task.description}</p>
          </div>
          <button type="button" class="ghost-btn" id="new-task">\u304a\u984c\u9078\u629e\u3078</button>
        </div>
        <div class="feedback-body">
          <div class="score-panel">
            ${showScoreResult(result)}
            ${showPerformanceCritique(result)}
            ${showReflectionQuestion(result)}
          </div>
          ${supportCondition.showScoreAfterDecision ? `<div class="score-bars-panel">${scoreBars(result.allScores, state.taskId)}</div>` : ''}
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
  app.querySelector('#light-enabled').addEventListener('change', (event) => {
    updateLight('enabled', event.target.checked);
    renderOperation();
  });
  app.querySelector('#helper-visible').addEventListener('change', (event) => {
    updateLight('showHelper', event.target.checked);
    renderOperation();
  });
  app.querySelector('#surface-samples-visible').addEventListener('change', (event) => {
    state.showSurfaceSamples = event.target.checked;
    scene.updateSurfaceSamples(state.surfaceIlluminanceSamples, state.showSurfaceSamples);
    renderOperation();
  });
  app.querySelector('#reset-lights').addEventListener('click', resetLights);
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
  const colorInput = app.querySelector('#color');
  if (colorInput) {
    colorInput.addEventListener('input', (event) => {
      updateLight('color', event.target.value);
      const currentColorInput = app.querySelector('#color');
      if (currentColorInput) currentColorInput.value = event.target.value;
    });
  }
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
  state.taskId = normalizeTaskId(state.taskId);
  state.lights = normalizeBasicLightColors(clone(defaultLights));
  state.history = [];
  state.startedAt = performance.now();
  state.startedAtIso = new Date().toISOString();
  state.sessionStats = createSessionStats();
  updateDerivedIlluminance();
  scene.buildLights();
  scene.updateLights(state.lights);
  scene.updateSurfaceSamples(state.surfaceIlluminanceSamples, state.showSurfaceSamples);
  renderOperation();
}

function resetLights() {
  state.lights = normalizeBasicLightColors(clone(defaultLights));
  state.activeLight = 0;
  state.sessionStats.resetCount += 1;
  logChange('reset', 'initial-lights');
  updateDerivedIlluminance();
  scene.buildLights();
  scene.updateLights(state.lights);
  scene.updateSurfaceSamples(state.surfaceIlluminanceSamples, state.showSurfaceSamples);
  renderOperation();
}

function submit() {
  const task = currentTask();
  updateDerivedIlluminance();
  const allScores = scoreAllTasks(state);
  const currentScore = allScores.find((score) => score.id === state.taskId);
  const current = task.scoreEnabled === false ? null : currentScore?.score ?? 0;
  const feedbackInput = buildFeedbackInput(task, current, allScores, state);
  state.result = {
    current,
    targetReached: current === null ? null : current >= PASS_SCORE,
    allScores,
    feedbackInput,
    feedback: buildRuleBasedFeedback(task, current, state, feedbackInput),
    provisionalNote: task.provisionalEvaluation,
  };
  state.history.push({
    at: new Date().toISOString(),
    elapsed: (performance.now() - state.startedAt) / 1000,
    taskId: state.taskId,
    param: 'decision',
    value: current,
    supportCondition: clone(supportCondition),
    evaluationSource: feedbackInput.evaluationSource,
    illuminanceSummary: clone(feedbackInput.illuminanceSummary),
    actionSummary: clone(state.sessionStats),
    internalEvaluationValues: feedbackInput.metrics,
    lights: clone(state.lights),
  });
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
  if (param === 'color' && !allowLightColorEditing) return;
  state.lights[state.activeLight][param] = value;
  if (trainingMode === 'basic') {
    state.lights[state.activeLight].color = BASIC_TRAINING_LIGHT_COLOR;
  }
  logChange(param, value);
  updateDerivedIlluminance();
  scene.updateLights(state.lights);
  scene.updateSurfaceSamples(state.surfaceIlluminanceSamples, state.showSurfaceSamples);
}

function logChange(param, value) {
  updateSessionStats(param);
  state.history.push({
    at: new Date().toISOString(),
    elapsed: (performance.now() - state.startedAt) / 1000,
    taskId: state.taskId,
    supportCondition: clone(supportCondition),
    light: state.activeLight + 1,
    param,
    value,
    actionSummary: clone(state.sessionStats),
    lights: clone(state.lights),
  });
}

function setView(view) {
  if (view === 'front') state.camera = { ...state.camera, view: 'free', theta: 0, phi: 58 };
  if (view === 'side') state.camera = { ...state.camera, view: 'free', theta: 90, phi: 58 };
  if (view === 'top') state.camera = { ...state.camera, view: 'top', theta: 0, phi: 0 };
  scene.updateCamera(state.camera);
}

function showHint(task, snapshot) {
  if (!state.assist.hint || !supportCondition.showHintsDuringOperation) {
    return ['\u73fe\u5728\u306e\u8a2d\u5b9a\u3067\u306f\u64cd\u4f5c\u4e2d\u306e\u30d2\u30f3\u30c8\u3092\u8868\u793a\u3057\u307e\u305b\u3093\u3002'];
  }
  return task.hint(snapshot).filter(Boolean).slice(0, 3);
}

function showScoreResult(result) {
  if (result.current === null) {
    return `
      <div class="score-line">
        <span class="score-state">\u30c1\u30e5\u30fc\u30c8\u30ea\u30a2\u30eb</span>
        <strong>--<span>/100\u70b9</span></strong>
      </div>
      <p class="pass-line">\u3053\u306e\u8ab2\u984c\u306f\u30b9\u30b3\u30a2\u5bfe\u8c61\u5916\u3067\u3059\u3002</p>
      <p class="provisional-note">${result.provisionalNote}</p>
    `;
  }
  const scoreMarkup = supportCondition.showScoreAfterDecision
    ? `<strong>${result.current}<span>/100\u70b9</span></strong>`
    : '<strong>--<span>/100\u70b9</span></strong>';
  const targetMarkup = supportCondition.showPassFailAfterDecision
    ? `<span class="score-state">${result.targetReached ? '\u66ab\u5b9a\u76ee\u6a19\u306b\u5230\u9054' : '\u66ab\u5b9a\u76ee\u6a19\u307e\u3067\u3042\u3068\u5c11\u3057'}</span>`
    : '<span class="score-state">\u66ab\u5b9a\u30b9\u30b3\u30a2</span>';
  const metricsMarkup = metricList(result.feedbackInput);
  return `
    <div class="score-line">
      ${targetMarkup}
      ${scoreMarkup}
    </div>
    <p class="pass-line">\u66ab\u5b9a\u76ee\u6a19: ${PASS_SCORE}/100\u70b9</p>
    <p class="score-note">\u5185\u90e8\u8a55\u4fa1: ${currentTask().internalEvaluationName}</p>
    ${metricsMarkup}
    <p class="provisional-note">${result.provisionalNote}</p>
  `;
}

function showPerformanceCritique(result) {
  if (!state.assist.feedback || !supportCondition.showCritiqueAfterDecision) return '';
  const feedback = result.feedback;
  return `
    <section class="critique-block">
      <h2>\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af</h2>
      <h3>\u826f\u304b\u3063\u305f\u70b9</h3>
      <ul class="feedback-list">${feedback.positiveFeatures.map((item) => `<li>${item}</li>`).join('')}</ul>
      <h3>\u4e3b\u306a\u554f\u984c</h3>
      <ul class="feedback-list">${feedback.detectedIssues.map((item) => `<li>${item}</li>`).join('')}</ul>
      <h3>\u6b21\u306b\u898b\u308b\u3079\u304d\u70b9</h3>
      <p class="critique">${feedback.nextObservation}</p>
    </section>
  `;
}

function showReflectionQuestion(result) {
  if (!supportCondition.showReflectionQuestionAfterDecision) return '';
  return `<section class="reflection-block"><h2>\u5185\u7701\u306e\u554f\u3044</h2><p>${result.feedback.reflectionQuestion}</p></section>`;
}

function scoreAllTasks(snapshot) {
  return tasks.filter((task) => task.scoreEnabled !== false).map((task) => {
    // These rules are provisional bridges from the previous parameter-based evaluator.
    // Replace per-task rules with surface illuminance / visibility metrics as they become available.
    const evaluation = evaluateTask(task, snapshot);
    return {
      id: task.id,
      title: task.shortLabel || task.label,
      score: evaluation.score,
      internalEvaluationName: task.internalEvaluationName,
      evaluationSource: evaluation.evaluationSource,
      illuminanceSummary: evaluation.illuminanceSummary,
      visibilityBreakdown: evaluation.visibilityBreakdown,
    };
  });
}

function evaluateTask(task, snapshot) {
  if (task.id === 'uniform_visibility') {
    const direct = evaluateUniformVisibilityFromIlluminance(snapshot);
    if (direct) return direct;
  }
  const score = Math.round(task.rules.reduce((sum, rule) => sum + rule(snapshot), 0) / task.rules.length);
  return {
    score: clamp(score, 0, 100),
    evaluationSource: 'legacy',
    illuminanceSummary: getSurfaceIlluminanceSummary(snapshot) || clone(EMPTY_ILLUMINANCE_SUMMARY),
    visibilityBreakdown: null,
  };
}

function buildFeedbackInput(task, score, allScores, snapshot) {
  const scoreEntry = allScores.find((item) => item.id === task.id);
  const surface = scoreEntry?.illuminanceSummary || getSurfaceIlluminanceSummary(snapshot) || clone(EMPTY_ILLUMINANCE_SUMMARY);
  const evaluationSource = task.id === 'uniform_visibility' ? scoreEntry?.evaluationSource || 'legacy' : 'legacy';
  const metrics = {
    averageIlluminance: task.id === 'uniform_visibility' ? surface.averageIlluminance : null,
    minIlluminance: task.id === 'uniform_visibility' ? surface.minIlluminance : null,
    maxIlluminance: task.id === 'uniform_visibility' ? surface.maxIlluminance : null,
    percentile10Illuminance: task.id === 'uniform_visibility' ? surface.percentile10Illuminance : null,
    uniformity: task.id === 'uniform_visibility' ? surface.uniformity : null,
    validSampleCount: task.id === 'uniform_visibility' ? surface.validSampleCount : null,
    highlightClippingRate: null,
    darkAreaRate: null,
    objectBackgroundContrast: null,
  };
  return {
    taskId: task.id,
    taskTitle: task.label,
    score,
    metrics,
    evaluationSource,
    illuminanceSummary: clone(surface),
    visibilityBreakdown: scoreEntry?.visibilityBreakdown || null,
    detectedIssues: [],
    positiveFeatures: [],
    actionSummary: clone(snapshot.sessionStats),
    allScores,
  };
}

function buildRuleBasedFeedback(task, score, snapshot, feedbackInput) {
  if (task.scoreEnabled === false) {
    return {
      positiveFeatures: ['\u30e9\u30a4\u30c8\u306e\u4f4d\u7f6e\u30fb\u5411\u304d\u30fb\u70b9\u706f\u72b6\u614b\u306e\u95a2\u4fc2\u3092\u78ba\u8a8d\u3067\u304d\u307e\u3057\u305f\u3002'],
      detectedIssues: ['\u3053\u306e\u7df4\u7fd2\u306f\u63a1\u70b9\u5bfe\u8c61\u5916\u306e\u305f\u3081\u3001\u8a55\u4fa1\u5024\u306f\u8868\u793a\u3057\u3066\u3044\u307e\u305b\u3093\u3002'],
      nextObservation: '\u7269\u4f53\u306e\u8868\u9762\u306b\u5149\u304c\u5c4a\u3044\u3066\u3044\u308b\u9762\u3068\u3001\u5c4a\u3044\u3066\u3044\u306a\u3044\u9762\u306e\u9055\u3044\u3092\u898b\u6bd4\u3079\u3066\u304f\u3060\u3055\u3044\u3002',
      reflectionQuestion: task.reflectionQuestion,
    };
  }

  if (task.id === 'uniform_visibility' && feedbackInput.evaluationSource === 'direct_illuminance') {
    return buildUniformVisibilityFeedback(task, score, feedbackInput);
  }

  const positiveFeatures = [];
  const detectedIssues = [];
  const active = activeLights(snapshot);
  if (active.length >= 2) positiveFeatures.push('\u8907\u6570\u306e\u30e9\u30a4\u30c8\u306e\u5f79\u5272\u3092\u7d44\u307f\u5408\u308f\u305b\u3066\u8a66\u884c\u3057\u3066\u3044\u307e\u3059\u3002');
  if (feedbackInput.actionSummary.lightMoveCount > 2) positiveFeatures.push('\u914d\u7f6e\u3092\u52d5\u304b\u3057\u3066\u3001\u5149\u306e\u5f53\u305f\u308a\u65b9\u306e\u5909\u5316\u3092\u63a2\u308c\u3066\u3044\u307e\u3059\u3002');
  if (!positiveFeatures.length) positiveFeatures.push('\u6700\u7d42\u72b6\u614b\u3068\u8ab2\u984c\u306e\u95a2\u4fc2\u3092\u78ba\u8a8d\u3067\u304d\u308b\u8a2d\u5b9a\u304c\u4f5c\u3089\u308c\u3066\u3044\u307e\u3059\u3002');

  if (score < PASS_SCORE) detectedIssues.push('\u66ab\u5b9a\u30b9\u30b3\u30a2\u306f\u76ee\u6a19\u3088\u308a\u4f4e\u304f\u3001\u898b\u3048\u65b9\u306e\u7279\u5fb4\u304c\u307e\u3060\u5f31\u3044\u72b6\u614b\u3067\u3059\u3002');
  if (active.length === 0) detectedIssues.push('\u70b9\u706f\u3057\u3066\u3044\u308b\u30e9\u30a4\u30c8\u304c\u306a\u304f\u3001\u7269\u4f53\u8868\u9762\u306e\u60c5\u5831\u304c\u8aad\u307f\u306b\u304f\u3044\u72b6\u614b\u3067\u3059\u3002');
  if (!detectedIssues.length) detectedIssues.push('\u5927\u304d\u306a\u7834\u7dbb\u306f\u5c11\u306a\u3044\u4e00\u65b9\u3067\u3001\u7269\u4f53\u8868\u9762\u306e\u5b9f\u6e2c\u8a55\u4fa1\u306f\u307e\u3060\u9650\u5b9a\u7684\u3067\u3059\u3002');

  return {
    positiveFeatures,
    detectedIssues,
    nextObservation: nextObservationForTask(task),
    reflectionQuestion: task.reflectionQuestion,
  };
}

function buildUniformVisibilityFeedback(task, score, feedbackInput) {
  const summary = feedbackInput.illuminanceSummary;
  const thresholds = PROVISIONAL_VISIBILITY_THRESHOLDS;
  const positiveFeatures = [];
  const detectedIssues = [];

  if (summary.averageIlluminance >= thresholds.averagePreferredMin && summary.averageIlluminance <= thresholds.averagePreferredMax) {
    positiveFeatures.push('\u5e73\u5747\u7684\u306a\u660e\u308b\u3055\u304c\u66ab\u5b9a\u7684\u306a\u9069\u6b63\u7bc4\u56f2\u306b\u5165\u3063\u3066\u3044\u307e\u3059\u3002');
  }
  if (summary.validSampleCount > 0) {
    positiveFeatures.push('\u7269\u4f53\u8868\u9762\u306e\u6e2c\u5b9a\u70b9\u3092\u4f7f\u3063\u3066\u3001\u8a2d\u5b9a\u5024\u3067\u306f\u306a\u304f\u8868\u9762\u306e\u898b\u3048\u65b9\u3092\u8a55\u4fa1\u3067\u304d\u3066\u3044\u307e\u3059\u3002');
  }

  if (summary.averageIlluminance < thresholds.averagePreferredMin) {
    detectedIssues.push('\u76f4\u63a5\u5149\u306e\u76f8\u5bfe\u5024\u304c\u5168\u4f53\u7684\u306b\u4f4e\u3044\u6e2c\u5b9a\u7d50\u679c\u3067\u3059\u3002');
  }
  if (summary.averageIlluminance > thresholds.averagePreferredMax) {
    detectedIssues.push('\u76f4\u63a5\u5149\u306e\u76f8\u5bfe\u5024\u304c\u5168\u4f53\u7684\u306b\u9ad8\u3044\u6e2c\u5b9a\u7d50\u679c\u3067\u3059\u3002');
  }
  if (summary.uniformity < thresholds.uniformityPreferred) {
    detectedIssues.push('\u4e0b\u4f4d10%\u306e\u6e2c\u5b9a\u70b9\u3067\u3001\u76f4\u63a5\u5149\u304c\u307b\u3068\u3093\u3069\u5c4a\u3044\u3066\u3044\u306a\u3044\u70b9\u304c\u3042\u308a\u307e\u3059\u3002');
  }
  if (summary.maxIlluminance > thresholds.maximumAllowed) {
    detectedIssues.push('\u4e00\u90e8\u306b\u5149\u304c\u96c6\u4e2d\u3057\u3059\u304e\u3066\u3044\u308b\u53ef\u80fd\u6027\u304c\u3042\u308a\u307e\u3059\u3002\u3053\u308c\u306f\u767d\u98db\u3073\u7387\u3067\u306f\u306a\u304f\u3001\u6700\u5927\u7167\u5ea6\u306b\u3088\u308b\u66ab\u5b9a\u6307\u6a19\u3067\u3059\u3002');
  }
  if (!detectedIssues.length) {
    detectedIssues.push('\u76f4\u63a5\u7167\u5ea6\u306e\u66ab\u5b9a\u6307\u6a19\u3067\u306f\u5927\u304d\u306a\u504f\u308a\u306f\u5c11\u306a\u3044\u72b6\u614b\u3067\u3059\u3002');
  }

  return {
    positiveFeatures,
    detectedIssues,
    nextObservation: score >= PASS_SCORE
      ? '次は暗い面に形が残っているか、最も明るい面の情報が潰れていないか観察してください。'
      : '下位10%の測定点と平均値の差が、表面の読みやすさにどう見えているか確認してください。',
    reflectionQuestion: task.reflectionQuestion,
  };
}

function metricList(feedbackInput) {
  if (feedbackInput.taskId === 'uniform_visibility' && feedbackInput.evaluationSource !== 'direct_illuminance') {
    return '<p class="score-note">\u76f4\u63a5\u7167\u5ea6\u30c7\u30fc\u30bf\uff1a\u672a\u53d6\u5f97</p>';
  }
  const entries = Object.entries(feedbackInput.metrics).filter(([key, value]) => (
    ['averageIlluminance', 'minIlluminance', 'maxIlluminance', 'percentile10Illuminance', 'uniformity', 'validSampleCount'].includes(key)
    && value !== null
    && value !== undefined
    && Number.isFinite(value)
  ));
  if (!entries.length) {
    return '<p class="score-note">\u76f4\u63a5\u7167\u5ea6\u30c7\u30fc\u30bf\uff1a\u672a\u53d6\u5f97</p>';
  }
  const labels = {
    averageIlluminance: '\u5e73\u5747\u7167\u5ea6\uff08\u76f8\u5bfe\u5024\uff09',
    minIlluminance: '\u6700\u5c0f\u7167\u5ea6\uff08\u76f8\u5bfe\u5024\uff09',
    maxIlluminance: '\u6700\u5927\u7167\u5ea6\uff08\u76f8\u5bfe\u5024\uff09',
    percentile10Illuminance: '\u4e0b\u4f4d10%\u7167\u5ea6\uff08\u76f8\u5bfe\u5024\uff09',
    uniformity: '\u66ab\u5b9a\u5747\u6589\u5ea6',
    validSampleCount: '\u6e2c\u5b9a\u70b9',
  };
  const total = feedbackInput.illuminanceSummary?.totalSampleCount ?? 0;
  return `
    <dl class="metric-list">
      ${entries.map(([key, value]) => `<div><dt>${labels[key] || key}</dt><dd>${formatMetricValue(key, value, total)}</dd></div>`).join('')}
    </dl>
    <p class="score-note">\u6700\u5927\u7167\u5ea6\u306b\u3088\u308b\u6e1b\u70b9\u306f\u3001\u767d\u98db\u3073\u7387\u306e\u753b\u50cf\u89e3\u6790\u3067\u306f\u306a\u3044\u66ab\u5b9a\u6307\u6a19\u3067\u3059\u3002</p>
  `;
}

function formatMetricValue(key, value, totalSampleCount) {
  if (key === 'validSampleCount') return `${Math.round(value)} / ${Math.round(totalSampleCount)}`;
  if (key === 'uniformity') return Number(value).toFixed(2);
  return Number(value).toFixed(1);
}

function nextObservationForTask(task) {
  const table = {
    uniform_visibility: '\u6700\u3082\u660e\u308b\u3044\u90e8\u5206\u3068\u6700\u3082\u6697\u3044\u90e8\u5206\u306e\u5dee\u304c\u3001\u5f62\u306e\u8aad\u307f\u3084\u3059\u3055\u3092\u59a8\u3052\u3066\u3044\u306a\u3044\u304b\u898b\u3066\u304f\u3060\u3055\u3044\u3002',
    shape_emphasis: '\u660e\u308b\u3044\u9762\u3068\u6697\u3044\u9762\u306e\u5dee\u304c\u3001\u51f9\u51f8\u3092\u8aad\u3080\u624b\u304c\u304b\u308a\u306b\u306a\u3063\u3066\u3044\u308b\u304b\u898b\u3066\u304f\u3060\u3055\u3044\u3002',
    soft_lighting: '\u5f71\u306e\u5883\u754c\u304c\u6025\u306b\u5207\u308a\u66ff\u308f\u3063\u3066\u3044\u306a\u3044\u304b\u3001\u6697\u90e8\u306b\u5f62\u304c\u6b8b\u3063\u3066\u3044\u308b\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    background_separation: '\u80cc\u666f\u3068\u8f2a\u90ed\u306e\u660e\u308b\u3055\u306e\u5dee\u306b\u6ce8\u76ee\u3057\u3001\u5916\u5074\u306e\u5f62\u304c\u8ffd\u3048\u308b\u304b\u898b\u3066\u304f\u3060\u3055\u3044\u3002',
    visual_focus: '\u4e2d\u592e\u4e0a\u90e8\u3068\u5468\u56f2\u306e\u660e\u308b\u3055\u3092\u6bd4\u3079\u3001\u8996\u7dda\u304c\u81ea\u7136\u306b\u96c6\u307e\u308b\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  };
  return table[task.id] || '\u5149\u304c\u7269\u4f53\u8868\u9762\u306b\u3069\u3046\u5c4a\u3044\u3066\u3044\u308b\u304b\u89b3\u5bdf\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
}

function evaluateUniformVisibilityFromIlluminance(snapshot) {
  const summary = getSurfaceIlluminanceSummary(snapshot);
  if (!isUsableIlluminanceSummary(summary)) return null;
  const parts = visibilityScoreParts(summary);
  const directScore = clamp(
    parts.averageIlluminanceScore * 0.35
      + parts.lowPercentileIlluminanceScore * 0.25
      + parts.uniformityScore * 0.3
      - parts.excessiveIlluminancePenalty * 0.1,
    0,
    100,
  );
  if (!Number.isFinite(directScore)) return null;
  const legacyScore = scoreUniformVisibilityLegacy(snapshot);
  const score = clamp(legacyScore * 0.7 + directScore * 0.3, 0, 100);
  if (!Number.isFinite(score)) return null;
  return {
    score: Math.round(score),
    evaluationSource: 'direct_illuminance',
    illuminanceSummary: summary,
    visibilityBreakdown: { ...parts, directScore, legacyScore },
  };
}

function visibilityScoreParts(summary) {
  const t = PROVISIONAL_VISIBILITY_THRESHOLDS;
  return {
    averageIlluminanceScore: preferredRangeScore(summary.averageIlluminance, t.averagePreferredMin, t.averagePreferredMax),
    lowPercentileIlluminanceScore: clamp(summary.percentile10Illuminance / t.minimumPreferred * 100, 0, 100),
    uniformityScore: clamp(summary.uniformity / t.uniformityPreferred * 100, 0, 100),
    // This is a provisional maximum-illuminance proxy, not image-based highlight clipping.
    excessiveIlluminancePenalty: clamp((summary.maxIlluminance - t.maximumAllowed) / t.maximumAllowed * 100, 0, 100),
  };
}

function scoreUniformVisibility(snapshot) {
  const direct = evaluateUniformVisibilityFromIlluminance(snapshot);
  if (direct) return direct.score;
  return scoreUniformVisibilityLegacy(snapshot);
}

function scoreUniformVisibilityLegacy(snapshot) {
  const lights = activeLights(snapshot);
  const keyLight = lights[0] || snapshot.lights[0];
  return clamp(
    balanceScore(snapshot, 'intensity', 420, 180) * 0.55
      + Math.max(0, 100 - Math.abs(keyLight.x - 3) * 12 - Math.abs(keyLight.y - 3) * 12) * 0.25
      + Math.max(0, 100 - Math.abs(keyLight.elevation + 35) * 1.2) * 0.2,
    0,
    100,
  );
}

function scoreShapeEmphasis(snapshot) {
  return clamp(
    maxKindScore(snapshot, 'spot', 'intensity', 820, 260) * 0.4
      + (100 - Math.min(100, minKindValue(snapshot, 'spot', 'spread') * 130)) * 0.3
      + Math.max(0, 100 - averageKindValue(snapshot, 'area', 'intensity') * 0.12) * 0.3,
    0,
    100,
  );
}

function scoreSoftLighting(snapshot) {
  const areaLights = activeLights(snapshot).filter((l) => l.kind === 'area');
  return clamp(
    maxKindScore(snapshot, 'area', 'intensity', 720, 260) * 0.35
      + Math.max(...areaLights.map((l) => clamp((l.width * l.height) / 32 * 100, 0, 100)), 0) * 0.45
      + Math.max(0, 100 - averageKindValue(snapshot, 'spot', 'intensity') * 0.1) * 0.2,
    0,
    100,
  );
}

function scoreBackgroundSeparation(snapshot) {
  const lights = activeLights(snapshot);
  if (!lights.length) return 0;
  return clamp(
    Math.max(...lights.map((l) => l.y < -5 ? 100 : Math.max(0, 100 - (l.y + 5) * 15))) * 0.45
      + Math.max(0, 100 - averageIntensity(snapshot) * 0.08) * 0.25
      + Math.max(...lights.map((l) => Math.max(0, 100 - Math.abs(Math.abs(l.azimuth) - 180) * 0.5))) * 0.3,
    0,
    100,
  );
}

function scoreVisualFocus(snapshot) {
  const strongestSpot = maxKindScore(snapshot, 'spot', 'intensity', 760, 280);
  const focusedSpread = 100 - Math.min(100, minKindValue(snapshot, 'spot', 'spread') * 145);
  const backgroundDrop = Math.max(0, 100 - averageKindValue(snapshot, 'area', 'intensity') * 0.1);
  return clamp(strongestSpot * 0.45 + focusedSpread * 0.35 + backgroundDrop * 0.2, 0, 100);
}

function getSurfaceIlluminanceSummary(snapshot) {
  const metrics = snapshot.surfaceIlluminanceSummary || snapshot.illuminanceSummary;
  if (!metrics) return null;
  const averageIlluminance = nullableNumber(metrics.averageIlluminance ?? metrics.average ?? metrics.mean);
  const minIlluminance = nullableNumber(metrics.minIlluminance ?? metrics.min);
  const maxIlluminance = nullableNumber(metrics.maxIlluminance ?? metrics.max);
  const percentile10Illuminance = nullableNumber(metrics.percentile10Illuminance ?? metrics.p10);
  const uniformity = nullableNumber(metrics.uniformity);
  const validSampleCount = Number(metrics.validSampleCount ?? metrics.sampleCount ?? 0);
  const totalSampleCount = Number(metrics.totalSampleCount ?? metrics.sampleCount ?? validSampleCount);
  if ([averageIlluminance, minIlluminance, maxIlluminance].some((value) => value === undefined || Number.isNaN(value))) return null;
  const p10 = percentile10Illuminance === undefined || percentile10Illuminance === null || Number.isNaN(percentile10Illuminance)
    ? minIlluminance
    : percentile10Illuminance;
  return {
    averageIlluminance,
    minIlluminance,
    maxIlluminance,
    percentile10Illuminance: p10,
    uniformity: uniformity === null || Number.isNaN(uniformity)
      ? computeUniformity(p10, averageIlluminance)
      : clamp(uniformity, 0, 1),
    validSampleCount: Number.isFinite(validSampleCount) ? validSampleCount : 0,
    totalSampleCount: Number.isFinite(totalSampleCount) ? totalSampleCount : 0,
  };
}

function updateDerivedIlluminance() {
  const samples = generateSurfaceMeasurementPoints(state.modelId).map((sample) => {
    const valid = isSampleFacingAnyEnabledLight(sample, state.lights);
    const prepared = { ...sample, valid };
    return {
      ...prepared,
      illuminance: calculateDirectIlluminanceAtSample(prepared, state.lights),
    };
  });
  const summary = summarizeIlluminanceSamples(samples);
  state.surfaceIlluminanceSamples = samples;
  state.surfaceIlluminanceSummary = summary;
  state.uniformVisibilityEvaluation = evaluateUniformVisibilityFromIlluminance(state);
  return summary;
}

function isSampleFacingAnyEnabledLight(sample, lights) {
  const enabled = activeLights({ lights });
  if (!enabled.length) return true;
  return enabled.some((light) => {
    const incoming = normalizeVector(subtract(light, sample.position));
    return dot(sample.normal, incoming) > 0.02;
  });
}

function generateSurfaceMeasurementPoints(modelId = 'abstract') {
  const center = { x: 0, y: 0, z: modelId === 'figure' ? 1.95 : modelId === 'bust' ? 1.85 : 1.7 };
  const radius = modelId === 'figure' ? 0.82 : modelId === 'bust' ? 0.95 : 0.98;
  const rings = [
    { z: 0.76, count: 8 },
    { z: 0.28, count: 10 },
    { z: -0.26, count: 10 },
    { z: -0.72, count: 8 },
  ];
  const samples = [];
  rings.forEach((ring, ringIndex) => {
    const radial = Math.sqrt(Math.max(0, 1 - ring.z ** 2));
    for (let i = 0; i < ring.count; i += 1) {
      const a = (Math.PI * 2 * i) / ring.count + ringIndex * 0.18;
      const normal = normalizeVector({ x: Math.cos(a) * radial, y: Math.sin(a) * radial, z: ring.z });
      samples.push({
        id: `${modelId}-${ringIndex}-${i}`,
        position: {
          x: center.x + normal.x * radius,
          y: center.y + normal.y * radius,
          z: center.z + normal.z * radius,
        },
        normal,
        illuminance: null,
        valid: true,
      });
    }
  });
  return samples;
}

function calculateDirectIlluminanceAtSample(sample, lights) {
  if (!sample.valid) return null;
  return activeLights({ lights }).reduce((sum, light) => {
    const toLight = subtract(light, sample.position);
    const distanceSquared = Math.max(lengthSquared(toLight), 0.08);
    const incoming = normalizeVector(toLight);
    const incidence = Math.max(0, dot(sample.normal, incoming));
    if (incidence <= 0) return sum;
    const sourceDirection = normalizeVector(subtract(targetFromAngles(light), light));
    const lightToPoint = normalizeVector(subtract(sample.position, light));
    const aim = Math.max(0, dot(sourceDirection, lightToPoint));
    if (light.kind === 'spot') {
      const cutoff = Math.cos(clamp(light.spread, 0.08, 0.9));
      if (aim <= cutoff) return sum;
      const spotShape = ((aim - cutoff) / Math.max(1 - cutoff, 0.0001)) ** 1.6;
      return sum + (light.intensity * incidence * spotShape) / distanceSquared;
    }
    const areaFactor = Math.max(light.width * light.height, 0.25);
    const orientation = Math.max(0.1, aim);
    return sum + (light.intensity * areaFactor * incidence * orientation) / (distanceSquared * 8);
  }, 0);
}

function summarizeIlluminanceSamples(samples) {
  const valid = samples.filter((sample) => (
    sample.valid === true
    && Number.isFinite(sample.illuminance)
    && sample.illuminance >= 0
  ));
  if (!valid.length) {
    return { ...clone(EMPTY_ILLUMINANCE_SUMMARY), totalSampleCount: samples.length };
  }
  const values = valid.map((sample) => sample.illuminance);
  const total = values.reduce((sum, value) => sum + value, 0);
  const averageIlluminance = total / values.length;
  const minIlluminance = Math.min(...values);
  const maxIlluminance = Math.max(...values);
  const percentile10Illuminance = percentile(values, 0.1);
  return {
    averageIlluminance,
    minIlluminance,
    maxIlluminance,
    percentile10Illuminance,
    uniformity: computeUniformity(percentile10Illuminance, averageIlluminance),
    validSampleCount: valid.length,
    totalSampleCount: samples.length,
  };
}

function computeUniformity(lowIlluminance, averageIlluminance) {
  if (!Number.isFinite(lowIlluminance) || !Number.isFinite(averageIlluminance)) return null;
  if (averageIlluminance <= 0) return 0;
  return clamp(lowIlluminance / averageIlluminance, 0, 1);
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const position = clamp(ratio, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function isUsableIlluminanceSummary(summary) {
  if (!summary || summary.validSampleCount <= 0) return false;
  return ['averageIlluminance', 'minIlluminance', 'maxIlluminance', 'uniformity']
    .every((key) => summary[key] !== null && Number.isFinite(summary[key]));
}

function hintUniformVisibility(snapshot) {
  const lights = activeLights(snapshot);
  const intensities = lights.map((light) => light.intensity);
  const spread = Math.max(...intensities) - Math.min(...intensities);
  return [
    !lights.length ? '\u70b9\u706f\u3057\u3066\u3044\u308b\u30e9\u30a4\u30c8\u304c\u306a\u304f\u3001\u7269\u4f53\u8868\u9762\u306e\u60c5\u5831\u304c\u78ba\u8a8d\u3057\u306b\u304f\u3044\u72b6\u614b\u3067\u3059\u3002' : '',
    spread > 180 ? '\u30e9\u30a4\u30c8\u5f37\u5ea6\u306e\u5dee\u304c\u5927\u304d\u304f\u3001\u660e\u308b\u3044\u90e8\u5206\u3068\u6697\u3044\u90e8\u5206\u306e\u30e0\u30e9\u304c\u51fa\u3084\u3059\u3044\u72b6\u614b\u3067\u3059\u3002' : '',
    lights.some((light) => light.z < 2) ? '\u4f4e\u3044\u4f4d\u7f6e\u306e\u5149\u304c\u3042\u308a\u3001\u5c40\u6240\u7684\u306a\u5f71\u304c\u51fa\u3084\u3059\u304f\u306a\u3063\u3066\u3044\u307e\u3059\u3002' : '',
    '\u4f5c\u54c1\u5168\u4f53\u306b\u76ee\u3092\u79fb\u3057\u3001\u6975\u7aef\u306b\u6697\u3044\u9762\u304c\u6b8b\u3063\u3066\u3044\u306a\u3044\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  ];
}

function hintShapeEmphasis(snapshot) {
  return [
    Math.abs(snapshot.lights[0].x) < 1 && Math.abs(snapshot.lights[0].y) < 1 ? '\u4e3b\u306a\u5149\u304c\u6b63\u9762\u5bc4\u308a\u3067\u3001\u5f62\u306e\u51f9\u51f8\u304c\u5e73\u3089\u306b\u898b\u3048\u3084\u3059\u3044\u72b6\u614b\u3067\u3059\u3002' : '',
    averageKindValue(snapshot, 'area', 'intensity') > averageKindValue(snapshot, 'spot', 'intensity') ? '\u9762\u5149\u6e90\u304c\u5f37\u304f\u3001\u660e\u6697\u5dee\u304c\u8584\u308c\u3066\u3044\u307e\u3059\u3002' : '',
    '\u660e\u308b\u3044\u9762\u3068\u6697\u3044\u9762\u304c\u3069\u3061\u3089\u3082\u8aad\u3081\u308b\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  ];
}

function hintSoftLighting(snapshot) {
  return [
    minKindValue(snapshot, 'spot', 'spread') < 0.22 ? '\u30b9\u30dd\u30c3\u30c8\u306e\u62e1\u6563\u7387\u304c\u5c0f\u3055\u304f\u3001\u5f71\u306e\u5883\u754c\u304c\u5f37\u304f\u51fa\u3084\u3059\u3044\u72b6\u614b\u3067\u3059\u3002' : '',
    Math.max(...snapshot.lights.filter((l) => l.kind === 'area').map((l) => l.width * l.height), 0) < 10 ? '\u9762\u5149\u6e90\u306e\u9762\u7a4d\u304c\u5c0f\u3055\u304f\u3001\u5149\u304c\u56de\u308a\u8fbc\u307f\u306b\u304f\u3044\u72b6\u614b\u3067\u3059\u3002' : '',
    '\u5f71\u306e\u7aef\u304c\u3069\u308c\u304f\u3089\u3044\u306f\u3063\u304d\u308a\u3057\u3066\u3044\u308b\u304b\u898b\u3066\u304f\u3060\u3055\u3044\u3002',
  ];
}

function hintBackgroundSeparation(snapshot) {
  const lights = activeLights(snapshot);
  return [
    lights.length && lights.every((light) => light.y > -2) ? '\u80cc\u9762\u5074\u304b\u3089\u306e\u5149\u304c\u5c11\u306a\u304f\u3001\u8f2a\u90ed\u304c\u80cc\u666f\u306b\u57cb\u3082\u308c\u3084\u3059\u3044\u72b6\u614b\u3067\u3059\u3002' : '',
    averageKindValue(snapshot, 'spot', 'intensity') + averageKindValue(snapshot, 'area', 'intensity') > 900 ? '\u6b63\u9762\u3084\u5468\u56f2\u304c\u660e\u308b\u304f\u3001\u8f2a\u90ed\u5149\u306e\u5dee\u304c\u8aad\u307f\u306b\u304f\u3044\u72b6\u614b\u3067\u3059\u3002' : '',
    '\u4f5c\u54c1\u306e\u5916\u5074\u306e\u7dda\u304c\u80cc\u666f\u3068\u5206\u304b\u308c\u3066\u898b\u3048\u308b\u304b\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  ];
}

function hintTutorialLightObject(snapshot) {
  const enabledCount = activeLights(snapshot).length;
  return [
    enabledCount === 0 ? '\u307e\u305a\u306f\u5c11\u306a\u304f\u3068\u30821\u3064\u306e\u30e9\u30a4\u30c8\u3092\u70b9\u706f\u3057\u3066\u3001\u7269\u4f53\u306b\u5149\u304c\u5c4a\u304f\u304b\u78ba\u8a8d\u3057\u3066\u307f\u307e\u3057\u3087\u3046\u3002' : '',
    '\u30e9\u30a4\u30c8\u306e\u5411\u304d\u3092\u5909\u3048\u305f\u3068\u304d\u3001\u660e\u308b\u3044\u9762\u304c\u3069\u3053\u306b\u79fb\u308b\u304b\u898b\u3066\u304f\u3060\u3055\u3044\u3002',
    '\u64cd\u4f5c\u30ac\u30a4\u30c9\u306f\u5149\u306e\u5411\u304d\u3092\u898b\u308b\u305f\u3081\u306e\u8868\u793a\u3067\u3001\u70b9\u706f\u72b6\u614b\u3068\u306f\u5225\u3067\u3059\u3002',
  ];
}

function hintTutorialReduceLight(snapshot) {
  const enabledCount = activeLights(snapshot).length;
  return [
    enabledCount > 1 ? '\u8907\u6570\u306e\u30e9\u30a4\u30c8\u304c\u70b9\u706f\u3057\u3066\u3044\u307e\u3059\u3002\u70b9\u706f\u72b6\u614b\u3068\u5411\u304d\u306e\u3069\u3061\u3089\u304c\u898b\u3048\u65b9\u306b\u52b9\u3044\u3066\u3044\u308b\u304b\u78ba\u8a8d\u3057\u3066\u307f\u307e\u3057\u3087\u3046\u3002' : '',
    '\u7269\u4f53\u306b\u5f53\u305f\u308b\u5149\u3092\u6e1b\u3089\u3059\u306b\u306f\u3001\u30e9\u30a4\u30c8\u3092\u6d88\u3059\u65b9\u6cd5\u3068\u5411\u304d\u3092\u5916\u3059\u65b9\u6cd5\u304c\u3042\u308a\u307e\u3059\u3002',
    '\u6697\u304f\u3057\u305f\u3068\u304d\u306b\u3001\u7269\u4f53\u306e\u5f62\u304c\u3069\u3053\u307e\u3067\u8aad\u3081\u308b\u304b\u89b3\u5bdf\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  ];
}

function hintVisualFocus(snapshot) {
  return [
    maxKindScore(snapshot, 'spot', 'intensity', 760, 280) < 45 ? '\u5c40\u6240\u7684\u306b\u76ee\u3092\u5f15\u304f\u5149\u304c\u307e\u3060\u5f31\u3044\u72b6\u614b\u3067\u3059\u3002' : '',
    minKindValue(snapshot, 'spot', 'spread') > 0.55 ? '\u30b9\u30dd\u30c3\u30c8\u306e\u5149\u304c\u5e83\u304c\u308a\u3001\u8996\u7dda\u304c\u4e00\u70b9\u306b\u96c6\u307e\u308a\u306b\u304f\u3044\u72b6\u614b\u3067\u3059\u3002' : '',
    '\u4e00\u756a\u898b\u305b\u305f\u3044\u5834\u6240\u3068\u80cc\u666f\u306e\u660e\u308b\u3055\u306e\u5dee\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
  ];
}

function critiqueUniformVisibility(score) {
  return score >= PASS_SCORE
    ? '\u5168\u4f53\u306e\u660e\u308b\u3055\u30d0\u30e9\u30f3\u30b9\u306f\u6bd4\u8f03\u7684\u6574\u3063\u3066\u3044\u307e\u3059\u3002\u6b21\u306f\u6697\u3044\u9762\u304c\u6b8b\u308b\u5834\u6240\u3092\u3055\u3089\u306b\u89b3\u5bdf\u3057\u3066\u304f\u3060\u3055\u3044\u3002'
    : '\u660e\u308b\u3055\u306e\u504f\u308a\u304c\u307e\u3060\u5f37\u3044\u72b6\u614b\u3067\u3059\u3002\u30e9\u30a4\u30c8\u5f37\u5ea6\u3068\u914d\u7f6e\u306e\u30d0\u30e9\u30f3\u30b9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
}

function critiqueShapeEmphasis(score) {
  return score >= PASS_SCORE
    ? '\u5149\u306e\u5165\u308a\u65b9\u306b\u5dee\u304c\u3042\u308a\u3001\u5f62\u306e\u8d77\u4f0f\u304c\u8aad\u307f\u3084\u3059\u3044\u72b6\u614b\u3067\u3059\u3002'
    : '\u660e\u6697\u306e\u5dee\u3084\u5149\u306e\u65b9\u5411\u304c\u307e\u3060\u5f31\u304f\u3001\u4f5c\u54c1\u304c\u5e73\u3089\u306b\u898b\u3048\u3084\u3059\u3044\u72b6\u614b\u3067\u3059\u3002';
}

function critiqueSoftLighting(score) {
  return score >= PASS_SCORE
    ? '\u5f71\u306e\u5f37\u3055\u304c\u6291\u3048\u3089\u308c\u3001\u843d\u3061\u7740\u3044\u305f\u5149\u306b\u8fd1\u3065\u3044\u3066\u3044\u307e\u3059\u3002'
    : '\u5149\u6e90\u9762\u7a4d\u3084\u30b9\u30dd\u30c3\u30c8\u306e\u786c\u3055\u306e\u5f71\u97ff\u3067\u3001\u5f71\u304c\u307e\u3060\u5f37\u304f\u51fa\u3084\u3059\u3044\u72b6\u614b\u3067\u3059\u3002';
}

function critiqueBackgroundSeparation(score) {
  return score >= PASS_SCORE
    ? '\u80cc\u666f\u3068\u4f5c\u54c1\u306e\u5206\u96e2\u304c\u51fa\u3066\u304a\u308a\u3001\u5916\u5074\u306e\u5f62\u304c\u8aad\u307f\u3084\u3059\u3044\u72b6\u614b\u3067\u3059\u3002'
    : '\u4f5c\u54c1\u306e\u8f2a\u90ed\u3068\u80cc\u666f\u306e\u5dee\u304c\u307e\u3060\u5f31\u3044\u72b6\u614b\u3067\u3059\u3002\u80cc\u9762\u5074\u306e\u5149\u3068\u6b63\u9762\u5149\u306e\u6bd4\u7387\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
}

function critiqueVisualFocus(score) {
  return score >= PASS_SCORE
    ? '\u898b\u305b\u305f\u3044\u5834\u6240\u306b\u660e\u308b\u3055\u306e\u5dee\u304c\u751f\u307e\u308c\u3001\u8996\u7dda\u304c\u5411\u304b\u3044\u3084\u3059\u3044\u72b6\u614b\u3067\u3059\u3002'
    : '\u660e\u308b\u3055\u306e\u5dee\u304c\u5e83\u304f\u5206\u6563\u3057\u3001\u8996\u7dda\u3092\u96c6\u3081\u305f\u3044\u5834\u6240\u304c\u307e\u3060\u5f31\u3044\u72b6\u614b\u3067\u3059\u3002';
}

function scoreBars(scores, currentId) {
  return `
    <div class="bars-head">
      <h2>\u5168\u8ab2\u984c\u306e\u53c2\u8003\u30b9\u30b3\u30a2</h2>
      <span>\u66ab\u5b9a\u76ee\u6a19 ${PASS_SCORE}\u70b9</span>
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
  state.taskId = normalizeTaskId(state.taskId);
  return tasks.find((task) => task.id === state.taskId) || tasks[0];
}

function normalizeTaskId(taskId) {
  return legacyTaskIdMap[taskId] || taskId || tasks[0].id;
}

function normalizeBasicLightColors(lights) {
  if (trainingMode !== 'basic') return lights;
  return lights.map((light) => ({ ...light, color: BASIC_TRAINING_LIGHT_COLOR }));
}

function createSessionStats() {
  return {
    lightMoveCount: 0,
    intensityChangeCount: 0,
    directionChangeCount: 0,
    lightToggleCount: 0,
    resetCount: 0,
  };
}

function updateSessionStats(param) {
  if (!state.sessionStats) state.sessionStats = createSessionStats();
  if (['x', 'y', 'z'].includes(param)) state.sessionStats.lightMoveCount += 1;
  if (param === 'intensity') state.sessionStats.intensityChangeCount += 1;
  if (['elevation', 'azimuth', 'spread', 'width', 'height', 'kind'].includes(param)) {
    state.sessionStats.directionChangeCount += 1;
  }
  if (param === 'enabled') state.sessionStats.lightToggleCount += 1;
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
  const values = activeLights(snapshot).map((light) => light[key]);
  if (!values.length) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const spread = Math.max(...values) - Math.min(...values);
  return clamp(100 - Math.abs(avg - target) / tolerance * 40 - spread / tolerance * 55, 0, 100);
}

function maxKindScore(snapshot, kind, key, target, tolerance) {
  const values = activeLights(snapshot).filter((light) => light.kind === kind).map((light) => light[key]);
  if (!values.length) return 0;
  return clamp(100 - Math.abs(Math.max(...values) - target) / tolerance * 100, 0, 100);
}

function averageKindValue(snapshot, kind, key) {
  const values = activeLights(snapshot).filter((light) => light.kind === kind).map((light) => light[key]);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function minKindValue(snapshot, kind, key) {
  const values = activeLights(snapshot).filter((light) => light.kind === kind).map((light) => light[key]);
  return values.length ? Math.min(...values) : 1;
}

function averageIntensity(snapshot) {
  const lights = activeLights(snapshot);
  return lights.length ? lights.reduce((sum, light) => sum + light.intensity, 0) / lights.length : 0;
}

function activeLights(snapshot) {
  return snapshot.lights.filter((light) => light.enabled !== false);
}

function preferredRangeScore(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  if (value >= min && value <= max) return 100;
  const reference = value < min ? min : max;
  const distance = Math.abs(value - reference);
  return clamp(100 - (distance / Math.max(reference, 1)) * 100, 0, 100);
}

function offsetSamplePosition(sample) {
  return {
    x: sample.position.x + sample.normal.x * SURFACE_SAMPLE_OFFSET,
    y: sample.position.y + sample.normal.y * SURFACE_SAMPLE_OFFSET,
    z: sample.position.z + sample.normal.z * SURFACE_SAMPLE_OFFSET,
  };
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function lengthSquared(vector) {
  return dot(vector, vector);
}

function normalizeVector(vector) {
  const length = Math.sqrt(lengthSquared(vector));
  if (!Number.isFinite(length) || length <= 0) return { x: 0, y: 0, z: 0 };
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function nullableNumber(value) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return Number(value);
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
    resetLights,
    scoreAllTasks,
    evaluateTask,
    updateDerivedIlluminance,
    generateSurfaceMeasurementPoints,
    summarizeIlluminanceSamples,
    calculateDirectIlluminanceAtSample,
    isLightKindMismatch,
    supportCondition,
    legacyTaskIdMap,
    allowLightColorEditing,
    BASIC_TRAINING_LIGHT_COLOR,
    BASIC_TRAINING_LIGHT_COLOR_LABEL,
    PROVISIONAL_VISIBILITY_THRESHOLDS,
  };
}
