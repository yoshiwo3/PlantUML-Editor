# PlantUMLエディタ E2Eテスト実施計画書 Phase 2

## 📋 計画概要

### 文書情報
- **計画書バージョン**: 2.0
- **作成日**: 2025/08/13
- **計画期間**: 2025/08/14 - 2025/08/28（2週間）
- **承認者**: [プロジェクトマネージャー]
- **実施責任者**: [テストリード]

### 目的
Phase 1で構築したE2Eテスト基盤を基に、包括的なテストカバレッジを達成し、プロダクション品質を保証する。

### スコープ
1. Node.js環境問題の解決と自動テスト環境構築
2. Critical Path Tests（CP-002～CP-010）の完全実施
3. 機能別テスト30本の実施
4. CI/CD環境の構築と自動化

---

## 🎯 即時対応タスク（Day 1-3）

### Task 1: Node.js環境問題の解決

#### 1.1 環境診断と対策
| タスク | 担当 | 期限 | 完了基準 |
|--------|------|------|----------|
| Node.jsバージョン確認 | インフラ | Day 1 AM | 現行v22.14.0の問題特定 |
| Playwright互換性調査 | 開発 | Day 1 AM | 推奨バージョン確定 |
| Node.js v20.xへのダウングレード | インフラ | Day 1 PM | 環境切替完了 |
| nvm導入と複数バージョン管理 | インフラ | Day 1 PM | 切替可能状態 |

#### 1.2 Playwright環境構築
```bash
# 実行手順
1. Node.js v20.11.0 インストール
   nvm install 20.11.0
   nvm use 20.11.0

2. Playwright インストール
   cd E2Eテスト
   npm install @playwright/test@1.40.0
   npx playwright install
   npx playwright install-deps

3. 動作確認
   npx playwright test --list
   npx playwright test critical-path.spec.js --headed
```

#### 1.3 検証項目
- [ ] Playwrightコマンドが正常実行
- [ ] ブラウザが自動起動
- [ ] テストが実行完了
- [ ] レポートが生成

### Task 2: Docker環境の構築（オプション）

#### 2.1 Dockerfile作成
```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npm", "test"]
```

#### 2.2 docker-compose.yml
```yaml
version: '3.8'
services:
  e2e-tests:
    build: .
    volumes:
      - ./test-results:/app/test-results
      - ./playwright-report:/app/playwright-report
    environment:
      - CI=true
      - BASE_URL=http://app:8086
    depends_on:
      - app
  
  app:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ../:/app
    command: npx http-server -p 8086
    ports:
      - "8086:8086"
```

---

## 📝 Critical Path Tests 実施計画（Day 2-5）

### CP-002: PlantUMLコード編集と同期

#### テスト設計
| ステップ | 操作 | 検証項目 | 期待結果 |
|----------|------|----------|----------|
| 1 | 初期テンプレート適用 | テンプレート表示 | EC注文フロー表示 |
| 2 | PlantUMLコード直接編集 | エディタ反応 | リアルタイム更新 |
| 3 | 日本語アクター名追加 | 文字エンコーディング | 文字化けなし |
| 4 | 同期ボタンクリック | UI更新 | 処理フロー保持 |
| 5 | エラーチェック | コンソール | エラーなし |

#### テストデータ
```javascript
const testCases = [
  {
    name: "基本的な同期",
    code: `@startuml
actor "顧客" as customer
participant "システム" as system
customer -> system: リクエスト
@enduml`
  },
  {
    name: "複雑な日本語",
    code: `@startuml
actor "田中太郎（営業部）" as tanaka
participant "承認システム_ver2.0" as approval
tanaka -> approval: 見積申請（¥1,000,000）
@enduml`
  },
  {
    name: "特殊文字を含む",
    code: `@startuml
actor "User@Company" as user
participant "API/Gateway" as api
user -> api: POST /api/v1/orders
@enduml`
  }
];
```

### CP-003: 条件分岐フロー作成

#### テスト設計
| ステップ | 操作 | 検証項目 | 期待結果 |
|----------|------|----------|----------|
| 1 | 条件分岐ビルダー起動 | モーダル表示 | UI要素すべて表示 |
| 2 | 条件名入力 | バリデーション | 必須項目チェック |
| 3 | Trueブランチ設定 | 入力反映 | プレビュー更新 |
| 4 | Falseブランチ設定 | 入力反映 | プレビュー更新 |
| 5 | 追加ボタンクリック | コード生成 | alt/else構文 |

#### バリエーション
- 単純な条件分岐（alt）
- オプション分岐（opt）
- ネストした条件分岐
- 複数条件の組み合わせ

### CP-004: ループ処理フロー

#### テスト設計
| ステップ | 操作 | 検証項目 | 期待結果 |
|----------|------|----------|----------|
| 1 | ループビルダー起動 | モーダル表示 | UI要素表示 |
| 2 | ループ条件設定 | 条件式バリデーション | 構文チェック |
| 3 | ループ内処理追加 | ネスト構造 | インデント正常 |
| 4 | 追加ボタンクリック | コード生成 | loop構文 |

