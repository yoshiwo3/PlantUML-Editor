# PlantUMLエディタ E2Eテスト環境

## 概要
PlantUMLエディタのE2Eテストを実行するための環境です。
Docker環境とローカル環境の両方で実行可能です。

## セットアップ

### ローカル環境での実行

1. アプリケーションサーバーの起動：
```bash
cd PlantUML_Editor_Proto
npx http-server -p 8086
```

2. テストの実行：
```bash
cd E2Eテスト
npm install
npm run test:local
```

### Docker環境での実行

1. Docker環境のビルド：
```bash
cd PlantUML_Editor_Proto
docker-compose build
```

2. テストの実行：
```bash
docker-compose up e2e-tests
```

## テストスクリプト

- `test-docker.js` - Docker環境用のテストスクリプト（CommonJS）
- `simple-test-cjs.js` - ローカル環境用のテストスクリプト（CommonJS）
- `simple-test.js` - ESモジュール版（Node.js v22互換性問題あり）

## テストシナリオ

### Critical Path Tests
- CP-001: 初期画面表示
- CP-002: アクター追加
- CP-003: テンプレート適用
- CP-004: プレビュー生成

### パフォーマンステスト
- PERF-001: 初期表示速度（目標: 3秒以内）

## トラブルシューティング

### Node.js v22での実行エラー
Node.js v22ではPlaywrightの互換性問題があるため、以下の方法で対処：
1. Docker環境を使用（推奨）
2. Node.js v20を使用
3. CommonJS版のスクリプトを使用

### Dockerビルドが遅い場合
- 初回ビルドは時間がかかります（Playwrightイメージのダウンロード）
- 2回目以降はキャッシュが効いて高速化されます

## 詳細ドキュメント
- [E2Eテスト計画書](./E2Eテスト計画書_v1.0.md)
- [E2Eテスト実施計画書 Phase2](./E2Eテスト実施計画書_Phase2.md)
- [E2Eテスト実施契約書](./E2Eテスト実施契約書.md)