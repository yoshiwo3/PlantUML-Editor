# PlantUMLエディタ E2Eテスト Phase 2 統合ガイド

## 📋 概要

このドキュメントは、PlantUMLエディタのE2EテストPhase 2で作成された包括的なテスト設計と実装の統合ガイドです。

### 成果物一覧

| 成果物 | ファイル名 | 用途 | 状態 |
|--------|----------|------|------|
| **詳細テストケース仕様書** | test-cases-phase2.md | テスト設計の詳細仕様 | ✅ 完成 |
| **Phase 2-A実装** | test-implementation-phase2a.js | カバレッジ拡充テスト | ✅ 完成 |
| **Phase 2-B実装** | test-implementation-phase2b.js | パフォーマンステスト | ✅ 完成 |
| **Phase 2-C実装** | test-implementation-phase2c.js | CI/CD統合テスト | ✅ 完成 |
| **GitHub Actionsワークフロー** | github-actions-workflow.yml | CI/CD自動化 | ✅ 完成 |
| **実行スケジュール計画** | test-execution-schedule.md | 運用計画 | ✅ 完成 |

---

## 🚀 クイックスタート

### 1. 環境準備

```bash
# 1. プロジェクトディレクトリに移動
cd C:\d\PlantUML\PlantUML_Editor_Proto\E2Eテスト

# 2. 依存関係インストール
npm install

# 3. PlantUMLエディタアプリケーション起動
cd ../jp2plantuml
npm start &
```

### 2. Phase 2テスト実行

#### Phase 2-A: カバレッジ拡充テスト
```bash
# 基本実行
node docs/phase2/test-implementation-phase2a.js

# 環境変数指定実行  
BASE_URL=http://localhost:8086 node docs/phase2/test-implementation-phase2a.js
```

#### Phase 2-B: パフォーマンステスト
```bash
# パフォーマンステスト実行
node docs/phase2/test-implementation-phase2b.js

# 結果確認
ls -la test-results/performance-*
```

#### Phase 2-C: CI/CD統合テスト
```bash
# CI/CD統合テスト実行
OUTPUT_DIR=./test-results node docs/phase2/test-implementation-phase2c.js

# レポート確認
open test-results/test-report.html
```

### 3. Docker環境での実行

#### Phase 2-A Docker実行
```bash
# Dockerファイルベース実行
docker build -f docs/phase2/Dockerfile-phase2a -t plantuml-e2e-phase2a .
docker run --rm --network host -v "$(pwd)/test-results:/app/test-results" plantuml-e2e-phase2a
```

#### 統合テスト Docker実行
```bash
# すべてのフェーズを順次実行
docker-compose -f docs/phase2/docker-compose-phase2.yml up --abort-on-container-exit
```

---

## 📊 テスト構成詳細

### Phase 2-A: テストカバレッジ拡充

#### 実装テストケース（15ケース）
- **同期テスト**: 5ケース（SYNC-001～005）
- **エラー処理テスト**: 5ケース（SYNC-ERR-001～005）  
- **PlantUML構文テスト**: 5ケース（COND-001、LOOP-001、PAR-001等）

#### 期待実行時間
- **単体実行**: 3-5分
- **CI環境**: 25分（GitHub Actions）
- **成功基準**: 成功率90%以上

### Phase 2-B: パフォーマンステスト強化

#### 実装テストケース（10ケース）
- **Core Web Vitals**: 5ケース（FCP、LCP、TTI、FID、CLS）
- **リソース監視**: 3ケース（メモリ、CPU、DOM要素）
- **負荷テスト**: 3ケース（大量データ、連続操作、長時間稼働）

#### 性能目標
- **TTI**: < 2000ms
- **メモリ**: < 50MB
- **CPU使用率**: < 30%

### Phase 2-C: CI/CD統合テスト

#### 実装テストケース（5ケース）  
- **PR統合**: プルリクエスト時自動実行
- **回帰テスト**: メインブランチマージ時
- **品質ゲート**: 品質基準チェック
- **レポート生成**: 自動レポート作成
- **アーティファクト**: テスト結果保存

---

## 🔧 CI/CD統合設定

### GitHub Actions設定

#### 1. ワークフローファイル配置
```bash
# GitHub Actionsワークフロー設定
mkdir -p .github/workflows
cp docs/phase2/github-actions-workflow.yml .github/workflows/e2e-tests-phase2.yml
```

