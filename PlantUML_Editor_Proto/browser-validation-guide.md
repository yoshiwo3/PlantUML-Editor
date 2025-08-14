# PlantUML エディター ブラウザ検証手順書

**作成日:** 2025-08-14 05:06:00  
**対象:** 修正されたapp.jsのキャッシュ対策と動作検証  
**目的:** 手動でのブラウザ検証手順とトラブルシューティング方法を文書化

---

## 📋 検証概要

### 検証対象
- **キャッシュバスティング対策**: `app.js?v=20250814050600` によるキャッシュクリア
- **getCurrentActorsメソッド**: 修正されたメソッドの正常動作
- **ループダイアログ機能**: ループ処理UI の動作確認
- **並列処理ダイアログ機能**: 並列処理UI の動作確認
- **エラーログ監視**: JavaScript エラーの検出

---

## 🚀 事前準備

### 1. 環境確認
```bash
# 現在のディレクトリを確認
pwd
# 出力例: C:\d\PlantUML\PlantUML_Editor_Proto

# ファイルの存在確認
ls -la index.html
ls -la app.js
ls -la test-validation.html
```

### 2. ローカルサーバー起動
```bash
# HTTP サーバーを起動（ポート8080）
python -m http.server 8080

# または Node.js の場合
npx http-server -p 8080

# または他のポートを使用
python -m http.server 3000
```

### 3. アクセスURL確認
- **メインアプリ**: http://localhost:8080/index.html
- **検証ページ**: http://localhost:8080/test-validation.html

---

## 🔍 手動検証手順

### Phase 1: キャッシュバスティング確認

#### 1.1 ネットワークタブでの確認
1. **ブラウザを開く** (Chrome, Firefox, Edge)
2. **F12** でデベロッパーツールを開く
3. **Network タブ** を選択
4. **キャッシュを無効化** (`Disable cache` にチェック)
5. **アプリケーションにアクセス**: http://localhost:8080/index.html
6. **app.js のリクエストを確認**:
   - ✅ `app.js?v=20250814050600` が表示される
   - ✅ ステータスコードが `200 OK`
   - ✅ キャッシュではなく新規リクエストであること

#### 1.2 ハードリロードテスト
1. **Ctrl + Shift + R** (ハードリロード)実行
2. ネットワークタブで `app.js?v=` パラメータ付きリクエストを再確認
3. アプリケーションが正常に動作することを確認

#### 1.3 キャッシュクリアテスト
1. **F12** → **Application** タブ
2. **Storage** → **Clear storage** → **Clear site data**
3. ページを再読み込み
4. アプリケーションが正常に読み込まれることを確認

---

### Phase 2: getCurrentActorsメソッド検証

#### 2.1 コンソールでの直接テスト
1. **F12** → **Console** タブ
2. 以下のスクリプトを実行:

```javascript
// エディターインスタンスを探す
let editor = null;
if (window.plantUMLEditor) {
    editor = window.plantUMLEditor;
    console.log('✅ plantUMLEditor インスタンス発見');
} else if (window.app) {
    editor = window.app;
    console.log('✅ app インスタンス発見');
} else {
    // グローバルスコープを検索
    for (let prop in window) {
        if (window[prop] && typeof window[prop] === 'object' && 
            typeof window[prop].getCurrentActors === 'function') {
            editor = window[prop];
            console.log(`✅ ${prop} インスタンス発見`);
            break;
        }
    }
}

if (!editor) {
    console.error('❌ エディターインスタンスが見つかりません');
} else {
    console.log('📝 エディターインスタンス:', editor);
}
```

#### 2.2 getCurrentActorsメソッドテスト
```javascript
// メソッドの存在確認
if (editor && typeof editor.getCurrentActors === 'function') {
    console.log('✅ getCurrentActorsメソッドが存在します');
    
    // メソッド実行
    try {
        const actors = editor.getCurrentActors();
        console.log('🎭 取得されたアクター:', actors);
        console.log('📊 アクター数:', Array.isArray(actors) ? actors.length : actors.size || 0);
        console.log('📝 アクターリスト:', Array.isArray(actors) ? actors : Array.from(actors || []));
    } catch (error) {
        console.error('❌ getCurrentActorsメソッド実行エラー:', error);
    }
} else {
    console.error('❌ getCurrentActorsメソッドが存在しません');
}
```

