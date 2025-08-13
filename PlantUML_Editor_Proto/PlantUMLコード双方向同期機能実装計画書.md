# PlantUMLコード双方向同期機能 詳細実装計画書

## 📋 エグゼクティブサマリー

### プロジェクト概要
- **プロジェクト名**: PlantUML Editor Proto - 双方向同期機能強化
- **目的**: PlantUMLコードの直接編集と左サイドメニューの処理フローの完全な同期を実現
- **期間**: 4週間（2025年8月12日 - 2025年9月8日）
- **優先度**: 高
- **影響範囲**: エディタコア機能

### 現状の課題
1. PlantUMLコードを直接編集すると、左サイドメニューの処理フローがクリアされる
2. 複雑な構造（loop, alt, par）の解析が不完全
3. GUI→PlantUMLは機能するが、PlantUML→GUIの同期が不完全

### 期待される成果
1. 完全な双方向同期の実現
2. リアルタイムでの同期更新
3. 既存機能への影響を最小限に抑えた実装
4. ユーザビリティの大幅な向上

---

## 🎯 技術仕様

### アーキテクチャ概要

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  PlantUML Code   │────▶│   AST Parser     │────▶│  GUI Converter   │
│    (テキスト)     │     │  (構文解析器)     │     │   (変換器)       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         ▲                                                    │
         │                                                    ▼
         │              ┌──────────────────┐     ┌──────────────────┐
         └──────────────│  Code Generator  │◀────│   Action List    │
                        │  (コード生成器)    │     │  (処理リスト)     │
                        └──────────────────┘     └──────────────────┘
```

### 主要コンポーネント

1. **AST Parser**: PlantUMLコードを抽象構文木に変換
2. **GUI Converter**: ASTからGUIデータ構造への変換
3. **Sync Manager**: リアルタイム同期の管理
4. **Diff Calculator**: 差分計算による効率的な更新
5. **State Preserver**: カーソル位置・スクロール位置の保持

---

## 📊 リスク分析と対策

### 技術的リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存機能の破壊 | 高 | 中 | 段階的実装とテスト自動化 |
| パフォーマンス劣化 | 中 | 中 | 差分更新とデバウンス処理 |
| ID管理の不整合 | 高 | 低 | ID保持システムの実装 |
| メモリリーク | 中 | 低 | WeakMapとAbortController使用 |
| レンダリング競合 | 中 | 中 | キューイングシステム実装 |

### ビジネスリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ユーザー混乱 | 中 | 低 | 段階的ロールアウト |
| 下位互換性の喪失 | 高 | 低 | 既存APIの維持 |
| 学習コストの増加 | 低 | 低 | 直感的なUI設計 |

---

## 🚀 実装フェーズ

### Phase 1: 基盤整備（Week 1: 8/12-8/18）

#### 1.1 AST Parser基本実装

```javascript
// PlantUMLASTParser.js
class PlantUMLASTParser {
    constructor() {
        this.initializeTokenTypes();
        this.initializeStateMachine();
    }
    
    parse(code) {
        // トークン化
        const tokens = this.tokenize(code);
        // AST構築
        return this.buildAST(tokens);
    }
}
```

**成果物**:
- `PlantUMLASTParser.js` - ASTパーサー本体
- `ASTTypes.js` - AST型定義
- `TokenTypes.js` - トークン型定義

**テスト項目**:
- 基本的なメッセージのパース
- アクター定義のパース
- エラーハンドリング

#### 1.2 既存コードの拡張準備

```javascript
// app.js の拡張
class PlantUMLApp {
    constructor() {
        // 既存の初期化処理
        this.initializeSyncManager(); // 新規追加
    }
    
    initializeSyncManager() {
        this.syncManager = new SafePlantUMLSync(this);
    }
}
```

**成果物**:
- 既存コードのリファクタリング
- インターフェース定義
- 依存性注入の準備

### Phase 2: コア機能実装（Week 2: 8/19-8/25）

#### 2.1 複雑構造のパース実装

```javascript
// 複雑構造のパース
parseLoop(tokens, startIndex) {
    const node = {
        type: 'loop',
        condition: '',
        body: [],
        startLine: startIndex
    };
    
    // ループ本体の解析
    const endIndex = this.findMatchingEnd(tokens, startIndex);
    node.body = this.parseBlock(tokens, startIndex + 1, endIndex - 1);
    
    return node;
}

