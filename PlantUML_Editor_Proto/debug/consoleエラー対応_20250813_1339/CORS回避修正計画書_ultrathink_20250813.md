# CORS回避修正計画書 - PlantUML Editor Proto (ultrathink レベル)

## 📋 概要

**文書作成日**: 2025年8月13日  
**問題の本質**: file://プロトコルでのES6モジュール読み込みがCORSポリシーによりブロックされる  
**影響範囲**: アプリケーション全体の動作不能  
**対応方針**: CORSポリシーを回避する実装方式への変更  

## 🔍 現状分析

### エラーの詳細

```
Access to script at 'file:///[path]/[module].js' from origin 'null' has been blocked by CORS policy
```

**影響を受けるモジュール（11個）**:
1. TokenTypes.js
2. ASTTypes.js  
3. PlantUMLASTParser.js
4. IDManager.js
5. ASTToGUIConverter.js
6. RealtimeSyncManager.js
7. DiffCalculator.js
8. CursorStateManager.js
9. ErrorHandler.js
10. PerformanceOptimizer.js
11. ValidationEngine.js

### 根本原因

1. **ES6モジュール（`type="module"`）はCORSポリシーに従う**
2. **file://プロトコルではオリジンが`null`となる**
3. **ブラウザのセキュリティ機能により、モジュール読み込みがブロックされる**

### 現在の実装構造

```html
<!-- index.html の現状 -->
<script type="module" src="TokenTypes.js"></script>
<script type="module" src="ASTTypes.js"></script>
<!-- ... 他のモジュール -->
```

```javascript
// app.js の現状
import('./RealtimeSyncManager.js')  // 動的インポート
```

## 🎯 修正方針（3つのアプローチ）

### アプローチ1: ES6モジュールを通常スクリプトに変換【推奨】

**理由**: 最小限の変更で最大の互換性を確保

#### 実装手順

1. **index.html の修正**
```html
<!-- 変更前 -->
<script type="module" src="TokenTypes.js"></script>

<!-- 変更後 -->
<script src="TokenTypes.js"></script>
```

2. **各モジュールファイルの修正**
```javascript
// 変更前（ES6モジュール）
export class TokenType {
    // ...
}

// 変更後（グローバル変数）
window.TokenType = class TokenType {
    // ...
}
```

3. **app.js の修正**
```javascript
// 変更前
import('./RealtimeSyncManager.js')

// 変更後  
// グローバル変数から直接参照
const RealtimeSyncManager = window.RealtimeSyncManager;
```

#### メリット
- file://プロトコルで直接動作
- HTTPサーバー不要
- 既存の機能を維持

#### デメリット
- グローバル名前空間の汚染
- モジュール性の低下

### アプローチ2: バンドルツールで単一ファイル化

**理由**: モダンな開発手法を維持しつつCORS問題を解決

#### 実装手順

1. **webpack/rollup設定ファイル作成**
```javascript
// webpack.config.js
module.exports = {
    entry: './app.js',
    output: {
        filename: 'bundle.js',
        path: __dirname
    }
};
```

2. **ビルドスクリプト追加**
```json
// package.json
{
    "scripts": {
        "build": "webpack"
    }
}
```

3. **index.html の修正**
```html
<!-- すべてのモジュールを削除 -->
<!-- 単一のバンドルファイルのみ読み込み -->
<script src="bundle.js"></script>
```

#### メリット
- モダンな開発手法を維持
- 最適化とminify可能
- 依存関係の自動解決

#### デメリット
- ビルド手順が必要
- 開発時の複雑性増加

### アプローチ3: インラインスクリプト化

**理由**: 完全にスタンドアロンな単一HTMLファイル

#### 実装手順

1. **すべてのJavaScriptをindex.htmlに統合**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* すべてのCSS */
    </style>
</head>
<body>
    <!-- HTML構造 -->
    <script>
        // すべてのJavaScriptコード
        // TokenTypes
        class TokenType { ... }
        
        // ASTTypes  
        class ASTNode { ... }
        
        // app.js
        class PlantUMLEditor { ... }
    </script>
