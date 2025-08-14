# PlantUML Editor CI/CD統合ガイド

**作成日**: 2025-08-14  
**バージョン**: 1.0.0

## 📋 概要

PlantUMLエディタプロジェクトのCI/CD統合環境を構築しました。GitHub Actionsを使用した自動テスト、WebKit対応、Docker環境最適化を含む包括的なCI/CDパイプラインです。

## ✅ 実装完了項目

### 1. GitHub Actions ワークフロー
- **ファイル**: `.github/workflows/e2e-tests.yml`
- **機能**:
  - 単体テスト実行（Jest）
  - E2Eテスト（Playwright - マトリックス戦略）
  - WebKit専用テスト（実験的）
  - Docker環境テスト
  - テスト結果レポート生成
  - 本番環境へのデプロイ（mainブランチのみ）

### 2. WebKit対応
- **問題**: `--no-sandbox`オプション非対応
- **解決策**: WebKit専用テストスクリプト作成
- **ファイル**: `test-webkit.cjs`
- **テスト結果**: ✅ 100%成功（9/9テスト）

### 3. Docker環境最適化
- **CI用Dockerfile**: `Dockerfile.ci`
- **CI用docker-compose**: `docker-compose.ci.yml`
- **特徴**:
  - 全ブラウザプリインストール
  - キャッシュレイヤー最適化
  - ヘルスチェック実装
  - テスト結果永続化

## 🚀 使用方法

### ローカル環境でのテスト

```bash
# WebKitテスト実行
cd PlantUML_Editor_Proto/E2Eテスト/docs/phase2
npm run test:webkit

# クロスブラウザテスト
npm run test:cross-browser

# CI環境シミュレーション
npm run test:ci
```

### Docker環境でのテスト

```bash
# Docker環境でWebKitテスト
docker-compose run --rm playwright npm run test:webkit

# CI用Docker環境構築
docker-compose -f docker-compose.ci.yml build

# CI環境でのテスト実行
docker-compose -f docker-compose.ci.yml up
```

### GitHub Actionsでの自動実行

1. **プッシュトリガー**: main, developブランチへのプッシュ
2. **プルリクエスト**: mainブランチへのPR
3. **定期実行**: 毎日深夜2時（JST 11時）
4. **手動実行**: GitHub UI からworkflow_dispatch

## 📊 テスト戦略

### マトリックステスト
```yaml
strategy:
  matrix:
    browser: [chromium, firefox, msedge]
```

### WebKit特別扱い
- 実験的機能として別ジョブで実行
- 失敗を許容（`continue-on-error: true`）
- 特殊な起動オプション適用

## 🔧 WebKit固有の設定

### 起動オプション
```javascript
const getWebKitLaunchOptions = () => {
  const options = {
    headless: true,
    args: [] // WebKitは--no-sandboxをサポートしない
  };
  
  if (process.env.CI) {
    options.args.push('--disable-web-security');
    options.args.push('--disable-features=IsolateOrigins,site-per-process');
  }
  
  return options;
};
```

### コンテキスト設定
```javascript
context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  locale: 'ja-JP',
  timezoneId: 'Asia/Tokyo',
  ignoreHTTPSErrors: true,
  bypassCSP: true,
  javaScriptEnabled: true
});
```

## 📈 パフォーマンス指標

### WebKitテスト結果（2025-08-14）
- **起動時間**: 260ms
- **ページ読み込み**: 189ms
- **DOM読み込み**: 3ms
- **レスポンス時間**: 9ms
- **成功率**: 100%（9/9テスト）

### 他ブラウザとの比較
| ブラウザ | 成功率 | 起動時間 | DOM読込 |
|---------|--------|----------|---------|
| WebKit | 100% | 260ms | 3ms |
| Chromium | 100% | 574ms | 34ms |
| Firefox | 100% | 1,191ms | 25ms |
| MSEdge | 100% | 1,228ms | 31ms |

## 🐛 既知の問題と対策

### WebKit制限事項
1. **--no-sandboxオプション非対応**
   - 対策: オプションを使用しない専用設定

2. **networkidleイベント不安定**
   - 対策: `domcontentloaded`を使用

3. **パフォーマンスAPI制限**
   - 対策: 利用可能なAPIのみ使用

### CI環境での注意点
- Linux環境では追加依存関係が必要
- Windows環境では正常動作確認済み
- Docker環境推奨

## 📝 今後の改善案

1. **テストカバレッジ向上**
   - 現在: 90.6%
   - 目標: 95%以上

2. **並列実行の最適化**
   - ワーカー数の動的調整
   - リソース使用量の最適化

3. **レポート機能強化**
   - Allureレポート統合
   - Slack通知連携
   - カバレッジバッジ自動更新

## 🔗 関連ドキュメント

- [Docker環境Playwrightテスト実施報告書](PlantUML_Editor_Proto/debug/条件分岐・ループ・並行処理_処理フロー編集_20250814_1510/Docker環境Playwrightテスト実施報告書_20250814_1905.md)
- [CLAUDE.md](CLAUDE.md) - プロジェクトガイド
- [GitHub Actions公式ドキュメント](https://docs.github.com/en/actions)

## 📞 サポート

問題が発生した場合は、以下の手順で対応してください：

1. GitHub Issuesで既存の問題を確認
2. 新規Issueを作成（テンプレート使用）
3. CI/CDログを添付
4. 再現手順を明記

---
**CI/CD統合完了** ✅