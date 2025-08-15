# PlantUML Editor - Sprint 1 単体テスト環境

## 📋 概要

PlantUMLエディターのSprint 1単体テスト環境のセットアップと実行ガイドです。
CLAUDE.md標準テスト環境定義に準拠したテスト環境を構築しています。

## 🎯 テスト目標

- **カバレッジ目標**: 80%以上 (CLAUDE.md基準)
- **実行時間目標**: 単体テスト < 5秒
- **品質基準**: セキュリティテスト100%成功
- **対応ブラウザ**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 🗂️ ディレクトリ構造

```
tests/
├── unit/                     # 単体テスト
│   ├── security/            # セキュリティ機能テスト
│   │   ├── domPurify-sanitize.unit.test.js
│   │   └── csp-header-validation.unit.test.js
│   ├── editors/             # エディター機能テスト
│   │   └── EditModalManager.unit.test.js
│   └── utils/               # ユーティリティテスト
│       ├── ErrorBoundary.unit.test.js
│       └── IDManager.unit.test.js
├── integration/             # 統合テスト（既存）
├── e2e/                     # E2Eテスト（既存）
├── fixtures/                # テストデータ
├── helpers/                 # テストヘルパー
│   ├── dom-utils.js        # DOM操作ユーティリティ
│   └── security-helpers.js  # セキュリティテストヘルパー
├── setup/                   # テスト環境設定
│   └── jest.setup.js       # Jest詳細設定
└── README.md               # このファイル
```

## 🚀 クイックスタート

### 1. 依存関係の確認

```bash
# Node.js バージョン確認（18.x または 20.x推奨）
node --version

# 必要なパッケージがインストール済みか確認
npm list jest @playwright/test jest-environment-jsdom
```

### 2. テスト実行

```bash
# すべての単体テストを実行
npm run test:unit

# カバレッジ付きで単体テストを実行
npm run test:unit:coverage

# ウォッチモードで単体テストを実行（開発時推奨）
npm run test:unit:watch

# セキュリティテストのみ実行
npm run test:unit -- --testPathPattern="security"

# 特定のテストファイルのみ実行
npm run test:unit -- EditModalManager.unit.test.js
```

### 3. テスト結果の確認

```bash
# HTMLレポートを開く（カバレッジテスト実行後）
open coverage/test-report.html

# コンソールでカバレッジサマリー確認
cat coverage/coverage-summary.json
```

## 📊 Sprint 1 テスト対象

### セキュリティ機能テスト

#### DOMPurifyサニタイズ機能 (`domPurify-sanitize.unit.test.js`)
- **テスト項目**: XSS攻撃防御、HTMLサニタイゼーション、日本語処理
- **テストケース数**: 25+ ケース
- **カバー範囲**: 基本XSS、高度なXSS、難読化攻撃、日本語コンテンツ処理
- **実行コマンド**: `npm run test:unit -- domPurify-sanitize`

```bash
# DOMPurifyテストの実行例
npm run test:unit -- --testNamePattern="DOMPurify|sanitize"
```

#### CSPヘッダー検証機能 (`csp-header-validation.unit.test.js`)
- **テスト項目**: CSPポリシー検証、違反検出、PlantUMLエディター特化設定
- **テストケース数**: 20+ ケース
- **カバー範囲**: ヘッダーパース、ポリシー検証、違反検出、推奨設定確認
- **実行コマンド**: `npm run test:unit -- csp-header-validation`

### エディター機能テスト

#### EditModalManager (`EditModalManager.unit.test.js`)
- **テスト項目**: モーダル管理、アクション保存、イベント処理
- **テストケース数**: 30+ ケース
- **カバー範囲**: 基本機能、アクション管理、イベント処理、フォーム処理、パフォーマンス
- **実行コマンド**: `npm run test:unit -- EditModalManager`

### ユーティリティテスト