</body>
</html>
```

#### メリット
- 単一ファイルで完結
- 配布が容易
- CORS問題完全回避

#### デメリット
- ファイルサイズが巨大
- 開発・保守が困難

## 📝 推奨実装計画

### Phase 1: 即座対応（アプローチ1実装）

**作業時間**: 1-2時間

1. **バックアップ作成**
```bash
cp -r PlantUML_Editor_Proto PlantUML_Editor_Proto_backup
```

2. **index.html修正**
   - すべての`type="module"`を削除
   - スクリプト読み込み順序の調整

3. **各モジュールファイル修正**
   - export文をwindowオブジェクトへの代入に変更
   - import文を削除

4. **app.js修正**
   - 動的import文を削除
   - グローバル変数から直接参照

5. **テスト実施**
   - file://プロトコルでの動作確認
   - HTTPサーバーでの動作確認

### Phase 2: 中期対応（起動スクリプト改善）

**作業時間**: 30分

1. **ワンクリック起動スクリプト作成**
```batch
@echo off
echo PlantUML Editor を起動しています...
start "" index.html
```

2. **HTTPサーバー起動オプション追加**
```batch
@echo off
echo HTTPサーバーを起動しています...
python -m http.server 8080
start "" http://localhost:8080
```

### Phase 3: 長期対応（バンドル化）

**作業時間**: 2-3時間

1. **開発環境整備**
   - webpack/rollup導入
   - ビルドパイプライン構築

2. **CI/CD設定**
   - 自動ビルド設定
   - リリース自動化

## 🔧 実装詳細

### 修正対象ファイル一覧

| ファイル | 修正内容 | 優先度 |
|---------|---------|--------|
| index.html | type="module"削除 | 高 |
| TokenTypes.js | export → window | 高 |
| ASTTypes.js | export → window | 高 |
| PlantUMLASTParser.js | export/import修正 | 高 |
| IDManager.js | export → window | 高 |
| ASTToGUIConverter.js | export/import修正 | 高 |
| RealtimeSyncManager.js | export → window | 中 |
| DiffCalculator.js | export → window | 中 |
| CursorStateManager.js | export → window | 中 |
| ErrorHandler.js | export → window | 低 |
| PerformanceOptimizer.js | export → window | 低 |
| ValidationEngine.js | export → window | 低 |
| app.js | import削除 | 高 |

### 依存関係の解決順序

```
1. TokenTypes.js（依存なし）
2. ASTTypes.js（TokenTypesに依存）
3. IDManager.js（依存なし）
4. PlantUMLASTParser.js（TokenTypes, ASTTypesに依存）
5. DiffCalculator.js（依存なし）
6. CursorStateManager.js（依存なし）
7. ASTToGUIConverter.js（ASTTypes, PlantUMLASTParserに依存）
8. RealtimeSyncManager.js（複数に依存）
9. ErrorHandler.js（依存なし）
10. PerformanceOptimizer.js（依存なし）
11. ValidationEngine.js（ASTTypesに依存）
```

## ⚠️ リスクと対策

### リスク1: グローバル名前空間の汚染
**対策**: 名前空間オブジェクトで包含
```javascript
window.PlantUMLModules = {
    TokenType: class { ... },
    ASTNode: class { ... }
};
```

### リスク2: 読み込み順序の依存関係
**対策**: 依存関係に基づいた正しい順序でスクリプトタグを配置

### リスク3: 既存機能への影響
**対策**: 段階的な移行とテスト実施

## 📊 成功基準

1. **file://プロトコルでエラーなく起動**
2. **すべての基本機能が正常動作**
3. **HTTPサーバー環境でも動作維持**
4. **パフォーマンス劣化なし**

## 🚀 実行コマンド

### テスト用HTTPサーバー起動
```bash
# Python
python -m http.server 8080

# Node.js
npx http-server -p 8080

# PHP
php -S localhost:8080
```

### 動作確認
1. file://でindex.htmlを開く → エラーなし
2. http://localhost:8080 でアクセス → 正常動作
3. 各機能テスト実施

## 📝 注意事項

- **必ずバックアップを作成してから作業開始**
- **段階的に修正し、都度動作確認**
- **元のES6モジュール版も保持（将来の移行に備えて）**

## 🔄 フォローアップ

1. 修正実装後、開発経緯レポートに結果を記録
2. ユーザーマニュアルにfile://での起動方法を追記
3. 長期的にはPWA化やElectronアプリ化を検討

---

**計画書作成者**: Claude Code Assistant  
**レビュー状態**: 未実施  
**承認状態**: 承認待ち