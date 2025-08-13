const $ = (id) => document.getElementById(id);

// ドロップダウンのスタイルを強制的に修正
window.addEventListener('DOMContentLoaded', () => {
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    select.style.backgroundColor = 'white';
    select.style.color = 'black';
    select.style.border = '1px solid #d1d5db';
    
    // オプション要素のスタイルも設定
    const options = select.querySelectorAll('option');
    options.forEach(option => {
      option.style.backgroundColor = 'white';
      option.style.color = 'black';
    });
    
    const optgroups = select.querySelectorAll('optgroup');
    optgroups.forEach(optgroup => {
      optgroup.style.backgroundColor = 'white';
      optgroup.style.color = 'black';
    });
  });
});

async function apiFetch(path, init) {
  const candidates = [
    '',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ];
  let lastError;
  for (const base of candidates) {
    try {
      const url = base ? `${base}${path}` : path;
      const resp = await fetch(url, init);
      if (resp.status === 404 || resp.status === 0) {
        // try next base
        lastError = new Error(`HTTP ${resp.status}`);
        continue;
      }
      return resp;
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error('API unreachable');
}

async function convert() {
  const input = $('input').value;
  const mode = $('mode').value;
  const diagramType = $('diagramType').value;
  const compat = $('compat').value;
  const resp = await apiFetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, mode, diagramType, compat })
  });
  const data = await resp.json();
  if (data.error) {
    alert(`変換に失敗しました: ${data.error}`);
    return;
  }
  $('plantuml').value = data.plantuml || '';
  const detected = data.diagramType ? `（判定: ${data.diagramType}）` : '';
  $('detectedType').textContent = detected;
  // also show next to preview
  const toJa = (t) => ({
    gantt: 'ガント',
    sequence: 'シーケンス',
    class: 'クラス',
    activity: 'アクティビティ',
    state: 'ステート',
    usecase: 'ユースケース'
  })[t] || t || '';
  $('previewType').textContent = data.diagramType ? `図の種類: ${toJa(data.diagramType)}` : '';
  $('compatBadge').textContent = data.meta && data.meta.compat && data.meta.compat !== 'latest' ? '互換: レガシー' : '';
  const warns = (data.warnings || []).map(w => `⚠ ${w}`).join('\n');
  $('warnings').textContent = warns;
  $('meta').textContent = data.meta ? JSON.stringify(data.meta, null, 2) : '';
}

async function renderPreview() {
  const plantuml = $('plantuml').value.trim();
  if (!plantuml) {
    await convert();
  }
  const pu = $('plantuml').value.trim();
  if (!pu) return;
  const resp = await apiFetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plantuml: pu })
  });
  const svg = await resp.text();
  const preview = $('preview');
  if (resp.ok) {
    preview.innerHTML = svg;
    // 注釈ツールがある場合、Canvasをリサイズ
    if (window.annotationTool) {
      setTimeout(() => {
        window.annotationTool.resizeCanvas();
      }, 100);
    }
  } else {
    preview.innerHTML = `<div class="error">プレビュー取得に失敗しました</div>`;
  }
}

function copyCode() {
  const code = $('plantuml').value;
  navigator.clipboard.writeText(code).then(() => {
    alert('コピーしました');
  });
}

function downloadPUML() {
  const code = $('plantuml').value;
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diagram.puml';
  a.click();
  URL.revokeObjectURL(url);
}

