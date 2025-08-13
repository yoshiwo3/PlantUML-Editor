## 🔧 よくある問題と対処（外出し）

### 例
- ポート占有で起動不可: `docker compose down` → ポート変更 → `up -d`
- プレビュー表示なし: Kroki疎通/PlantUML構文/外部送信ブロックを確認
- ビルド失敗: `docker compose build --no-cache`、`npm ci`
- Live Serverと競合: Live Serverを5501などへ／Docker側を3002に
- 文字化け: PowerShellはUTF-8バイト配列で送信
- 権限で停止: ワークスペース信頼・権限許可

詳細の切り分け手順やチェックリストは運用に合わせて追記してください。