#### ErrorBoundary (`ErrorBoundary.unit.test.js`)
- **テスト項目**: エラーキャッチ、フォールバック表示、回復処理
- **テストケース数**: 25+ ケース
- **カバー範囲**: エラーハンドリング、UI表示、リトライ機能、ログ出力
- **実行コマンド**: `npm run test:unit -- ErrorBoundary`

#### IDManager (`IDManager.unit.test.js`)
- **テスト項目**: ID生成、一意性保証、DOM互換性
- **テストケース数**: 35+ ケース
- **カバー範囲**: 基本ID生成、特化ID生成、管理機能、検証機能、パフォーマンス
- **実行コマンド**: `npm run test:unit -- IDManager`

## 🔧 テスト環境設定

### Jest設定 (`jest.config.js`)

```javascript
// CLAUDE.md標準テスト環境定義準拠設定
module.exports = {
  testEnvironment: 'jsdom',
  testTimeout: 5000,           // CLAUDE.md基準: 5秒以内
  coverageThreshold: {
    global: {
      branches: 80,            // CLAUDE.md基準: 80%以上
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### カスタムマッチャー

Sprint 1では以下のカスタムマッチャーが利用可能です：

```javascript
// セキュリティ検証
expect(content).toBeSanitized(originalContent);
expect(content).toComplyWithCSP();

// PlantUML固有検証
expect(action).toBeValidPlantUMLAction();
expect(modalState).toBeValidModalState();

// エラー状態検証
expect(errorObject).toBeInErrorState();

// DOM存在確認
expect('#element-id').toExistInDOM();
expect(element).toHaveTextContent('期待するテキスト');
```

### テストヘルパー

#### DOM操作ヘルパー (`tests/helpers/dom-utils.js`)

```javascript
import { createTestElements, domTestUtils } from '@tests/helpers/dom-utils.js';

// テスト用DOM要素作成
const container = createTestElements.createEditorContainer();

// DOM操作ユーティリティ
domTestUtils.setInputValue('#input-field', 'テスト値');
domTestUtils.clickButton('#submit-btn');
const isVisible = domTestUtils.isModalVisible('#modal');
```

#### セキュリティテストヘルパー (`tests/helpers/security-helpers.js`)

```javascript
import { mockDOMPurify, threatPatterns } from '@tests/helpers/security-helpers.js';

// 悪意あるペイロード生成
const xssPayload = createMaliciousPayload('xss');
const safePayload = createSafePayload('japanese');

// DOMPurifyのモック使用
const sanitized = mockDOMPurify.sanitize(maliciousInput);
```

## 🚀 パフォーマンステスト

### パフォーマンス測定ヘルパー

```javascript
// パフォーマンス測定（5秒制限付き）
const result = await measurePerformance('test-operation', () => {
  return performExpensiveOperation();
});

// 非同期待機ヘルパー
await waitForAsync(() => element.isVisible(), 1000);
```

### パフォーマンス基準

- **単体テスト実行時間**: < 5秒 (CLAUDE.md基準)
- **大量データ処理**: 1000件 < 5秒
- **DOM操作**: レスポンス時間 < 100ms
- **セキュリティ検証**: 複雑パターン < 1秒

## 🔍 デバッグ方法

### デバッグモードでの実行

```bash
# デバッグログを有効にして実行
JEST_DEBUG=true npm run test:unit

# 詳細ログを有効にして実行  
JEST_VERBOSE=true npm run test:unit

# 単一テストファイルをデバッグモードで実行
npm run test:unit -- --verbose EditModalManager.unit.test.js
```

### ブラウザデバッガー使用

```bash
# テストをデバッグモードで実行（ブラウザが開く）
node --inspect-brk node_modules/.bin/jest --runInBand EditModalManager.unit.test.js
```

### カスタムデバッグログ

```javascript
// テスト内でデバッグログを使用
test('デバッグテスト', () => {
  debug('テスト開始'); // JEST_DEBUG=trueの場合のみ出力
  
  const result = someOperation();
  debug('実行結果:', result);
  
  expect(result).toBeTruthy();
});
```

## 📈 カバレッジレポート

### HTMLレポート
実行後に `coverage/test-report.html` でビジュアルレポートを確認できます。

### 詳細レポート形式
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`
- **JUnit XML**: `coverage/junit.xml`

