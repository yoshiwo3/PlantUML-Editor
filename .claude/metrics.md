## 📊 品質基準とメトリクス（外出し）

### コード品質メトリクス

| メトリクス分類 | 品質指標 | 目標値 | 測定方法 | 責任エージェント | アラート設定 |
|-------------|---------|--------|---------|-----------------|-------------|
| **コード品質** | 循環的複雑度 | < 10 | 静的解析 | general-purpose | 15以上で警告 |
| **テストカバレッジ** | ライン覆盖率 | > 80% | Jest/Coverage | webapp-test-automation | 70%以下で警告 |
| **セキュリティ** | 脆弱性スコア | 0 Critical | OWASP準拠 | ai-driven-app-architect | Critical発見時即座 |
| **パフォーマンス** | レスポンス時間 | < 200ms | Lighthouse | web-debug-specialist | 300ms以上で警告 |
| **保守性** | 技術的負債 | < 30分/KLOC | SonarQube | general-purpose | 60分以上で警告 |
| **ドキュメント** | API文書化率 | 100% | 自動チェック | software-doc-writer | 90%以下で警告 |

### セキュリティ要件（OWASP Top 10準拠）

| セキュリティ項目 | チェック内容 | 実装必須レベル | 検証方法 | 責任エージェント |
|----------------|-------------|---------------|---------|-----------------|
| **認証の破綻** | JWT実装、多要素認証 | Critical | 自動テスト | ai-driven-app-architect |
| **暗号化の失敗** | HTTPS、データ暗号化 | Critical | 設定チェック | docker-dev-env-builder |
| **インジェクション** | SQLインジェクション対策 | Critical | 静的解析 | web-debug-specialist |
| **安全でない設計** | セキュリティ設計レビュー | High | 設計チェック | ai-driven-app-architect |
| **設定ミス** | セキュリティヘッダー | High | 設定監査 | docker-dev-env-builder |
| **脆弱なコンポーネント** | 依存関係チェック | High | 自動スキャン | general-purpose |
| **識別・認証の失敗** | セッション管理 | Medium | 手動テスト | webapp-test-automation |
| **ソフトウェア整合性** | コード署名 | Medium | CI/CDチェック | dev-ticket-manager |
| **ログ・監視不足** | セキュリティログ | Medium | ログ分析 | general-purpose |
| **サーバサイドリクエストフォージェリ** | SSRF対策 | Medium | 脆弱性テスト | web-debug-specialist |

### 追跡対象メトリクス

#### パフォーマンスメトリクス
```javascript
const performanceTargets = {
  // Webアプリケーション
  firstContentfulPaint: '< 1.5秒',
  largestContentfulPaint: '< 2.5秒',
  cumulativeLayoutShift: '< 0.1',
  firstInputDelay: '< 100ms',
  
  // API応答時間
  apiResponseTime: '< 200ms',
  databaseQueryTime: '< 50ms',
  cacheHitRate: '> 95%',
  
  // リソース使用率
  cpuUsage: '< 70%',
  memoryUsage: '< 80%',
  diskUsage: '< 85%'
};
```

#### 品質メトリクス
```javascript
const qualityTargets = {
  // コード品質
  codeComplexity: '< 10',
  duplicatedCode: '< 3%',
  technicalDebt: '< 30分/KLOC',
  
  // テスト品質
  testCoverage: '> 80%',
  testPassRate: '> 95%',
  flakiness: '< 5%',
  
  // ドキュメント品質
  apiDocCoverage: '100%',
  codeCommentRatio: '> 20%',
  docFreshness: '< 7日'
};
```

### アラート設定

#### 即座アラート（Critical）
- **セキュリティ脆弱性**: Critical/High発見時
- **システム停止**: 可用性 < 99%
- **データ損失**: バックアップ失敗
- **法的要件**: コンプライアンス違反

#### 警告アラート（Warning）
- **パフォーマンス低下**: レスポンス時間 > 300ms
- **品質低下**: テストカバレッジ < 70%
- **技術的負債**: 許容値の50%超過
- **ドキュメント不備**: API文書化率 < 90%

#### 情報アラート（Info）
- **使用率上昇**: リソース使用率 > 60%
- **依存関係更新**: セキュリティアップデート利用可能
- **最適化機会**: パフォーマンス改善提案
- **トレンド変化**: メトリクス傾向の変化