// 画像アップロード機能
function initImageUpload() {
  const imageInput = $('imageInput');
  const selectImageBtn = $('selectImageBtn');
  const imageUploadArea = $('imageUploadArea');
  const uploadPrompt = $('uploadPrompt');
  const imagePreview = $('imagePreview');
  const previewImg = $('previewImg');
  const analyzeImageBtn = $('analyzeImageBtn');
  const clearImageBtn = $('clearImageBtn');
  const analysisProgress = $('analysisProgress');
  const progressDetails = $('progressDetails');
  
  let currentImageData = null;
  let imageAnalyzer = null;
  
  // 画像選択ボタンのクリック
  selectImageBtn.addEventListener('click', () => {
    imageInput.click();
  });
  
  // ファイル選択時の処理
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageFile(file);
    }
  });
  
  // ドラッグ&ドロップの処理
  imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = '#6366f1';
    imageUploadArea.style.background = 'rgba(99, 102, 241, 0.05)';
  });
  
  imageUploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = '#cbd5e1';
    imageUploadArea.style.background = 'rgba(248, 250, 252, 0.5)';
  });
  
  imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = '#cbd5e1';
    imageUploadArea.style.background = 'rgba(248, 250, 252, 0.5)';
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageFile(files[0]);
    }
  });
  
  // 画像ファイルの処理
  function handleImageFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      currentImageData = e.target.result;
      previewImg.src = currentImageData;
      uploadPrompt.style.display = 'none';
      imagePreview.style.display = 'block';
      analysisProgress.style.display = 'none';
    };
    
    reader.readAsDataURL(file);
  }
  
  // 画像解析ボタンのクリック
  analyzeImageBtn.addEventListener('click', async () => {
    if (!currentImageData) return;
    
    analysisProgress.style.display = 'block';
    analyzeImageBtn.disabled = true;
    
    try {
      // サーバーサイドとクライアントサイドの両方で解析
      await Promise.all([
        analyzeWithServer(),
        analyzeWithClient()
      ]);
    } catch (error) {
      console.error('画像解析エラー:', error);
      alert('画像解析に失敗しました: ' + error.message);
    } finally {
      analysisProgress.style.display = 'none';
      analyzeImageBtn.disabled = false;
    }
  });
  
  // サーバーサイドでの解析
  async function analyzeWithServer() {
    try {
      // Base64データをBlobに変換
      const base64Data = currentImageData.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      // FormDataを作成
      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');
      
      // サーバーに送信
      const response = await apiFetch('/api/analyze-image', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 提案されたテキストを入力欄に設定
        $('input').value = result.suggestedText;
        $('diagramType').value = result.detectedType;
        
        // 自動的に変換とプレビュー
        await convert();
        await renderPreview();
      }
    } catch (error) {
      console.error('サーバー解析エラー:', error);
    }
  }
  
  // クライアントサイドでの解析（OCR）
  async function analyzeWithClient() {
    try {
      if (!imageAnalyzer) {
        imageAnalyzer = new ImageAnalyzer();
      }
      
      progressDetails.textContent = 'OCRエンジンを初期化中...';
      
      const result = await imageAnalyzer.analyzeImage(
        currentImageData,
        (progress) => {
          progressDetails.textContent = progress;
        }
      );
      
      // OCRで認識したテキストがある場合は追加
      if (result.recognizedText && result.recognizedText.trim()) {
        const currentText = $('input').value;
        const ocrNote = '\n\n--- OCR認識テキスト ---\n' + result.recognizedText;
        
        // 既存のテキストにOCR結果を追加
        if (currentText && !currentText.includes('--- OCR認識テキスト ---')) {
          $('input').value = currentText + ocrNote;
        }
      }
      
      // 信頼度が低い場合は警告
      if (result.confidence < 70) {
        const warningText = '\n⚠️ OCRの認識精度が低い可能性があります。手動で修正してください。';
        if (!$('input').value.includes(warningText)) {
          $('input').value += warningText;
        }
      }
    } catch (error) {
      console.error('クライアント解析エラー:', error);
    }
  }
  
  // クリアボタンのクリック
  clearImageBtn.addEventListener('click', () => {
    currentImageData = null;
    imageInput.value = '';
    uploadPrompt.style.display = 'block';
    imagePreview.style.display = 'none';
    previewImg.src = '';
    
    // ImageAnalyzerのクリーンアップ
    if (imageAnalyzer) {
      imageAnalyzer.cleanup();
      imageAnalyzer = null;
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // 画像アップロード機能の初期化
  initImageUpload();
  
  $('btnConvert').addEventListener('click', convert);
  $('btnRender').addEventListener('click', renderPreview);
  // auto preview after conversion
  // Removed the setTimeout call as it's not necessary with the direct call to renderPreview in the convert function
  $('btnCopy').addEventListener('click', copyCode);
  $('btnDownload').addEventListener('click', downloadPUML);

  // 注釈機能の初期化
  let annotationTool = null;
  let annotationEnabled = false;
  
  // 注釈モード切替
  const toggleAnnotationBtn = $('toggleAnnotation');
  if (toggleAnnotationBtn) {
    toggleAnnotationBtn.addEventListener('click', () => {
      annotationEnabled = !annotationEnabled;
      const toolbar = $('annotationToolbar');
      
      if (annotationEnabled) {
        // 注釈モードON
        if (!annotationTool) {
          annotationTool = new AnnotationTool($('preview'));
          window.annotationTool = annotationTool;
        }
        annotationTool.toggle(true);
        toolbar.style.display = 'block';
        toggleAnnotationBtn.textContent = '📝 注釈モードOFF';
        toggleAnnotationBtn.style.background = '#ef4444';
      } else {
        // 注釈モードOFF
        if (annotationTool) {
          annotationTool.toggle(false);
        }
        toolbar.style.display = 'none';
        toggleAnnotationBtn.textContent = '📝 注釈モードON';
        toggleAnnotationBtn.style.background = '#3b82f6';
      }
    });
  }
  
  // ツールボタンの設定
  const toolButtons = document.querySelectorAll('.tool-btn');
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!annotationTool) return;
      
      // アクティブクラスの切り替え
      toolButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // ツールの設定
      const tool = btn.dataset.tool;
      annotationTool.setTool(tool);
    });
  });
  
  // 初期選択（ペン）
  const penBtn = document.querySelector('.tool-btn[data-tool="pen"]');
  if (penBtn) penBtn.classList.add('active');
  
  // 色変更
  const colorInput = $('annotationColor');
  if (colorInput) {
    colorInput.addEventListener('change', (e) => {
      if (annotationTool) {
        annotationTool.setColor(e.target.value);
      }
    });
  }
  
  // 線の太さ変更
  const strokeWidthInput = $('strokeWidth');
  const strokeWidthValue = $('strokeWidthValue');
  if (strokeWidthInput) {
    strokeWidthInput.addEventListener('input', (e) => {
      const width = e.target.value;
      strokeWidthValue.textContent = width;
      if (annotationTool) {
        annotationTool.setStrokeWidth(parseInt(width));
      }
    });
  }
  
  // 元に戻す
  const undoBtn = $('undoBtn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (annotationTool) {
        annotationTool.undo();
      }
    });
  }
  
  // 全消去
  const clearBtn = $('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (annotationTool && confirm('すべての注釈を消去しますか？')) {
        annotationTool.clear();
      }
    });
  }
  
  // 注釈を保存
  const saveBtn = $('saveAnnotation');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (!annotationTool) return;
      
      const data = annotationTool.getAnnotations();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'annotations.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  
  // 注釈を読込
  const loadBtn = $('loadAnnotation');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      if (!annotationTool) return;
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            annotationTool.loadAnnotations(e.target.result);
          };
          reader.readAsText(file);
        }
      };
      input.click();
    });
  }
  
  // 画像でエクスポート
  const exportBtn = $('exportAnnotation');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (annotationTool) {
        annotationTool.exportImage();
      }
    });
  }

  // theme toggle
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  const toggle = $('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('theme');
        toggle.textContent = '🌙';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        toggle.textContent = '☀️';
      }
    });
    // initial icon
    toggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
  }

  // samples
  const samples = {
    'gantt-semi': {
      mode: 'semi', type: 'gantt', text: `プロジェクト名: EC刷新プロジェクト\n開始日: 2025-06-15\n部門: EC基盤\nタスク: 見積作成（メール）; 2025/06/16 〜 2025/06/20; 担当: 田中; 進捗: 60%\nタスク: 注文作成; 2025/07/01 〜 2025/07/05; 担当: 佐藤; 依存: 見積回答（メール）\n部門: キナバル\nタスク: 見積回答（メール）; 2025/06/21 〜 2025/06/30; 担当: 鈴木\nタスク: 注文確認; 2025/07/06 〜 2025/07/10; 依存: 注文作成\n部門: 経理\nタスク: 支払い確認; 2025/07/21 〜 2025/07/25; 担当: 高橋; 依存: 支払い処理`
    },
    'gantt-free': {
      mode: 'free', type: 'gantt', text: `要件定義 2025-06-15〜2025-06-30\n設計 2025-07-01〜2025-07-15\n実装 2025-07-16〜2025-08-20\nテスト 2025-08-21〜2025-09-05`
    },
    'seq-semi': {
      mode: 'semi', type: 'sequence', text: `参加者: ユーザー, システム\nメッセージ: ユーザー -> システム: ログイン要求\nメッセージ: システム -> ユーザー: 認証結果`
    },
    'seq-free': {
      mode: 'free', type: 'sequence', text: `ログイン情報を送信（ユーザー）\nログイン結果を受信（ユーザー）`
    },
    'class-semi': {
      mode: 'semi', type: 'class', text: `クラス: User { id:int; name:string }\nクラス: Order { id:int; total:int }\n関連: User --> Order : places`
    },
    'class-free': {
      mode: 'free', type: 'class', text: `UserはOrderを作成する\nUserはOrderを参照する`
    },
    'act-semi': {
      mode: 'semi', type: 'activity', text: `開始\nアクティビティ: ログイン画面を表示\nアクティビティ: ID/Pass入力\n分岐: 認証OK -> マイページ表示 / 認証NG -> エラー表示\n終了`
    },
    'act-free': {
      mode: 'free', type: 'activity', text: `ログイン画面を開く\n認証情報を入力\nログインボタンを押下\nマイページを開く`
    },
    'state-semi': {
      mode: 'semi', type: 'state', text: `状態: 初期\n遷移: 初期 -> 認証中 : ログイン\n遷移: 認証中 -> 完了 : 成功\n状態: 完了`
    },
    'state-free': {
      mode: 'free', type: 'state', text: `初期から認証中へ遷移(ログイン)\n認証中から完了へ遷移(成功)`
    },
    'uc-semi': {
      mode: 'semi', type: 'usecase', text: `アクター: ユーザー, 管理者\nユースケース: ログイン\n関係: ユーザー -> ログイン`
    },
    'uc-free': {
      mode: 'free', type: 'usecase', text: `ユーザーはログインを行う\n管理者はレポート出力を行う`
    }
  };

  const sampleSelect = $('sampleSelect');
  if (sampleSelect) {
    sampleSelect.addEventListener('change', () => {
      const key = sampleSelect.value;
      if (!key || !samples[key]) return;
      const s = samples[key];
      $('input').value = s.text;
      $('mode').value = s.mode;
      $('diagramType').value = s.type;
      // 自動で変換してプレビュー
      convert().then(() => renderPreview());
    });
  }
});