#### 2.3 UI連携テスト
1. **アクターボタンをクリック**:
   - 「顧客」ボタンをクリック
   - 「ECサイト」ボタンをクリック
2. **コンソールでアクター状態確認**:
```javascript
// UI更新後のアクター状態確認
const actors = editor.getCurrentActors();
console.log('🔄 UI更新後のアクター:', Array.from(actors || []));

// UIに反映されているかチェック
const actorChips = document.querySelectorAll('.actor-chips .actor-chip');
console.log('🏷️ UI上のアクターチップ数:', actorChips.length);
actorChips.forEach((chip, index) => {
    console.log(`  ${index + 1}. ${chip.textContent.replace('×', '').trim()}`);
});
```

---

### Phase 3: ループダイアログ機能検証

#### 3.1 基本動作確認
1. **ループタブをクリック** (`🔁 ループ` ボタン)
2. **ループビルダーの表示確認**:
   - ✅ `#loop-builder` が表示される
   - ✅ 他のビルダーが非表示になる
   - ✅ ループ条件入力フィールドが表示される

#### 3.2 ループ作成テスト
1. **ループ条件を入力**: 「全商品を処理するまで」
2. **ループ内アクション追加**:
   - `➕ アクション追加` ボタンをクリック
   - モーダルまたは入力フィールドの動作確認
3. **ループ追加実行**:
   - `✅ ループを追加` ボタンをクリック

#### 3.3 PlantUMLコード確認
```javascript
// コードエディターの内容確認
const codeEditor = document.getElementById('plantuml-code');
const code = codeEditor.value;
console.log('🔍 生成されたPlantUMLコード:');
console.log(code);

// ループコードが含まれているかチェック
if (code.includes('loop')) {
    console.log('✅ ループコードが正しく生成されています');
    if (code.includes('全商品を処理するまで')) {
        console.log('✅ ループ条件も正しく反映されています');
    }
} else {
    console.error('❌ ループコードが生成されていません');
}
```

---

### Phase 4: 並列処理ダイアログ機能検証

#### 4.1 基本動作確認
1. **並列処理タブをクリック** (`⚡ 並列処理` ボタン)
2. **並列処理ビルダーの表示確認**:
   - ✅ `#parallel-builder` が表示される
   - ✅ 並列処理ブランチ（デフォルト2つ）が表示される

#### 4.2 並列処理作成テスト
1. **事前準備**: アクターを2つ以上選択
2. **並列処理ブランチでアクション追加**:
   - ブランチ1で `➕ アクション追加` をクリック
   - ブランチ2で `➕ アクション追加` をクリック
3. **追加ブランチテスト**:
   - `➕ 並列処理を追加` ボタンをクリック
   - ブランチが増加することを確認

#### 4.3 並列処理追加実行
1. **並列処理追加**: `✅ 並列処理を追加` ボタンをクリック
2. **PlantUMLコード確認**:
```javascript
const code = document.getElementById('plantuml-code').value;
console.log('⚡ 並列処理コード確認:');
console.log(code);

if (code.includes('par') && code.includes('else')) {
    console.log('✅ 並列処理コード（par/else）が正しく生成されています');
} else {
    console.error('❌ 並列処理コードが正しく生成されていません');
}
```

---

### Phase 5: エラーログ監視

#### 5.1 自動エラー監視セットアップ
```javascript
// エラー監視設定
const errors = [];
const warnings = [];

// コンソールエラーをキャプチャ
const originalError = console.error;
const originalWarn = console.warn;

console.error = function(...args) {
    errors.push({
        type: 'error',
        message: args.join(' '),
        timestamp: new Date().toISOString()
    });
    originalError.apply(console, args);
};

console.warn = function(...args) {
    warnings.push({
        type: 'warning',
        message: args.join(' '),
        timestamp: new Date().toISOString()
    });
    originalWarn.apply(console, args);
};

// ページエラーをキャプチャ
window.addEventListener('error', (event) => {
    errors.push({
        type: 'page-error',
        message: event.error ? event.error.message : event.message,
        filename: event.filename,
        lineno: event.lineno,
        timestamp: new Date().toISOString()
    });
});

console.log('🚨 エラー監視を開始しました');
```