#### 2. 環境変数設定（GitHubリポジトリ設定）
```yaml
# GitHub Repository Secrets設定例
PLANTUML_BASE_URL: "http://localhost:8086"
SLACK_WEBHOOK: "https://hooks.slack.com/..."  # 任意
EMAIL_NOTIFICATION: "qa-team@company.com"     # 任意
```

#### 3. 自動実行設定確認
```bash
# プルリクエスト作成でテスト自動実行されることを確認
git checkout -b feature/test-integration
git add .
git commit -m "Add Phase 2 E2E tests"
git push origin feature/test-integration
# PR作成 → GitHub Actionsが自動実行
```

### ローカルCI環境セットアップ

#### Act（GitHub Actions ローカル実行）
```bash
# Actインストール（Windows）
choco install act-cli

# ワークフローローカル実行
act pull_request
```

---

## 📈 品質メトリクス監視

### 1. リアルタイム監視

#### テスト実行時メトリクス表示
```javascript
// テスト実行時に自動表示される品質メトリクス
const qualityMetrics = {
  successRate: '95.5%',
  averageExecutionTime: '1.2秒',
  memoryUsage: '32.5MB',
  performanceScore: '92/100'
};
```

#### 継続的監視設定
```bash
# 定期的な品質チェック（cron設定例）
# 毎日2時にフルテスト実行
0 2 * * * cd /path/to/project && npm run test:phase2:full

# 毎時間パフォーマンステスト
0 * * * * cd /path/to/project && npm run test:phase2b:quick
```

### 2. レポート生成

#### 自動レポート生成（HTML/JSON/JUnit）
```bash
# レポート生成のみ実行
node docs/phase2/test-implementation-phase2c.js --report-only

# 生成されるレポート
# - test-results/test-report.html      (HTMLレポート)
# - test-results/test-results.json     (JSON結果)
# - test-results/junit-results.xml     (JUnit形式)
```

---

## 🛠️ カスタマイズ・拡張

### 1. 新規テストケース追加

#### Phase 2-Aへのテスト追加例
```javascript
// test-implementation-phase2a.js への追加例
await runTest('SYNC-006', '新機能の同期テスト', async () => {
    // 新機能のテストロジック
    await page.goto(BASE_URL);
    // テスト実装...
    
    return { metrics: { /* 測定値 */ } };
});
```

#### 新規フェーズ追加
```bash
# Phase 2-D用テンプレート作成
cp docs/phase2/test-implementation-phase2a.js docs/phase2/test-implementation-phase2d.js
# 内容をカスタマイズ
```

### 2. パフォーマンス閾値調整

#### 環境に応じた閾値設定
```javascript
// test-implementation-phase2b.js
const PERFORMANCE_THRESHOLDS = {
  // 開発環境用（緩い基準）
  development: {
    TTI: 3000,
    MEMORY_LIMIT: 100,
    CPU_LIMIT: 50
  },
  
  // 本番環境用（厳しい基準）
  production: {
    TTI: 1500,
    MEMORY_LIMIT: 30,
    CPU_LIMIT: 20
  }
};
```

### 3. 通知設定カスタマイズ

#### Slack通知設定
```javascript
// CI/CD統合テストにSlack通知追加
const notifySlack = async (message, level = 'info') => {
  if (process.env.SLACK_WEBHOOK) {
    const color = level === 'error' ? '#ff0000' : '#00ff00';
    // Slack Webhook実装
  }
};
```

---

## 🧪 テスト実行パターン

### 開発フロー統合

#### 1. 開発時テスト（手動実行）
```bash
# 機能開発時の基本確認
npm run test:phase2a:quick

# パフォーマンス影響確認
npm run test:phase2b:core-vitals

# 統合確認
npm run test:phase2:smoke
```

#### 2. プルリクエスト時（自動実行）
```yaml
# .github/workflows/e2e-tests-phase2.yml で自動実行
# - Phase 2-A: カバレッジテスト（25分）
# - 基本的な回帰テスト
# - スクリーンショット比較
```

#### 3. リリース前（包括的テスト）
```bash
# 全フェーズ実行
npm run test:phase2:full

# パフォーマンス詳細分析
npm run test:phase2b:comprehensive

# セキュリティチェック
npm run test:security:full
```

### カスタムテストスイート

#### 軽量テスト（CI高速化用）
```javascript
// test-suite-light.js
const lightTests = [
  'SYNC-001', 'SYNC-002',           // 基本同期
  'PERF-CWV-005',                   // TTI
  'CI-003'                          // 品質ゲート
];
```

