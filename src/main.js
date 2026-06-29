import { LightingScene } from './scene.js';
import { AppUI } from './ui.js';

let scene;
let ui;
let currentBarrier = 'low';
let currentTask = 'dread';

// 料理の仕上げ：初期セットアップ
function init() {
  // 1. 3D空間のインスタンスを生成
  scene = new LightingScene('three-canvas');

  // 2. UIコントローラーの生成。イベントハンドラを渡します
  ui = new AppUI(
    // スライダーが動いたとき
    (lightType, params) => scene.updateParams(lightType, params),
    // 実験タスクを開始したとき
    (barrier, task) => startTask(barrier, task),
    // パラメータを「決定」したとき 
    () => submitSelection()
  );

  // 最初は「設定画面」を表示します 
  ui.renderSetupPhase();
}

function startTask(barrier, task) {
  currentBarrier = barrier;
  currentTask = task;
  const taskName = task === 'dread' ? '威圧感・恐怖' : '安らぎ・静寂';
  
  // 操作フェーズ画面へ遷移 
  ui.renderOperationPhase(currentBarrier, taskName);
}

// バックエンドへの送信と条件分岐
function submitSelection() {
  // 本来はここでPythonサーバーにFetch API等でJSONデータを送信します 
  // 模擬的に、数理スコアとLLMフィードバックを生成したと仮定します [cite: 2, 195]
  const mockScore = Math.floor(Math.random() * 40) + 50; // 50〜90点
  const mockFeedback = `【演出批評】スポットライトの絞りは意図に沿っていますが、エリアライトによる影の打ち消しが強すぎたため、不気味な陰影のコントラストが薄れてしまっています。
【内省の問い】威圧感を際立たせるために、あえて『光を当てない暗闇』をどこに配置すべきか、もう一度考えてみましょう。`; [cite: 12]

  // 実験条件（技術的障壁レベル）に基づいた厳格なルート分岐！ 
  if (currentBarrier === 'high' || currentBarrier === 'midAlpha') {
    // 【高障壁・中α】は事後の答え合わせ・FB表示は一切なし！そのまま初期画面に戻るか次へ 
    alert(`パラメータが記録されました。(スコア: ${mockScore}点)\nフィードバックなしの条件のため、次のステップへ移行します。`);
    ui.renderSetupPhase();
  } else {
    // 【中β・低】は、事後に数値レンジに基いたLLMの厳格な演出批評（FB）で内省を促します 
    ui.renderFeedbackPhase(mockScore, mockFeedback, () => {
      ui.renderSetupPhase();
    });
  }
}

window.addEventListener('DOMContentLoaded', init);