#### テストパターン
```javascript
const loopPatterns = [
  "最大3回まで",
  "データが存在する間",
  "承認が得られるまで（タイムアウト：5分）",
  "全レコード処理完了まで"
];
```

### CP-005: 並行処理フロー

#### テスト設計
| ステップ | 操作 | 検証項目 | 期待結果 |
|----------|------|----------|----------|
| 1 | 並行処理ビルダー起動 | モーダル表示 | 複数ブランチ入力欄 |
| 2 | ブランチ1設定 | 処理内容入力 | プレビュー更新 |
| 3 | ブランチ2設定 | 処理内容入力 | プレビュー更新 |
| 4 | ブランチ追加 | 動的フォーム | 3つ目のブランチ |
| 5 | 追加ボタンクリック | コード生成 | par/else構文 |

### CP-006～CP-010: 統合シナリオ

#### CP-006: テンプレート切り替えとカスタマイズ
- 3種類のテンプレート連続切り替え
- カスタムアクター追加
- 既存処理の編集
- 保存と復元

#### CP-007: エクスポート機能
- draw.io形式エクスポート
- PNG/SVGダウンロード（実装時）
- クリップボードコピー
- ファイル名自動生成

#### CP-008: エラーハンドリング
- ネットワーク切断シミュレーション
- 不正なコード入力
- API障害時の動作
- リカバリー機能

#### CP-009: リアルタイム更新
- 連続的な変更操作
- 大量データ入力
- 高速タイピングテスト
- 同時複数操作

#### CP-010: ユーザビリティ
- 10分以内の完全フロー作成
- キーボードショートカット
- ドラッグ&ドロップ
- アクセシビリティ

---

## 🔧 機能別テスト実施計画（Day 6-8）

### 1. アクター管理機能（10テスト）

#### 1.1 基本操作テスト
| ID | テスト名 | 優先度 | 自動化 |
|----|---------|--------|--------|
| ACT-001 | プリセットアクター追加 | High | ✓ |
| ACT-002 | カスタムアクター作成 | High | ✓ |
| ACT-003 | アクター重複チェック | High | ✓ |
| ACT-004 | アクター削除 | Medium | ✓ |
| ACT-005 | アクター編集 | Medium | ✓ |

#### 1.2 境界値テスト
| ID | テスト名 | 優先度 | 自動化 |
|----|---------|--------|--------|
| ACT-006 | 最大文字数（255文字） | Low | ✓ |
| ACT-007 | 特殊文字処理 | Medium | ✓ |
| ACT-008 | 空文字/NULL処理 | High | ✓ |
| ACT-009 | 100アクター同時追加 | Low | ✓ |
| ACT-010 | Unicode文字完全対応 | High | ✓ |

### 2. 処理フロー作成機能（10テスト）

#### 2.1 メッセージ操作
| ID | テスト名 | 優先度 | 自動化 |
|----|---------|--------|--------|
| FLOW-001 | 基本メッセージ追加 | High | ✓ |
| FLOW-002 | 非同期メッセージ | Medium | ✓ |
| FLOW-003 | 返信メッセージ | Medium | ✓ |
| FLOW-004 | 自己メッセージ | Low | ✓ |
| FLOW-005 | ブロードキャスト | Low | ✓ |

#### 2.2 フロー編集
| ID | テスト名 | 優先度 | 自動化 |
|----|---------|--------|--------|
| FLOW-006 | ドラッグ&ドロップ順序変更 | High | ✓ |
| FLOW-007 | インライン編集 | High | ✓ |
| FLOW-008 | 一括削除 | Medium | ✓ |
| FLOW-009 | Undo/Redo | Medium | ✓ |
| FLOW-010 | 複製機能 | Low | ✓ |

### 3. テンプレート機能（10テスト）

#### 3.1 テンプレート適用
| ID | テスト名 | 優先度 | 自動化 |
|----|---------|--------|--------|
| TMPL-001 | EC注文フロー | High | ✓ |
| TMPL-002 | 承認フロー | High | ✓ |
| TMPL-003 | 在庫管理フロー | Medium | ✓ |
| TMPL-004 | 条件分岐テンプレート | High | ✓ |
| TMPL-005 | ループテンプレート | Medium | ✓ |

#### 3.2 カスタマイズ
| ID | テスト名 | 優先度 | 自動化 |
|----|---------|--------|--------|
| TMPL-006 | テンプレート編集 | High | ✓ |
| TMPL-007 | カスタムテンプレート保存 | Medium | ✓ |
| TMPL-008 | テンプレート削除 | Low | ✓ |
| TMPL-009 | インポート/エクスポート | Medium | ✓ |
| TMPL-010 | テンプレート検索 | Low | ✓ |

---

## 🚀 CI/CD環境構築計画（Day 9-10）

### GitHub Actions設定