#### 5.2 エラーレポート表示
```javascript
// エラーレポート生成
function generateErrorReport() {
    console.log('📊 エラーレポート:');
    console.log(`🚨 エラー数: ${errors.length}`);
    console.log(`⚠️ 警告数: ${warnings.length}`);
    
    if (errors.length > 0) {
        console.log('\n🚨 検出されたエラー:');
        errors.forEach((error, index) => {
            console.log(`${index + 1}. [${error.type}] ${error.message}`);
        });
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️ 検出された警告:');
        warnings.forEach((warning, index) => {
            console.log(`${index + 1}. [${warning.type}] ${warning.message}`);
        });
    }
    
    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ エラーや警告は検出されませんでした');
    }
}

// 5分後にレポート実行（または手動実行）
setTimeout(generateErrorReport, 300000);
console.log('⏰ 5分後に自動レポートを生成します（手動実行: generateErrorReport()）');
```

---

## 🔧 トラブルシューティング

### 問題1: getCurrentActorsメソッドが見つからない

**症状**: `TypeError: editor.getCurrentActors is not a function`

**解決手順**:
1. **app.js の読み込み確認**:
```javascript
// スクリプトタグの確認
const appScript = document.querySelector('script[src*="app.js"]');
console.log('App.js スクリプトタグ:', appScript);
console.log('Src属性:', appScript?.src);
```

2. **PlantUMLEditor クラスの確認**:
```javascript
// クラス定義の確認
console.log('PlantUMLEditor クラス:', window.PlantUMLEditor);
console.log('プロトタイプメソッド:', Object.getOwnPropertyNames(PlantUMLEditor.prototype));
```

3. **インスタンス化の確認**:
```javascript
// DOMContentLoaded イベント後にインスタンスを確認
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🔍 遅延チェック - エディターインスタンス:');
        console.log('window.plantUMLEditor:', window.plantUMLEditor);
        console.log('window.app:', window.app);
    }, 2000);
});
```

### 問題2: キャッシュが効いてしまう

**症状**: 古いapp.js が読み込まれている

**解決手順**:
1. **ハードリロード**: `Ctrl + Shift + R`
2. **キャッシュクリア**: F12 → Application → Clear storage
3. **プライベートブラウザ**で再テスト
4. **タイムスタンプパラメータ確認**:
```javascript
// 現在のタイムスタンプ確認
const appScript = document.querySelector('script[src*="app.js"]');
console.log('現在のapp.jsパラメータ:', appScript.src);
```

### 問題3: UI更新が反映されない

**症状**: アクター選択後にUIが更新されない

**解決手順**:
1. **イベントリスナー確認**:
```javascript
// アクターボタンのイベントリスナー確認
const actorBtns = document.querySelectorAll('.actor-btn[data-actor]');
actorBtns.forEach(btn => {
    console.log('アクターボタン:', btn.dataset.actor);
    // イベントリスナーの存在確認（簡易）
    btn.click(); // 手動でクリックしてみる
});
```

2. **状態管理の確認**:
```javascript
// selectedActors の状態確認
console.log('選択済みアクター（Set）:', editor.selectedActors);
console.log('選択済みアクター（Array）:', Array.from(editor.selectedActors || []));
```

### 問題4: PlantUMLコードが生成されない

**症状**: コードエディタが空のまま

**解決手順**:
1. **generatePlantUML メソッドの手動実行**:
```javascript
if (editor && typeof editor.generatePlantUML === 'function') {
    editor.generatePlantUML();
    console.log('✅ PlantUMLコード生成を手動実行しました');
} else {
    console.error('❌ generatePlantUMLメソッドが見つかりません');
}
```

2. **actions配列の確認**:
```javascript
console.log('アクション配列:', editor.actions);
console.log('アクション数:', editor.actions?.length || 0);
```

---

## 📋 検証チェックリスト

