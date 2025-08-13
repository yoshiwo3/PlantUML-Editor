# PlantUMLエディタ E2Eテスト計画書 v1.0

## 📋 目次
1. [概要](#概要)
2. [テスト戦略](#テスト戦略)
3. [テスト環境](#テスト環境)
4. [テストシナリオ分類](#テストシナリオ分類)
5. [Critical Path Tests](#critical-path-tests)
6. [機能別テストシナリオ](#機能別テストシナリオ)
7. [統合テストシナリオ](#統合テストシナリオ)
8. [パフォーマンステスト](#パフォーマンステスト)
9. [エラーハンドリングテスト](#エラーハンドリングテスト)
10. [実行計画](#実行計画)

---

## 概要

### プロジェクト情報
- **対象システム**: PlantUMLエディタ
- **URL**: http://localhost:8086
- **テストフレームワーク**: Playwright
- **対象ブラウザ**: Chrome, Firefox, Safari, Edge
- **テスト種別**: E2E（End-to-End）自動テスト

### テスト目的
1. **品質保証**: プロダクション環境での安定稼働を保証
2. **リグレッション防止**: 新機能追加時の既存機能への影響確認
3. **ユーザー体験検証**: 実際のユーザー操作フローの動作確認
4. **パフォーマンス検証**: レスポンス時間とリソース使用量の確認

### 成功基準
- **テストカバレッジ**: Critical Path 100%、全機能 90%以上
- **実行時間**: 全テスト30分以内
- **合格率**: 95%以上（既知の問題を除く）

---

## テスト戦略

### テストピラミッド
```
         /\         E2E Tests (20%)
        /  \        - Critical User Journeys
       /    \       - Cross-browser Tests
      /      \      
     /--------\     Integration Tests (30%)
    /          \    - Component Integration
   /            \   - API Integration
  /              \  
 /________________\ Unit Tests (50%)
                    - Parser Functions
                    - State Management
```

### リスクベースアプローチ
| リスクレベル | 対象機能 | テスト頻度 | 自動化優先度 |
|------------|---------|-----------|------------|
| **Critical** | PlantUMLコード生成、同期処理 | 毎回 | 最高 |
| **High** | プレビュー表示、テンプレート適用 | 毎回 | 高 |
| **Medium** | UI操作、ドラッグ&ドロップ | 日次 | 中 |
| **Low** | スタイリング、レイアウト | 週次 | 低 |

### テストデータ戦略
1. **静的データ**: 事前定義されたテストパターン
2. **動的データ**: ランダム生成される日本語アクター名
3. **境界値データ**: 最大/最小値、特殊文字
4. **異常データ**: 不正な入力、XSS攻撃パターン

---

## テスト環境

### 必要環境
```yaml
development:
  url: http://localhost:8086
  database: なし（ローカルストレージ使用）
  api:
    - Kroki API: https://kroki.io
  
staging:
  url: http://staging.plantuml-editor.example.com
  features: 本番と同等
  
production:
  url: http://plantuml-editor.example.com
  monitoring: 有効
```

### ブラウザマトリックス
| ブラウザ | バージョン | OS | 優先度 | 備考 |
|---------|-----------|-----|--------|------|
| Chrome | 最新 | Windows/Mac/Linux | Critical | 主要ブラウザ |
| Edge | 最新 | Windows | High | 企業ユーザー |
| Firefox | 最新 | Windows/Mac/Linux | High | セカンダリ |
| Safari | 最新 | Mac | Medium | Mac ユーザー |
| Chrome Mobile | 最新 | Android | Low | モバイル対応 |

### テストデータ
```javascript
// personas.json
{
  "田中健太": {
    "role": "EC運用チームリーダー",
    "pattern": "EC注文フロー",
    "actors": ["顧客", "ECサイト", "在庫システム", "決済API"]
  },
  "佐藤美咲": {
    "role": "IT営業",
    "pattern": "承認フロー",
    "actors": ["申請者", "承認者", "システム管理者"]
  },
  "山田太郎": {
    "role": "プロジェクトマネージャー",
    "pattern": "在庫管理フロー",
    "actors": ["倉庫", "在庫DB", "発注システム"]
  }
}
```

---

## テストシナリオ分類

### 優先度マトリックス
```
高頻度 │ P1: Critical Path    │ P2: 主要機能
      │ - 基本フロー作成      │ - テンプレート
      │ - コード同期          │ - プレビュー
──────┼─────────────────────┼──────────────
低頻度 │ P3: エッジケース     │ P4: 補助機能
      │ - エラー処理          │ - エクスポート
      │ - 大規模データ        │ - ショートカット
      └─────────────────────┴──────────────
        高影響度                低影響度
```

---

## Critical Path Tests

### CP-001: 新規ユーザーの初回利用フロー
**目的**: 初めてのユーザーが10分以内に図を作成できることを確認

```gherkin
Feature: 初回利用フロー
  
  Scenario: ECサイトの注文フローを作成
    Given ユーザーがトップページにアクセスする
    When "ECサイト注文フロー"テンプレートを選択する
    And アクター"顧客"を追加する
    And アクター"ECサイト"を追加する
    And "顧客"から"ECサイト"へ"商品を注文"メッセージを追加する
    Then PlantUMLコードが生成される
    And プレビューに図が表示される
    And 作成時間が10分以内である
```

### CP-002: PlantUMLコード編集と同期
**目的**: コード編集後の同期機能が正常に動作することを確認

```gherkin
Scenario: 日本語アクター名での同期処理
  Given 既存の図が表示されている
  When PlantUMLコードを直接編集する
    """
    @startuml
    actor "新規顧客" as customer
    participant "受注システム" as order
    customer -> order: 注文する
    @enduml
    """
  And 同期ボタンをクリックする
  Then 処理フローが更新される
  And アクターリストに"新規顧客"が表示される
  And エラーが発生しない
```

### CP-003: 複雑な業務フロー作成
**目的**: 条件分岐、ループ、並行処理を含む図の作成

```gherkin
Scenario: 在庫確認を含む条件分岐フロー
  Given 空の編集画面が表示されている
  When 条件分岐ビルダーを開く
  And 条件"在庫あり"を設定する
  And Trueブランチに"発送処理"を追加する
  And Falseブランチに"入荷待ち"を追加する
  Then 正しいalt/else構文が生成される
  And プレビューに条件分岐が表示される
```

---

## 機能別テストシナリオ

### 1. アクター管理機能

#### TEST-ACTOR-001: プリセットアクター追加
```javascript
test('プリセットアクターを追加できる', async ({ page }) => {
  await page.goto('http://localhost:8086');
  await page.click('text=EC注文フロー');
  await page.click('button:has-text("顧客")');
  await expect(page.locator('#actorsList')).toContainText('顧客');
});
```

#### TEST-ACTOR-002: カスタムアクター作成
```javascript
test('日本語カスタムアクターを作成できる', async ({ page }) => {
  await page.fill('#customActorName', '配送業者');
  await page.selectOption('#customActorType', 'participant');
  await page.click('#addCustomActorBtn');
  await expect(page.locator('#actorsList')).toContainText('配送業者');
});
```

#### TEST-ACTOR-003: アクター重複チェック
```javascript
test('重複アクターを検出する', async ({ page }) => {
  await page.click('button:has-text("顧客")');
  await page.click('button:has-text("顧客")');
  await expect(page.locator('.error-message')).toBeVisible();
});
```

### 2. 処理フロー作成機能

#### TEST-FLOW-001: ドラッグ&ドロップ
```javascript
test('ドラッグ&ドロップで処理を並び替える', async ({ page }) => {
  const source = page.locator('.action-item:first-child');
  const target = page.locator('.action-item:last-child');
  await source.dragTo(target);
  // 順序が変更されたことを確認
});
```

#### TEST-FLOW-002: インライン編集
```javascript
test('処理内容をインラインで編集できる', async ({ page }) => {
  await page.dblclick('.action-text');
  await page.fill('.inline-editor', '更新された処理');
  await page.press('Enter');
  await expect(page.locator('.action-text')).toContainText('更新された処理');
});
```

### 3. テンプレート機能

#### TEST-TEMPLATE-001: EC注文フロー
```javascript
test('EC注文フローテンプレートを適用', async ({ page }) => {
  await page.click('#pattern-ec-order');
  await expect(page.locator('#plantUmlCode')).toContainText('顧客');
  await expect(page.locator('#plantUmlCode')).toContainText('注文確認');
});
```

#### TEST-TEMPLATE-002: 承認フロー
```javascript
test('承認フローテンプレートを適用', async ({ page }) => {
  await page.click('#pattern-approval');
  await expect(page.locator('#plantUmlCode')).toContainText('申請者');
  await expect(page.locator('#plantUmlCode')).toContainText('承認');
});
```

### 4. PlantUMLコード生成

#### TEST-CODE-001: 基本的なシーケンス図
```javascript
test('基本的なシーケンス図のコード生成', async ({ page }) => {
  // アクターとメッセージを追加
  await page.click('button:has-text("顧客")');
  await page.click('button:has-text("ECサイト")');
  await page.fill('#actionText', '商品を注文');
  await page.click('#addActionBtn');
  
  const code = await page.textContent('#plantUmlCode');
  expect(code).toContain('@startuml');
  expect(code).toContain('actor "顧客"');
  expect(code).toContain('participant "ECサイト"');
  expect(code).toContain('"顧客" -> "ECサイト": 商品を注文');
  expect(code).toContain('@enduml');
});
```

#### TEST-CODE-002: 複雑な構造のコード生成
```javascript
test('条件分岐を含むコード生成', async ({ page }) => {
  await page.click('#conditionBuilderBtn');
  await page.fill('#conditionName', '在庫確認');
  await page.fill('#trueBranch', '発送');
  await page.fill('#falseBranch', '入荷待ち');
  await page.click('#addCondition');
  
  const code = await page.textContent('#plantUmlCode');
  expect(code).toContain('alt 在庫確認');
  expect(code).toContain('else');
  expect(code).toContain('end');
});
```

### 5. プレビュー機能

#### TEST-PREVIEW-001: リアルタイムプレビュー
```javascript
test('変更がリアルタイムでプレビューに反映される', async ({ page }) => {
  await page.fill('#actionText', 'テスト処理');
  await page.click('#addActionBtn');
  
  // プレビューが更新されるまで待機
  await page.waitForResponse('**/kroki.io/**');
  
  const preview = page.locator('#preview img');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('src', /kroki\.io/);
});
```

#### TEST-PREVIEW-002: エラー時のフォールバック
```javascript
test('Kroki APIエラー時のフォールバック', async ({ page }) => {
  // Kroki APIをブロック
  await page.route('**/kroki.io/**', route => route.abort());
  
  await page.fill('#plantUmlCode', 'invalid code');
  await page.click('#syncBtn');
  
  await expect(page.locator('.error-message')).toContainText('プレビュー生成エラー');
});
```

### 6. 同期機能

#### TEST-SYNC-001: コードからUIへの同期
```javascript
test('PlantUMLコードからUIへの同期', async ({ page }) => {
  const code = `@startuml
actor "顧客" as customer
participant "ECサイト" as site
customer -> site: 注文
@enduml`;
  
  await page.fill('#plantUmlCode', code);
  await page.click('#syncBtn');
  
  await expect(page.locator('#actorsList')).toContainText('顧客');
  await expect(page.locator('#actorsList')).toContainText('ECサイト');
  await expect(page.locator('.action-item')).toContainText('注文');
});
```

#### TEST-SYNC-002: 日本語処理の同期
```javascript
test('日本語アクター名の同期処理', async ({ page }) => {
  const code = `@startuml
actor "田中太郎" as tanaka
participant "受付システム" as system
tanaka -> system: 申請する
@enduml`;
  
  await page.fill('#plantUmlCode', code);
  await page.click('#syncBtn');
  
  // 処理フローがクリアされないことを確認
  await expect(page.locator('#processList')).not.toBeEmpty();
  await expect(page.locator('#actorsList')).toContainText('田中太郎');
});
```

---

## 統合テストシナリオ

### IT-001: ペルソナ1（田中健太）の利用シナリオ
**シナリオ**: EC運用チームリーダーが会議用資料を作成

```javascript
test('EC運用チームリーダーの典型的な利用フロー', async ({ page }) => {
  // 1. テンプレート選択
  await page.goto('http://localhost:8086');
  await page.click('#pattern-ec-order');
  
  // 2. カスタマイズ
  await page.fill('#customActorName', '物流センター');
  await page.click('#addCustomActorBtn');
  
  // 3. 条件分岐追加
  await page.click('#conditionBuilderBtn');
  await page.fill('#conditionName', '在庫あり');
  await page.fill('#trueBranch', '即日発送');
  await page.fill('#falseBranch', '入荷待ち（3日）');
  await page.click('#addCondition');
  
  // 4. draw.io形式でエクスポート
  await page.click('#exportDrawioBtn');
  
  // 5. 作業時間の確認（10分以内）
  const duration = await page.evaluate(() => performance.now());
  expect(duration).toBeLessThan(600000); // 10分
});
```

### IT-002: ペルソナ2（佐藤美咲）の利用シナリオ
**シナリオ**: IT営業が顧客向け提案資料を作成

```javascript
test('IT営業の商談中リアルタイム編集', async ({ page }) => {
  // 1. 標準テンプレート読み込み
  await page.goto('http://localhost:8086');
  await page.click('#pattern-approval');
  
  // 2. 顧客要件をリアルタイムで反映
  await page.dblclick('.action-item:first-child .action-text');
  await page.fill('.inline-editor', '部長承認（顧客固有）');
  await page.press('Enter');
  
  // 3. 並行処理の追加
  await page.click('#parallelBuilderBtn');
  await page.fill('#branch1', 'システムA連携');
  await page.fill('#branch2', 'システムB連携');
  await page.click('#addParallel');
  
  // 4. プレビュー確認
  await page.waitForResponse('**/kroki.io/**');
  await expect(page.locator('#preview img')).toBeVisible();
});
```

### IT-003: ペルソナ3（山田太郎）の利用シナリオ
**シナリオ**: PMが複雑な部門間フローを作成

```javascript
test('PMによる複雑な業務フロー作成', async ({ page }) => {
  // 1. 複数部門のアクター追加
  const departments = ['営業部', '経理部', '物流部', 'IT部', '管理部'];
  for (const dept of departments) {
    await page.fill('#customActorName', dept);
    await page.selectOption('#customActorType', 'participant');
    await page.click('#addCustomActorBtn');
  }
  
  // 2. 部門間の複雑なやり取り
  await page.fill('#fromActor', '営業部');
  await page.fill('#toActor', '経理部');
  await page.fill('#actionText', '見積承認依頼');
  await page.click('#addActionBtn');
  
  // 3. ループ処理追加
  await page.click('#loopBuilderBtn');
  await page.fill('#loopCondition', '承認が得られるまで');
  await page.click('#addLoop');
  
  // 4. 階層表示の確認
  await expect(page.locator('#plantUmlCode')).toContainText('loop');
});
```

---

## パフォーマンステスト

### PERF-001: 初期表示速度
```javascript
test('初期表示が1秒以内', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('http://localhost:8086');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(1000);
});
```

### PERF-002: 大規模データ処理
```javascript
test('100アクター・500メッセージの処理', async ({ page }) => {
  // 大規模なPlantUMLコードを生成
  let code = '@startuml\n';
  for (let i = 1; i <= 100; i++) {
    code += `actor "アクター${i}" as actor${i}\n`;
  }
  for (let i = 1; i <= 500; i++) {
    const from = Math.floor(Math.random() * 100) + 1;
    const to = Math.floor(Math.random() * 100) + 1;
    code += `actor${from} -> actor${to}: メッセージ${i}\n`;
  }
  code += '@enduml';
  
  const startTime = performance.now();
  await page.fill('#plantUmlCode', code);
  await page.click('#syncBtn');
  const syncTime = performance.now() - startTime;
  
  expect(syncTime).toBeLessThan(3000); // 3秒以内
});
```

### PERF-003: メモリリーク検証
```javascript
test('長時間操作でのメモリリーク確認', async ({ page }) => {
  const initialMemory = await page.evaluate(() => {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  });
  
  // 100回の追加・削除操作
  for (let i = 0; i < 100; i++) {
    await page.click('button:has-text("顧客")');
    await page.click('.delete-actor-btn');
  }
  
  // ガベージコレクション実行
  await page.evaluate(() => {
    if (global.gc) global.gc();
  });
  
  const finalMemory = await page.evaluate(() => {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  });
  
  // メモリ増加が50MB以内
  expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024);
});
```

---

## エラーハンドリングテスト

### ERROR-001: 不正なPlantUMLコード
```javascript
test('不正なコードに対するエラーメッセージ', async ({ page }) => {
  await page.fill('#plantUmlCode', 'これは不正なコードです');
  await page.click('#syncBtn');
  
  await expect(page.locator('.error-message')).toBeVisible();
  await expect(page.locator('.error-message')).toContainText('構文エラー');
});
```

### ERROR-002: ネットワークエラー
```javascript
test('ネットワーク切断時の動作', async ({ page }) => {
  // オフラインモードをシミュレート
  await page.context().setOffline(true);
  
  await page.click('button:has-text("顧客")');
  await page.fill('#actionText', 'テスト');
  await page.click('#addActionBtn');
  
  // ローカル機能は動作することを確認
  await expect(page.locator('#plantUmlCode')).toContainText('テスト');
  
  // プレビューはエラーメッセージ
  await expect(page.locator('.preview-error')).toContainText('オフライン');
});
```

### ERROR-003: XSS攻撃防御
```javascript
test('XSS攻撃の防御', async ({ page }) => {
  const xssPayload = '<script>alert("XSS")</script>';
  
  await page.fill('#customActorName', xssPayload);
  await page.click('#addCustomActorBtn');
  
  // スクリプトが実行されないことを確認
  const alertFired = await page.evaluate(() => {
    let fired = false;
    window.alert = () => { fired = true; };
    return fired;
  });
  
  expect(alertFired).toBe(false);
  
  // エスケープされて表示されることを確認
  await expect(page.locator('#actorsList')).toContainText('<script>');
});
```

### ERROR-004: 同時編集の競合
```javascript
test('同時編集時の競合解決', async ({ page, context }) => {
  // 2つのタブで同じページを開く
  const page2 = await context.newPage();
  await page2.goto('http://localhost:8086');
  
  // 両方のタブで編集
  await page.fill('#plantUmlCode', 'コード1');
  await page2.fill('#plantUmlCode', 'コード2');
  
  // 同期処理
  await page.click('#syncBtn');
  await page2.click('#syncBtn');
  
  // 警告メッセージの確認
  await expect(page2.locator('.warning-message')).toContainText('他の場所で編集');
});
```

---

## 実行計画

### 実行スケジュール
| フェーズ | 期間 | 内容 | 成果物 |
|---------|------|------|--------|
| **準備** | 1日 | 環境構築、データ準備 | テスト環境 |
| **実装** | 3日 | テストコード実装 | テストスイート |
| **実行** | 1日 | 全テスト実行 | 実行結果 |
| **分析** | 1日 | 結果分析、修正 | レポート |

### CI/CD統合
```yaml
# .github/workflows/e2e-test.yml
name: E2E Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # 毎日2時

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e:${{ matrix.browser }}
      - uses: actions/upload-artifact@v2
        if: failure()
        with:
          name: test-results
          path: test-results/
```

### テスト実行コマンド
```bash
# 全テスト実行
npm run test:e2e

# Critical Pathのみ
npm run test:e2e:critical

# 特定ブラウザ
npm run test:e2e:chrome
npm run test:e2e:firefox

# ヘッドレスモード
npm run test:e2e:headless

# デバッグモード
npm run test:e2e:debug

# レポート生成
npm run test:e2e:report
```

### 成功基準と品質ゲート
1. **Critical Path**: 100%合格必須
2. **機能テスト**: 95%以上合格
3. **パフォーマンス**: 全指標が基準値内
4. **エラー処理**: セキュリティテスト100%合格

### レポート形式
```
===============================================
PlantUMLエディタ E2Eテスト結果レポート
実行日時: 2025/08/13 22:30
===============================================

[サマリー]
総テスト数: 45
成功: 43 (95.6%)
失敗: 2
スキップ: 0
実行時間: 25分32秒

[Critical Path] ✅ 100% (10/10)
[機能テスト] ✅ 95% (28/30)
[統合テスト] ✅ 100% (3/3)
[パフォーマンス] ⚠️ 66% (2/3)
[エラー処理] ✅ 100% (4/4)

[失敗テスト詳細]
1. PERF-002: 大規模データ処理
   - 期待値: 3000ms以内
   - 実測値: 3542ms
   - 原因: Web Worker初期化遅延

2. TEST-FLOW-001: ドラッグ&ドロップ
   - エラー: 要素が見つからない
   - 原因: セレクタの変更

[推奨アクション]
- PERF-002: Worker初期化を事前に実行
- TEST-FLOW-001: セレクタを更新
```

---

## 付録

### A. テストデータファイル
- `test-data/actors.json`: アクターデータ
- `test-data/templates.json`: テンプレートパターン
- `test-data/large-diagram.puml`: 大規模図テスト用
- `test-data/xss-payloads.json`: セキュリティテスト用

### B. トラブルシューティング
| 問題 | 原因 | 解決方法 |
|------|------|---------|
| テストがタイムアウト | Kroki API遅延 | タイムアウト値を増やす |
| 要素が見つからない | DOM更新遅延 | waitForSelector使用 |
| メモリ不足 | 大規模テスト | --max-old-space-size設定 |

### C. 参考資料
- [Playwright Documentation](https://playwright.dev)
- [PlantUML Syntax](https://plantuml.com)
- [E2E Testing Best Practices](https://testingjavascript.com)

---

**作成者**: Claude Code  
**バージョン**: 1.0  
**最終更新**: 2025/08/13