# インライン編集機能 実装計画（AI行動憲法準拠版）

**作成日**: 2025年8月18日 03:20  
**実装方式**: AI行動憲法に完全準拠  
**目標**: 動作する最小限の機能から段階的に構築

---

## 🎯 実装目標（明確な定義）

### 最終目標
**7要素アクション構造を持つインライン編集UI**が実際に動作すること

### 7要素の定義
1. **ドラッグハンドル** - 順序変更用のつまみ
2. **アクター（FROM）** - 送信元の選択
3. **矢印タイプ** - メッセージの種類
4. **アクター（TO）** - 送信先の選択  
5. **メッセージ** - 送信内容の入力
6. **削除ボタン** - アクション削除
7. **条件ボタン** - 条件追加

---

## 📋 30分単位の実装計画

### Phase 1: 最小限のUI表示（30分）

#### 🎯 目標
- 7要素が画面に表示される（機能なしでOK）
- ブラウザで確認できる

#### 🔧 実装
```html
<!-- inline-edit-minimum.html -->
<!DOCTYPE html>
<html>
<head>
    <title>インライン編集 - 最小実装</title>
    <style>
        .action-item {
            display: flex;
            gap: 10px;
            padding: 10px;
            border: 1px solid #ccc;
            margin: 10px;
        }
        .drag-handle { cursor: move; }
        .delete-btn { color: red; cursor: pointer; }
        .condition-btn { color: blue; cursor: pointer; }
    </style>
</head>
<body>
    <h1>インライン編集 - Phase 1</h1>
    <div class="action-item">
        <span class="drag-handle">☰</span>
        <select class="actor-from">
            <option>Alice</option>
            <option>Bob</option>
        </select>
        <select class="arrow-type">
            <option>→</option>
            <option>--></option>
        </select>
        <select class="actor-to">
            <option>Bob</option>
            <option>Alice</option>
        </select>
        <input type="text" class="message" placeholder="メッセージ">
        <button class="delete-btn">削除</button>
        <button class="condition-btn">条件</button>
    </div>
</body>
</html>
```

#### ✅/❌ 確認方法
1. ファイルをブラウザで開く
2. 7要素が表示されるか確認
3. スクリーンショットを撮る

---

### Phase 2: 削除ボタンの動作（30分）

#### 🎯 目標
- 削除ボタンをクリックしたらアクション項目が消える

#### 🔧 実装
```javascript
// 削除機能を追加
document.querySelector('.delete-btn').addEventListener('click', (e) => {
    if (confirm('削除しますか？')) {
        e.target.closest('.action-item').remove();
        console.log('✅ アクション削除成功');
    }
});
```

#### ✅/❌ 確認方法
1. 削除ボタンをクリック
2. 確認ダイアログが表示される
3. OKで項目が消える
4. 動作を録画

---

### Phase 3: 追加ボタンの実装（30分）

#### 🎯 目標
- 「アクション追加」ボタンで新しい行を追加

#### 🔧 実装
```javascript
function addAction() {
    const container = document.getElementById('actions-container');
    const newAction = createActionElement();
    container.appendChild(newAction);
    console.log('✅ アクション追加成功');
}
```

#### ✅/❌ 確認方法
1. 追加ボタンをクリック
2. 新しい行が表示される
3. 削除も動作する
4. スクリーンショット

---

### Phase 4: データの取得（30分）

#### 🎯 目標
- 入力された値を取得してコンソールに表示

#### 🔧 実装
```javascript
function getActionData(element) {
    return {
        from: element.querySelector('.actor-from').value,
        arrow: element.querySelector('.arrow-type').value,
        to: element.querySelector('.actor-to').value,
        message: element.querySelector('.message').value
    };
}
```

#### ✅/❌ 確認方法
1. 値を入力
2. 「データ取得」ボタンクリック
3. コンソールに表示
4. スクリーンショット

---

### Phase 5: PlantUML変換（30分）

#### 🎯 目標
- データをPlantUML形式に変換

#### 🔧 実装
```javascript
function toPlantUML(actions) {
    let uml = '@startuml\n';
    actions.forEach(action => {
        uml += `${action.from} ${action.arrow} ${action.to}: ${action.message}\n`;
    });
    uml += '@enduml';
    return uml;
}
```

#### ✅/❌ 確認方法
1. アクションを入力
2. 「PlantUML変換」ボタン
3. 結果が表示される
4. 動作を録画

---

### Phase 6: index.htmlへの統合（30分）

#### 🎯 目標
- 既存のindex.htmlに組み込む

#### 🔧 実装
- 既存ファイルにコンポーネント追加
- スタイル調整
- イベント連携

#### ✅/❌ 確認方法
1. http://localhost:8086 で確認
2. 統合された画面
3. 既存機能も動作
4. スクリーンショット

---

## 📊 成功基準

### 各フェーズの完了条件

| Phase | 機能 | 確認方法 | 証拠 |
|-------|------|----------|------|
| 1 | UI表示 | ブラウザで7要素確認 | スクリーンショット |
| 2 | 削除 | クリックで消える | 動画 |
| 3 | 追加 | 新しい行が出る | スクリーンショット |
| 4 | データ取得 | コンソール出力 | スクリーンショット |
| 5 | PlantUML変換 | テキスト生成 | 動画 |
| 6 | 統合 | 本番環境で動作 | デモ |

---

## 🚫 やってはいけないこと

1. **Phase 1が動かないのにPhase 2に進む**
2. **エラーが出ているのに「成功」と報告**
3. **30分を超えて作業を続ける**
4. **動作確認せずに次へ進む**
5. **スクリーンショットなしで完了報告**

---

## ✅ 必ずやること

1. **各フェーズ後に必ず動作確認**
2. **エラーが出たら即座に報告**
3. **30分で区切って進捗報告**
4. **スクリーンショットか動画を撮る**
5. **ユーザーに確認を求める**

---

## 📝 進捗報告テンプレート

```markdown
## Phase X 完了報告

### 🎯 目標
[実装予定だった機能]

### 🔧 実装内容
[実際に書いたコード]

### ✅/❌ 結果
- 動作: [✅ 動作確認/❌ エラー]
- 証拠: [スクリーンショット/動画]
- 問題: [あれば記載]

### 次のステップ
- [ ] ユーザー確認待ち
- [ ] 次のPhaseへ進む
- [ ] 問題の修正
```

---

## 🎬 開始方法

1. **この計画をユーザーに確認**
2. **承認を得たらPhase 1から開始**
3. **30分ごとに必ず報告**
4. **動かないものは「未完了」**
5. **正直に、透明に、段階的に**

---

**これがAI行動憲法に準拠した実装方法です。**

虚偽なし、誇張なし、動作確認必須。

準備ができたら、Phase 1から始めます。