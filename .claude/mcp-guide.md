## 🔧 MCP（Model Control Protocol）サーバー活用ガイド（外出し）

### 利用可能なMCPサーバー一覧（抜粋）
- GitHub: リポジトリ操作、PR、ファイル取得
- Playwright: ブラウザ操作、E2Eテスト
- Fetch: Web情報取得、APIアクセス
- Context7: ライブラリドキュメント取得
- IDE: 診断情報取得、カーネル実行

### 基本原則
1. MCP優先の原則（Bash直叩きより先にMCP）
2. 組み合わせ活用（GitHub→Playwright→Context7→IDE）
3. エラーハンドリング（フォールバックを準備）

### ベストプラクティス
- プロアクティブ活用（開始時に環境チェック）
- チェーン/並列実行、キャッシュ、リソース管理
- セキュリティ（データ保護、アクセス制御）
- メトリクス/アラート（成功率、応答時間）

詳細なAPI例・パターン・実装テンプレートは元章のコード例を参照して運用に合わせて更新してください。

# MCP ガイド（外出し）

## 対応サーバーと用途

| サーバー | プレフィックス | 主用途 |
|---|---|---|
| GitHub | `mcp__github__*` | Issue/PR、コード操作 |
| Playwright | `mcp__playwright__*` | E2E/UI 自動操作・検証 |
| Fetch | `mcp__fetch__*` | Web/API 取得 |
| Context7 | `mcp__context7__*` | ライブラリドキュメント参照 |
| IDE | `mcp__ide__*` | 診断、実行、エラー取得 |

注意: ClaudeCodeActions は MCP ではなく内蔵機能。

## 最短レシピ

```javascript
// 例: 変更差分の可視化 → UIスナップショット → 診断
const files = await mcp__github__get_pull_request_files({ owner, repo, pullNumber });
await mcp__playwright__browser_navigate({ url: "http://localhost:3001" });
await mcp__playwright__browser_snapshot();
await mcp__ide__getDiagnostics();
```

## ベストプラクティス
- 可用時は MCP 優先（curl/bash 直叩きは回避）
- 並列化は 3 本程度まで（UI/E2E はセッション管理を厳格化）
- 機密は送出しない（fetch/context7 に PII を渡さない）