### カバレッジ基準

| メトリクス | Sprint 1基準 | CLAUDE.md基準 |
|-----------|-------------|---------------|
| Statements | 80%以上 | 80%以上 |
| Branches | 80%以上 | 80%以上 |
| Functions | 80%以上 | 80%以上 |
| Lines | 80%以上 | 80%以上 |

## 🔄 CI/CD統合

### GitHub Actions

`.github/workflows/test.yml`で自動テストが実行されます：

- **トリガー**: プッシュ、プルリクエスト
- **Node.js バージョン**: 18.x, 20.x
- **実行内容**: 単体テスト、セキュリティテスト、パフォーマンステスト
- **成果物**: カバレッジレポート、テスト結果XML

### 品質ゲート

以下の条件をすべて満たす必要があります：
- ✅ 全ての単体テストが成功
- ✅ セキュリティテストが100%成功
- ✅ カバレッジが80%以上
- ✅ パフォーマンステストが5秒以内

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. jsdom環境でのDOM API不足エラー

```javascript
// 解決方法: カスタムモックを追加
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
```

#### 2. 非同期テストのタイムアウト

```javascript
// 解決方法: waitForAsyncヘルパーを使用
await waitForAsync(() => element.isVisible(), 2000);
```

#### 3. DOM要素が見つからない

```javascript
// 解決方法: テスト前にDOMをセットアップ
beforeEach(() => {
  createTestDOM(); // ヘルパー関数を使用
});

afterEach(() => {
  cleanupTestDOM(); // クリーンアップを忘れずに
});
```

#### 4. カバレッジが低い

```bash
# 詳細なカバレッジレポートで未カバー箇所を確認
npm run test:unit:coverage
open coverage/lcov-report/index.html
```

#### 5. パフォーマンステストの失敗

```javascript
// measurePerformanceヘルパーの使用を確認
const result = await measurePerformance('operation-name', () => {
  return expensiveOperation();
});
```

### ログレベルの調整

```bash
# エラーのみ表示
CI=true npm run test:unit

# 詳細ログ表示
JEST_VERBOSE=true npm run test:unit

# デバッグログ表示
JEST_DEBUG=true npm run test:unit
```

## 📚 参考資料

### 関連ドキュメント
- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
- [jsdom環境設定](https://jestjs.io/docs/tutorial-jquery)
- [カスタムマッチャー作成](https://jestjs.io/docs/expect#expectextendmatchers)

### プロジェクト固有資料
- `CLAUDE.md` - 標準テスト環境定義
- `jest.config.js` - Jest設定詳細
- `package.json` - NPMスクリプト定義
- `.github/workflows/test.yml` - CI/CD設定

### 外部リンク
- [OWASP XSS Prevention](https://owasp.org/www-community/xss-filter-evasion-cheatsheet)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify](https://github.com/cure53/DOMPurify)

## 🔄 更新履歴

- **2025-08-15**: Sprint 1 単体テスト環境初期構築
  - Jest環境セットアップ完了
  - セキュリティテストスイート実装
  - エディター機能テスト実装  
  - ユーティリティテスト実装
  - CI/CD統合完了

---

## 📞 サポート

テスト環境に関する質問や問題がある場合：

1. **FAQ確認**: このドキュメントのトラブルシューティングセクション
2. **ログ確認**: デバッグモードでテスト実行
3. **Issue報告**: GitHubでIssueを作成
4. **ドキュメント参照**: CLAUDE.md の標準テスト環境定義

**成功の鍵**: Sprint 1では品質を重視し、80%以上のカバレッジと全テスト成功を目指しましょう！