parseAlt(tokens, startIndex) {
    const node = {
        type: 'alt',
        branches: [],
        startLine: startIndex
    };
    
    // 分岐の解析
    const branches = this.splitBranches(tokens, startIndex);
    node.branches = branches.map(b => this.parseBranch(b));
    
    return node;
}

parsePar(tokens, startIndex) {
    const node = {
        type: 'par',
        threads: [],
        startLine: startIndex
    };
    
    // 並列処理の解析
    const threads = this.splitThreads(tokens, startIndex);
    node.threads = threads.map(t => this.parseThread(t));
    
    return node;
}
```

**成果物**:
- Loop構造パーサー
- Alt/Else構造パーサー
- Par/And構造パーサー
- ネスト構造対応

**テスト項目**:
- ネストしたループ
- 複数分岐の条件
- 並列処理の解析

#### 2.2 AST to GUI変換器

```javascript
class ASTToGUIConverter {
    constructor(app) {
        this.app = app;
        this.idManager = new IDManager();
    }
    
    convert(ast) {
        const context = {
            actors: new Set(),
            actions: [],
            idMap: new Map()
        };
        
        // アクター抽出
        this.extractActors(ast, context);
        
        // アクション変換
        this.convertStatements(ast.statements, context);
        
        return {
            actors: Array.from(context.actors),
            actions: context.actions
        };
    }
}
```

**成果物**:
- `ASTToGUIConverter.js` - 変換器本体
- `IDManager.js` - ID管理システム
- `ConversionRules.js` - 変換ルール定義

### Phase 3: 同期機能実装（Week 3: 8/26-9/1）

#### 3.1 リアルタイム同期マネージャー

```javascript
class RealtimeSyncManager {
    constructor(app) {
        this.app = app;
        this.parser = new PlantUMLASTParser();
        this.converter = new ASTToGUIConverter(app);
        this.diffCalculator = new DiffCalculator();
        this.debounceTimer = null;
        this.syncLock = false;
    }
    
    initialize() {
        const codeEditor = document.getElementById('plantuml-code');
        
        // イベントリスナー登録（メモリリーク対策付き）
        this.eventController = new AbortController();
        
        codeEditor.addEventListener('input', (e) => {
            this.handleCodeChange(e.target.value);
        }, { signal: this.eventController.signal });
    }
    
    handleCodeChange(code) {
        if (this.syncLock) return; // 循環更新防止
        
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.syncFromCode(code);
        }, 300);
    }
    
    async syncFromCode(code) {
        try {
            // カーソル位置保持
            const cursorState = this.preserveCursorState();
            
            // AST解析
            const ast = await this.parseWithFallback(code);
            
            // 差分計算
            const diff = this.calculateDiff(ast);
            
            // 差分適用
            await this.applyDiff(diff);
            
            // カーソル位置復元
            this.restoreCursorState(cursorState);
            
        } catch (error) {
            this.handleSyncError(error);
        }
    }
}
```

**成果物**:
- `RealtimeSyncManager.js` - 同期マネージャー
- `DiffCalculator.js` - 差分計算器
- `CursorStateManager.js` - カーソル状態管理

#### 3.2 差分更新システム

```javascript
class DiffCalculator {
    calculate(oldActions, newActions) {
        const diff = {
            added: [],
            removed: [],
            modified: [],
            moved: []
        };
        
        // LCS（最長共通部分列）アルゴリズムによる差分検出
        const lcs = this.findLCS(oldActions, newActions);
        
        // 差分の分類
        this.categorizeDifferences(lcs, oldActions, newActions, diff);
        
        return diff;
    }
    
