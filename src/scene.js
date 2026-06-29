import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export class LightingScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    
    // 1. シーンとカメラの初期設定
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 1, 0);

    // 2. レンダラーの生成
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    // エリアライトの初期化（これを忘れるとエリアライトが光りません！）
    RectAreaLightUniformsLib.init();

    this.createEnvironment();
    this.initLights();
    this.animate();
  }

  // 被写体モデルと床の作成（実験用の簡易オブジェクト）
  createEnvironment() {
    // 床
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 被写体（簡易的な球体）
    const targetGeo = new THREE.SphereGeometry(1, 32, 32);
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    this.targetMesh = new THREE.Mesh(targetGeo, targetMat);
    this.targetMesh.position.set(0, 1, 0);
    this.targetMesh.castShadow = true;
    this.scene.add(this.targetMesh);
  }

  // 仕様書に準拠した2つの灯体を初期化 
  initLights() {
    // ① スポットライト（指向性・硬い光） 
    this.spotLight = new THREE.SpotLight(0xffffff, 5);
    this.spotLight.position.set(3, 5, 3);
    this.spotLight.castShadow = true;
    // アイリス（絞り値）の表現として angle と penumbra を活用 
    this.spotLight.angle = Math.PI / 6; 
    this.spotLight.penumbra = 0.3;      // ハードシャドウ気味に設定
    this.scene.add(this.spotLight);

    // ② エリアライト（拡散性・柔らかい光） 
    // RectAreaLightはシャドウマップに非対応のため、柔らかい光の広がりを表現
    this.areaLight = new THREE.RectAreaLight(0xffffff, 5, 2, 2); // 色, 強度, 幅, 高さ 
    this.areaLight.position.set(-3, 4, 2);
    this.areaLight.lookAt(0, 1, 0);
    this.scene.add(this.areaLight);
  }

  // 外部のUIスライダーからパラメータをリアルタイム更新する口を用意
  updateParams(lightType, params) {
    if (lightType === 'spot') {
      if (params.x !== undefined) this.spotLight.position.x = params.x;
      if (params.y !== undefined) this.spotLight.position.y = params.y;
      if (params.z !== undefined) this.spotLight.position.z = params.z;
      if (params.intensity !== undefined) this.spotLight.intensity = params.intensity;
      if (params.iris !== undefined) {
        // アイリス値（絞り）をThree.jsのAngle（照射角）に変換 
        this.spotLight.angle = (params.iris * Math.PI) / 180;
      }
    } else if (lightType === 'area') {
      if (params.x !== undefined) this.areaLight.position.x = params.x;
      if (params.y !== undefined) this.areaLight.position.y = params.y;
      if (params.z !== undefined) this.areaLight.position.z = params.z;
      if (params.intensity !== undefined) this.areaLight.intensity = params.intensity;
      if (params.width !== undefined) this.areaLight.width = params.width;
      if (params.height !== undefined) this.areaLight.height = params.height;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}