#### .github/workflows/e2e-tests.yml
```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # 毎日午前2時

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        test-suite: [critical, functional, integration]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.11.0'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd E2Eテスト
          npm ci
          npx playwright install --with-deps ${{ matrix.browser }}
      
      - name: Start application
        run: |
          cd PlantUML_Editor_Proto
          npx http-server -p 8086 &
          npx wait-on http://localhost:8086
      
      - name: Run E2E tests
        run: |
          cd E2Eテスト
          npm run test:${{ matrix.test-suite }} -- --project=${{ matrix.browser }}
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.browser }}-${{ matrix.test-suite }}
          path: |
            E2Eテスト/test-results/
            E2Eテスト/playwright-report/
      
      - name: Publish test report
        if: always()
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./E2Eテスト/playwright-report
          destination_dir: test-reports/${{ github.run_number }}
```

### Jenkins Pipeline（オプション）

```groovy
pipeline {
    agent any
    
    tools {
        nodejs 'Node-20.11.0'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                dir('E2Eテスト') {
                    sh 'npm ci'
                    sh 'npx playwright install'
                }
            }
        }
        
        stage('Start Application') {
            steps {
                sh 'npx http-server -p 8086 &'
                sh 'npx wait-on http://localhost:8086'
            }
        }
        
        stage('Run Tests') {
            parallel {
                stage('Critical Path') {
                    steps {
                        dir('E2Eテスト') {
                            sh 'npm run test:critical'
                        }
                    }
                }
                stage('Functional') {
                    steps {
                        dir('E2Eテスト') {
                            sh 'npm run test:functional'
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            publishHTML([
                reportDir: 'E2Eテスト/playwright-report',
                reportFiles: 'index.html',
                reportName: 'E2E Test Report'
            ])
            
            archiveArtifacts artifacts: 'E2Eテスト/test-results/**/*'
        }
    }
}
```

---

## 📊 実行スケジュール

### Week 1（Day 1-5）

| 日 | タスク | 成果物 | 担当 |
|----|--------|--------|------|
| Day 1 | Node.js環境整備 | 動作環境 | インフラ |
| Day 2 | CP-002, CP-003実装・実行 | テスト結果 | QA |
| Day 3 | CP-004, CP-005実装・実行 | テスト結果 | QA |
| Day 4 | CP-006～CP-008実装・実行 | テスト結果 | QA |
| Day 5 | CP-009, CP-010実装・実行 | Critical Path完了報告 | QA |

### Week 2（Day 6-10）

| 日 | タスク | 成果物 | 担当 |
|----|--------|--------|------|
| Day 6 | アクター管理テスト | テスト結果 | QA |
| Day 7 | 処理フロー作成テスト | テスト結果 | QA |
| Day 8 | テンプレート機能テスト | 機能別完了報告 | QA |
| Day 9 | CI/CD環境構築 | パイプライン | DevOps |
| Day 10 | 統合テスト・最終確認 | 最終報告書 | QA/PM |

---

## ✅ 完了基準

### Phase 2完了条件
1. **テストカバレッジ**
   - Critical Path: 100%（10/10）
   - 機能別: 90%以上（27/30）
   - 全体: 85%以上

2. **品質指標**
   - 合格率: 95%以上
   - 重大バグ: 0件
   - 中程度バグ: 5件以下

3. **自動化**
   - CI/CDパイプライン稼働
   - 日次自動実行
   - レポート自動生成

4. **ドキュメント**
   - 全テスト結果記録
   - 不具合管理票作成
   - 改善提案書提出

---

## 📈 リスク管理

### 識別されたリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Node.js互換性問題 | 高 | 中 | Docker環境で回避 |
| テスト環境不安定 | 中 | 低 | リトライ機構実装 |
| リソース不足 | 中 | 中 | 優先度による調整 |
| スケジュール遅延 | 高 | 低 | バッファ時間確保 |

### 緊急時対応計画
1. **環境障害**: Docker環境への即座切り替え
2. **重大バグ発見**: ホットフィックス＋再テスト
3. **リソース不足**: 外部QAチーム投入

---

## 📝 品質保証基準

### テスト実施基準
- 各テストケースは3回実行し、2回以上成功で合格
- フレークテストは原因調査必須
- パフォーマンステストは5回平均値を採用

### バグ分類基準
| レベル | 定義 | 対応 |
|--------|------|------|
| Critical | 機能停止 | 即時修正 |
| High | 主要機能障害 | 24時間以内 |
| Medium | 副次機能障害 | 3日以内 |
| Low | 軽微な問題 | 次リリース |

### レポート基準
- 日次進捗報告（17:00）
- 週次サマリー（金曜17:00）
- 最終報告書（Day 10）

---

## 🤝 承認

本計画書に基づき、E2Eテスト Phase 2を実施することを承認します。

| 役割 | 氏名 | 署名 | 日付 |
|------|------|------|------|
| プロジェクトマネージャー | _______ | _______ | 2025/08/__ |
| テストリード | _______ | _______ | 2025/08/__ |
| 開発リード | _______ | _______ | 2025/08/__ |
| 品質保証マネージャー | _______ | _______ | 2025/08/__ |

---

**文書管理番号**: QA-E2E-PLAN-002  
**改訂履歴**:
- v1.0: 2025/08/13 初版作成
- v2.0: 2025/08/13 Phase 2計画追加