    applyDiff(diff, container) {
        // バッチ更新で効率化
        requestAnimationFrame(() => {
            // 削除
            diff.removed.forEach(id => this.removeElement(id));
            
            // 追加
            diff.added.forEach(action => this.addElement(action));
            
            // 更新
            diff.modified.forEach(change => this.updateElement(change));
            
            // 移動
            diff.moved.forEach(move => this.moveElement(move));
        });
    }
}
```

**成果物**:
- 差分計算アルゴリズム
- DOM更新最適化
- バッチ更新システム

### Phase 4: 品質保証と最適化（Week 4: 9/2-9/8）

#### 4.1 エラーハンドリングとフォールバック

```javascript
class ErrorHandler {
    constructor(app) {
        this.app = app;
        this.errorDisplay = new ErrorDisplay();
    }
    
    handleParseError(error, code, position) {
        // エラー位置の特定
        const location = this.locateError(code, position);
        
        // エラー表示
        this.errorDisplay.show({
            type: 'parse',
            message: error.message,
            line: location.line,
            column: location.column,
            suggestion: this.getSuggestion(error)
        });
        
        // 部分的な解析を試みる
        const partialAST = this.tryPartialParse(code, location);
        if (partialAST) {
            this.app.applyPartialUpdate(partialAST);
        }
    }
}
```

**成果物**:
- エラーハンドリングシステム
- 部分解析機能
- エラー回復メカニズム

#### 4.2 パフォーマンス最適化

```javascript
class PerformanceOptimizer {
    constructor() {
        this.cache = new LRUCache(100);
        this.memoized = new WeakMap();
    }
    
    optimizeParsing(code) {
        // キャッシュチェック
        const cached = this.cache.get(code);
        if (cached) return cached;
        
        // パース処理
        const result = this.parse(code);
        
        // キャッシュ保存
        this.cache.set(code, result);
        
        return result;
    }
    
    optimizeRendering() {
        // Virtual DOM的アプローチ
        // React Fiberアルゴリズムの簡易版実装
    }
}
```

**成果物**:
- キャッシングシステム
- メモ化実装
- レンダリング最適化

#### 4.3 テスト実装

```javascript
// test/sync.test.js
describe('PlantUML双方向同期', () => {
    describe('AST Parser', () => {
        test('基本的なメッセージをパースできる', () => {
            const code = 'A ->> B: Hello';
            const ast = parser.parse(code);
            expect(ast.statements[0].type).toBe('message');
        });
        
        test('ループ構造をパースできる', () => {
            const code = 'loop 条件\nA ->> B: メッセージ\nend';
            const ast = parser.parse(code);
            expect(ast.statements[0].type).toBe('loop');
        });
    });
    
    describe('同期機能', () => {
        test('コード編集がGUIに反映される', async () => {
            const app = new PlantUMLApp();
            const sync = new RealtimeSyncManager(app);
            
            await sync.syncFromCode('A ->> B: Test');
            
            expect(app.actions.length).toBe(1);
            expect(app.actions[0].message).toBe('Test');
        });
    });
});
```

**成果物**:
- ユニットテスト（100件以上）
- 統合テスト
- E2Eテスト
- パフォーマンステスト

---

## 📈 パフォーマンス目標

| 指標 | 現状 | 目標 | 測定方法 |
|------|------|------|----------|
| 同期遅延 | N/A | < 300ms | Performance API |
| メモリ使用量 | 50MB | < 60MB | Chrome DevTools |
| CPU使用率 | 10% | < 15% | Performance Monitor |
| フレームレート | 60fps | 60fps維持 | requestAnimationFrame |

---

## 🧪 テスト計画

### ユニットテスト
- ASTパーサーテスト: 50件
- 変換器テスト: 30件
- 差分計算テスト: 20件
- ID管理テスト: 15件

### 統合テスト
- GUI同期テスト: 20件
- エラーハンドリングテスト: 15件
- パフォーマンステスト: 10件

### E2Eテスト
- ユーザーシナリオテスト: 10件
- レグレッションテスト: 20件

### 受け入れテスト
- ユーザビリティテスト
- パフォーマンステスト
- 互換性テスト

---

## 📝 移行計画

### 段階的ロールアウト

1. **Alpha版** (Week 3終了時)
   - 開発環境でのテスト
   - 内部フィードバック収集

2. **Beta版** (Week 4中盤)
   - 限定ユーザーへの公開
   - バグ修正とパフォーマンス調整

3. **正式版** (Week 4終了時)
   - 全ユーザーへの公開
   - ドキュメント更新

### 後方互換性の維持

```javascript
// 既存APIの維持
class PlantUMLApp {
    // 既存メソッド（非推奨だが維持）
    parseAndUpdateFromCode(code) {
        console.warn('Deprecated: Use syncManager.syncFromCode() instead');
        return this.syncManager.syncFromCode(code);
    }
    