#### 完全テスト（週次品質確認用）
```javascript
// test-suite-comprehensive.js  
const comprehensiveTests = [
  ...phase2ATests,     // 全カバレッジテスト
  ...phase2BTests,     // 全パフォーマンステスト
  ...phase2CTests,     // 全CI/CD統合テスト
  ...visualRegression, // ビジュアルリグレッション
  ...accessibilityTests, // アクセシビリティ
  ...securityTests     // セキュリティテスト
];
```

---

## 🔍 トラブルシューティング

### よくある問題と解決策

#### 1. テスト実行エラー

**問題**: `Error: browserType.launch: Chromium distribution 'msedge' is not found`

**解決策**:
```bash
# Microsoft Edgeインストール確認
which microsoft-edge-stable

# Playwrightブラウザ再インストール
npx playwright install msedge

# Docker環境の場合
./install-edge.sh
```

#### 2. パフォーマンステスト不安定

**問題**: パフォーマンス値が大きくばらつく

**解決策**:
```javascript
// 複数回実行の平均値を使用
const avgMetrics = await Promise.all([
  measurePerformance(),
  measurePerformance(), 
  measurePerformance()
]).then(results => ({
  avg: results.reduce((a,b) => a+b, 0) / results.length
}));
```

#### 3. CI/CD環境でのタイムアウト

**問題**: GitHub Actionsでテストがタイムアウト

**解決策**:
```yaml
# github-actions-workflow.yml
timeout-minutes: 45  # デフォルト6時間から短縮
env:
  CI_TIMEOUT_MULTIPLIER: 2  # CI環境でタイムアウト値を2倍に
```

### ログとデバッグ

#### デバッグモード実行
```bash
# 詳細ログ出力
DEBUG=1 node docs/phase2/test-implementation-phase2a.js

# スクリーンショット保存
SAVE_SCREENSHOTS=1 node docs/phase2/test-implementation-phase2b.js

# ヘッドレスモード無効（デバッグ用）
HEADLESS=false node docs/phase2/test-implementation-phase2c.js
```

#### ログファイル確認
```bash
# 実行ログ
tail -f test-results/test-execution.log

# エラーログ
tail -f test-results/error.log

# パフォーマンスログ
tail -f test-results/performance.log
```

---

## 📝 次のステップ・改善計画

### 短期改善（2週間以内）
1. ✅ **Phase 2テスト実装完了**
2. ⬜ **CI/CD統合の本格運用開始**
3. ⬜ **初回パフォーマンスベースライン確立**
4. ⬜ **チームトレーニング実施**

### 中期改善（1-3ヶ月以内）
1. ⬜ **ビジュアルリグレッションテスト統合**
2. ⬜ **アクセシビリティテスト完全実装**
3. ⬜ **セキュリティテスト自動化**
4. ⬜ **AI駆動テスト生成の検討開始**

### 長期改善（3-6ヶ月以内）
1. ⬜ **予測的品質分析システム構築**
2. ⬜ **ゼロダウンタイムテスト環境構築** 
3. ⬜ **業界ベンチマーク達成**
4. ⬜ **完全自動化品質管理体制確立**

---

## 📞 サポート・連絡先

### 開発チーム
- **テストリード**: [Name] - test-lead@company.com
- **QAマネージャー**: [Name] - qa-manager@company.com
- **DevOpsエンジニア**: [Name] - devops@company.com

### ドキュメント
- **詳細仕様**: `test-cases-phase2.md`
- **実行スケジュール**: `test-execution-schedule.md`
- **トラブルシューティング**: このファイルの該当セクション

### コミュニティ
- **Slack**: #plantuml-testing
- **GitHub Issues**: https://github.com/your-org/plantuml-editor/issues
- **Wiki**: https://github.com/your-org/plantuml-editor/wiki

---

**最終更新**: 2025/08/13  
**ドキュメントバージョン**: 1.0  
**次回レビュー予定**: 2025/09/13

---

## 付録：ファイル構成

```
E2Eテスト/docs/phase2/
├── README-Phase2-Integration.md           # このファイル
├── test-cases-phase2.md                   # 詳細テストケース仕様書
├── test-implementation-phase2a.js         # Phase 2-A実装
├── test-implementation-phase2b.js         # Phase 2-B実装  
├── test-implementation-phase2c.js         # Phase 2-C実装
├── github-actions-workflow.yml            # CI/CDワークフロー
├── test-execution-schedule.md             # 実行スケジュール・品質計画
└── package.json                           # 依存関係管理（作成予定）
```

このPhase 2統合により、PlantUMLエディタの品質保証体制が大幅に強化され、継続的な品質改善が可能になります。