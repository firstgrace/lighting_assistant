export class AppUI {
  constructor(onParamChange, onStart, onSubmit) {
    this.container = document.getElementById('ui-layer');
    this.onParamChange = onParamChange;
    this.onStart = onStart;
    this.onSubmit = onSubmit;
  }

  // フェーズ1：お題カードと障壁レベル選択（選択・設定フェーズ） 
  renderSetupPhase() {
    this.container.innerHTML = `
      <div class="m-auto max-w-xl bg-appPanel/95 p-8 rounded-xl shadow-2xl border border-slate-700 pointer-events-auto flex flex-col gap-6">
        <h1 class="text-2xl font-bold text-center text-appAccent">照明操作支援アプリ 実験設定</h1>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-slate-300">① 実験条件（技術的障壁レベル）</label>
          <select id="barrier-select" class="w-full bg-slate-900 border border-slate-600 rounded p-2 text-slate-100">
            <option value="high">高障壁 (ヒント❌ / FB❌)</option>
            <option value="midAlpha">中障壁α (ヒント⭕ / FB❌)</option>
            <option value="midBeta">中障壁β (ヒント❌ / FB⭕)</option>
            <option value="low">低障壁 (ヒント⭕ / FB⭕)</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-slate-300">② 演出意図（お題）</label>
          <div class="grid grid-cols-2 gap-3" id="task-list">
            <button class="task-btn border-2 border-appAccent p-3 rounded text-left bg-slate-900/50" data-task="dread">
              <span class="font-bold block text-appAccent">1. 威圧感・恐怖</span>
              <span class="text-xs text-slate-400">コントラストが強く、光が鋭い状態</span>
            </button>
            <button class="task-btn border border-slate-600 p-3 rounded text-left hover:bg-slate-800" data-task="calm">
              <span class="font-bold block">2. 安らぎ・静寂</span>
              <span class="text-xs text-slate-400">全体が柔らかく、陰影が穏やかな状態</span>
            </button>
          </div>
        </div>

        <button id="start-btn" class="w-full bg-appAccent text-slate-900 font-bold py-3 rounded-lg hover:bg-amber-400 transition-colors">
          実験タスクを開始する
        </button>
      </div>
    `;

    // タスク選択イベントの仕込み
    let selectedTask = 'dread';
    const btns = this.container.querySelectorAll('.task-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        btns.forEach(b => b.classList.remove('border-2', 'border-appAccent'));
        btn.classList.add('border-2', 'border-appAccent');
        selectedTask = btn.dataset.task;
      });
    });

    // 開始ボタンイベント
    document.getElementById('start-btn').addEventListener('click', () => {
      const barrier = document.getElementById('barrier-select').value;
      this.onStart(barrier, selectedTask);
    });
  }

  // フェーズ2：スライダーによる灯体操作（操作フェーズ） 
  renderOperationPhase(barrier, taskName) {
    // 障壁レベルに応じたヒント（中α、低のみ表示） 
    const showHint = (barrier === 'midAlpha' || barrier === 'low');
    const hintHTML = showHint ? `
      <div class="bg-amber-950/80 border border-appAccent/50 p-4 rounded-lg text-sm text-amber-200">
        <span class="font-bold text-appAccent">💡 リアルタイムヒント:</span> 
        お題「${taskName}」を達成するには、スポットライトを鋭く絞り、被写体の真横に近い位置から強い光を当てて、コントラストを強調してみましょう。
      </div>
    ` : '';

    this.container.innerHTML = `
      <div class="w-full max-w-lg pointer-events-auto flex flex-col gap-3">
        <div class="bg-appPanel/90 p-4 rounded-lg border border-slate-700">
          <span class="text-xs text-appAccent font-bold">現在のタスク</span>
          <h2 class="text-lg font-bold">演出意図: ${taskName}</h2>
        </div>
        ${hintHTML}
      </div>

      <div class="absolute right-6 top-6 bottom-6 w-96 bg-appPanel/95 p-6 rounded-xl border border-slate-700 shadow-2xl flex flex-col justify-between overflow-y-auto pointer-events-auto">
        <div class="flex flex-col gap-6">
          <h3 class="text-md font-bold text-appAccent border-b border-slate-700 pb-2">灯体パラメータ操作</h3>
          
          <div class="flex flex-col gap-3">
            <span class="text-sm font-bold text-slate-300">① スポットライト（指向性・硬い光）</span>
            <label class="text-xs text-slate-400">位置 X: <input type="range" id="spot-x" min="-5" max="5" step="0.1" value="3" class="w-full"></label>
            <label class="text-xs text-slate-400">照度: <input type="range" id="spot-int" min="0" max="20" step="0.5" value="5" class="w-full"></label>
            <label class="text-xs text-slate-400">アイリス (絞り値): <input type="range" id="spot-iris" min="5" max="60" step="1" value="30" class="w-full"></label>
          </div>

          <div class="flex flex-col gap-3 pt-4 border-t border-slate-800">
            <span class="text-sm font-bold text-slate-300">② エリアライト（拡散性・柔らかい光）</span>
            <label class="text-xs text-slate-400">位置 X: <input type="range" id="area-x" min="-5" max="5" step="0.1" value="-3" class="w-full"></label>
            <label class="text-xs text-slate-400">照度: <input type="range" id="area-int" min="0" max="20" step="0.5" value="5" class="w-full"></label>
            <label class="text-xs text-slate-400">面積 (幅): <input type="range" id="area-w" min="0.5" max="5" step="0.1" value="2" class="w-full"></label>
          </div>
        </div>

        <button id="submit-btn" class="w-full bg-appAccent text-slate-900 font-bold py-3 rounded-lg hover:bg-amber-400 transition-colors mt-6">
          ライティングを決定する
        </button>
      </div>
    `;

    // スライダーの入力値を検知して、リアルタイムにThree.js側へ伝えるスパイス
    const setupSlider = (id, lightType, paramName) => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.onParamChange(lightType, { [paramName]: parseFloat(e.target.value) });
      });
    };

    setupSlider('spot-x', 'spot', 'x');
    setupSlider('spot-int', 'spot', 'intensity');
    setupSlider('spot-iris', 'spot', 'iris');
    setupSlider('area-x', 'area', 'x');
    setupSlider('area-int', 'area', 'intensity');
    setupSlider('area-w', 'area', 'width');

    // 決定ボタンのイベント発火 
    document.getElementById('submit-btn').addEventListener('click', () => this.onSubmit());
  }

  // フェーズ4：評価結果の表示（フィードバックフェーズ、中β・低のみ） [cite: 2, 4, 142]
  renderFeedbackPhase(score, feedbackText, onNext) {
    this.container.innerHTML = `
      <div class="m-auto max-w-2xl bg-appPanel/95 p-8 rounded-xl shadow-2xl border border-slate-700 pointer-events-auto flex flex-col gap-6">
        <h2 class="text-xl font-bold text-center text-appAccent border-b border-slate-700 pb-2">数理レンジ判定＆LLM演出批評結果</h2>
        
        <div class="flex items-center justify-around bg-slate-900/50 p-4 rounded-lg">
          <div class="text-center">
            <span class="text-xs text-slate-400 block mb-1">総合スコア</span>
            <span class="text-4xl font-extrabold text-appAccent">${score} <span class="text-lg font-normal text-slate-400">/ 100 点</span></span>
          </div>
          <div class="text-center">
            <span class="text-xs text-slate-400 block mb-1">判定</span>
            <span class="text-2xl font-bold ${score >= 70 ? 'text-green-400' : 'text-amber-500'}">
              ${score >= 70 ? '合格 (PASS)' : '不合格 (RETRY)'}
            </span>
          </div>
        </div>

        <div class="bg-slate-900/80 p-5 rounded-lg border border-slate-800 flex flex-col gap-3">
          <span class="text-xs font-bold text-appAccent block">批評家AIによるフィードバック</span>
          <p class="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">${feedbackText}</p>
        </div>

        <button id="next-btn" class="w-full bg-slate-700 text-slate-100 font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors">
          次のタスクへ進む
        </button>
      </div>
    `;

    document.getElementById('next-btn').addEventListener('click', onNext);
  }
}