    // 新しいAPI
    get syncManager() {
        return this._syncManager;
    }
}
```

---

## 📊 成功指標（KPI）

### 技術的指標
- [ ] 双方向同期の完全性: 100%
- [ ] パースエラー率: < 1%
- [ ] 同期遅延: < 300ms
- [ ] テストカバレッジ: > 80%

### ビジネス指標
- [ ] ユーザー満足度: > 90%
- [ ] バグ報告数: < 5件/週
- [ ] パフォーマンス苦情: 0件

---

## 🔧 必要なリソース

### 開発環境
- Node.js 18+
- Chrome/Edge最新版
- VS Code / Cursor
- Git

### ライブラリ・依存関係
```json
{
  "dependencies": {
    "lru-cache": "^10.0.0",
    "diff": "^5.1.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "playwright": "^1.40.0",
    "@types/node": "^20.0.0"
  }
}
```

### 人的リソース
- 開発者: 1名
- テスター: 内部テスト（開発者兼任）
- レビュアー: AIアシスタント活用

---

## 🚨 リスク管理

### 技術的リスクと緩和策

| リスク | 緩和策 | 責任者 | 期限 |
|--------|--------|--------|------|
| パース精度不足 | テストケース拡充 | 開発者 | Week 2 |
| パフォーマンス劣化 | プロファイリング実施 | 開発者 | Week 3 |
| 既存機能への影響 | 回帰テスト自動化 | 開発者 | Week 1 |

### コンティンジェンシープラン

**シナリオ1**: 実装が予定より遅れる場合
- Phase 1, 2を優先実装
- 最適化は次バージョンへ延期

**シナリオ2**: 重大なバグが発見された場合
- ロールバック手順の準備
- フィーチャーフラグによる機能無効化

---

## 📅 マイルストーン

| 日付 | マイルストーン | 成果物 |
|------|---------------|---------|
| 8/18 | Phase 1完了 | ASTパーサー基本実装 |
| 8/25 | Phase 2完了 | コア機能実装 |
| 9/1 | Phase 3完了 | 同期機能実装 |
| 9/8 | Phase 4完了 | 正式リリース |

---

## 📚 ドキュメント計画

### 開発者向けドキュメント
- アーキテクチャ設計書
- API仕様書
- テスト仕様書

### ユーザー向けドキュメント
- 機能説明書
- 使用方法ガイド
- FAQ

### 内部ドキュメント
- コードコメント（JSDoc形式）
- Git コミットメッセージ規約
- 開発日誌

---

## ✅ チェックリスト

### 実装前チェック
- [ ] 既存コードのバックアップ
- [ ] 開発環境の準備
- [ ] 依存関係のインストール

### 実装中チェック
- [ ] コードレビュー実施
- [ ] テスト作成と実行
- [ ] ドキュメント更新

### リリース前チェック
- [ ] 全テストの合格
- [ ] パフォーマンス目標達成
- [ ] ドキュメント完成
- [ ] ロールバック手順準備

---

## 📞 コミュニケーション計画

### 進捗報告
- 週次: 開発経緯レポートへの記録
- 日次: GitHubコミット
- 随時: 重要な発見や問題の共有

### フィードバック収集
- Alpha版: 内部テスト
- Beta版: 限定ユーザーテスト
- 正式版: ユーザーフィードバック

---

## 🎯 まとめ

本実装計画により、PlantUML Editor Protoの双方向同期機能を安全かつ効率的に実装します。既存機能への影響を最小限に抑えながら、ユーザビリティを大幅に向上させることが期待されます。

**次のステップ**:
1. 計画の承認
2. 開発環境の準備
3. Phase 1の実装開始

---

*作成日: 2025年8月12日*
*バージョン: 1.0*
*作成者: Claude Code Assistant*