### ✅ キャッシュバスティング対策
- [ ] app.js にタイムスタンプパラメータが付いている
- [ ] ネットワークタブで新規リクエストが確認できる
- [ ] ハードリロード後も正常に動作する
- [ ] キャッシュクリア後も正常に動作する

### ✅ getCurrentActorsメソッド
- [ ] メソッドが正しく定義されている
- [ ] エディターインスタンスからアクセスできる
- [ ] アクター選択後に正しい値を返す
- [ ] 戻り値の型が適切（Array または Set）

### ✅ ループダイアログ機能
- [ ] ループタブをクリックするとビルダーが表示される
- [ ] ループ条件を入力できる
- [ ] ループ内アクションを追加できる
- [ ] PlantUMLコードにloop構文が生成される

### ✅ 並列処理ダイアログ機能
- [ ] 並列処理タブをクリックするとビルダーが表示される
- [ ] 複数の並列ブランチが表示される
- [ ] 並列ブランチを追加できる
- [ ] PlantUMLコードにpar/else構文が生成される

### ✅ エラー監視
- [ ] JavaScriptエラーが発生していない
- [ ] コンソールエラーが発生していない
- [ ] 重大な警告が発生していない
- [ ] エラー監視スクリプトが正常に動作する

### ✅ 統合テスト
- [ ] アクター選択からコード生成まで一連の操作が正常
- [ ] 複数のダイアログタイプを組み合わせて使用できる
- [ ] UI の応答性が良好（1秒以内の応答）
- [ ] メモリリークが発生していない

---

## 📚 参考資料

### コンソールコマンド集
```javascript
// 1. エディターインスタンス探索
for (let prop in window) {
    if (window[prop] && typeof window[prop] === 'object' && 
        typeof window[prop].getCurrentActors === 'function') {
        console.log(`エディターインスタンス発見: ${prop}`, window[prop]);
    }
}

// 2. DOM要素の存在確認
['#plantuml-code', '.actor-btn', '#loop-builder', '#parallel-builder'].forEach(selector => {
    const element = document.querySelector(selector);
    console.log(`${selector}:`, element ? '存在' : '見つからない');
});

// 3. イベントリスナーのテスト
document.querySelectorAll('.actor-btn[data-actor]').forEach(btn => {
    btn.addEventListener('click', () => {
        console.log(`アクター "${btn.dataset.actor}" がクリックされました`);
    });
});

// 4. パフォーマンス測定
const start = performance.now();
// 何かの操作を実行
const end = performance.now();
console.log(`操作時間: ${end - start} ms`);
```

### よく使用するセレクタ
```javascript
// 主要なDOM要素
const selectors = {
    appContainer: '.app-container',
    actorButtons: '.actor-btn[data-actor]',
    actorChips: '.actor-chips .actor-chip',
    codeEditor: '#plantuml-code',
    loopBuilder: '#loop-builder',
    parallelBuilder: '#parallel-builder',
    actionBuilders: '.action-builder',
    statusBar: '.status-bar'
};

// 存在確認
Object.entries(selectors).forEach(([name, selector]) => {
    const elements = document.querySelectorAll(selector);
    console.log(`${name} (${selector}): ${elements.length}個`);
});
```

---

## 📞 サポート情報

### 問題報告時に含める情報
1. **ブラウザ情報**: Chrome/Firefox/Edge のバージョン
2. **エラーメッセージ**: コンソールの完全なエラーメッセージ
3. **再現手順**: 問題が発生した具体的な操作手順
4. **スクリーンショット**: エラーが表示されている画面
5. **ネットワークログ**: F12 → Network タブの app.js リクエスト情報

### デバッグモード有効化
```javascript
// デバッグモードの有効化
if (window.plantUMLEditor || window.app) {
    const editor = window.plantUMLEditor || window.app;
    editor.debugMode = true;
    console.log('🐛 デバッグモードを有効にしました');
}

// 詳細ログの有効化
window.DEBUG = true;
localStorage.setItem('debug', 'true');
```

---

**最終更新:** 2025-08-14 05:06:00  
**検証対象バージョン:** app.js?v=20250814050600