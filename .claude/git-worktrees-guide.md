# Git Worktrees 実践ガイド

## 概要
Git Worktreesを使用して、複数の機能を並行開発する環境を構築します。

## 基本コマンド

### 1. Worktree作成
```bash
# 新機能用のworktree作成
git worktree add ../PlantUML-feature-ui feature/ui-enhancement

# バグ修正用のworktree作成
git worktree add ../PlantUML-hotfix-auth hotfix/auth-bug

# 実験用のworktree作成
git worktree add ../PlantUML-experiment-ai experiment/ai-integration
```

### 2. Worktree一覧表示
```bash
git worktree list
```

### 3. Worktree削除
```bash
# worktreeディレクトリ削除
git worktree remove ../PlantUML-feature-ui

# 未使用のworktree情報をクリーンアップ
git worktree prune
```

## 推奨ディレクトリ構造

```
C:\d\
├── PlantUML\                    # メインリポジトリ (main branch)
├── PlantUML-feature-ui\          # UI機能開発用
├── PlantUML-feature-converter\   # 変換エンジン開発用
├── PlantUML-hotfix-critical\     # 緊急修正用
└── PlantUML-experiment-performance\ # パフォーマンス実験用
```

## 開発ワークフロー

### 1. 新機能開発
```bash
# 1. Worktree作成
git worktree add ../PlantUML-feature-realtime feature/realtime-preview

# 2. ディレクトリ移動
cd ../PlantUML-feature-realtime

# 3. 開発作業
# ... コード編集 ...

# 4. コミット
git add .
git commit -m "feat: リアルタイムプレビュー機能追加"

# 5. プッシュ
git push origin feature/realtime-preview

# 6. PR作成（メインディレクトリから）
cd ../PlantUML
gh pr create --base main --head feature/realtime-preview

# 7. マージ後のクリーンアップ
git worktree remove ../PlantUML-feature-realtime
```

### 2. 並行開発例
```bash
# Terminal 1: UI開発
cd ../PlantUML-feature-ui
npm run dev -- --port 8086

# Terminal 2: API開発
cd ../PlantUML-feature-api
npm run dev -- --port 8087

# Terminal 3: テスト実行
cd ../PlantUML-experiment-test
npm run test:watch
```

## ベストプラクティス

### 1. 命名規則
- feature/[機能名]: 新機能開発
- hotfix/[バグ名]: 緊急修正
- experiment/[実験名]: 実験的実装
- release/[バージョン]: リリース準備

### 2. ポート管理
各worktreeで異なるポートを使用：
- main: 8086
- feature-ui: 8087
- feature-api: 8088
- experiment: 8089

### 3. 環境変数
各worktreeに独自の.env.localファイル：
```bash
# PlantUML-feature-ui/.env.local
PORT=8087
FEATURE_FLAG_UI=true

# PlantUML-feature-api/.env.local
PORT=8088
FEATURE_FLAG_API=true
```

## トラブルシューティング

### 問題: worktree作成失敗
```bash
# エラー: 'feature/ui' is already checked out
git worktree add ../PlantUML-feature-ui feature/ui --force
```

### 問題: 削除できないworktree
```bash
# 強制削除
git worktree remove --force ../PlantUML-feature-ui

# worktree情報のクリーンアップ
git worktree prune
```

### 問題: ブランチ競合
```bash
# メインブランチの最新を取得
cd ../PlantUML
git fetch origin
git pull origin main

# worktreeでリベース
cd ../PlantUML-feature-ui
git rebase main
```

## サンプルスクリプト

### create-worktree.ps1
```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$FeatureName,
    
    [Parameter(Mandatory=$false)]
    [string]$BranchType = "feature"
)

$WorktreePath = "../PlantUML-$BranchType-$FeatureName"
$BranchName = "$BranchType/$FeatureName"

Write-Host "Creating worktree: $WorktreePath" -ForegroundColor Green
git worktree add $WorktreePath $BranchName

Write-Host "Setting up environment..." -ForegroundColor Yellow
Copy-Item .env.example "$WorktreePath/.env.local"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
Set-Location $WorktreePath
npm install

Write-Host "Worktree created successfully!" -ForegroundColor Green
Write-Host "cd $WorktreePath to start working" -ForegroundColor Cyan
```

### cleanup-worktrees.ps1
```powershell
Write-Host "Cleaning up worktrees..." -ForegroundColor Yellow

# 未使用のworktreeを削除
git worktree prune

# マージ済みブランチのworktreeを検出
$worktrees = git worktree list --porcelain | Select-String "worktree" | ForEach-Object { $_ -replace "worktree ", "" }

foreach ($worktree in $worktrees) {
    if ($worktree -ne (Get-Location).Path) {
        $branch = git -C $worktree branch --show-current
        $merged = git branch --merged main | Select-String $branch
        
        if ($merged) {
            Write-Host "Removing merged worktree: $worktree" -ForegroundColor Red
            git worktree remove $worktree
        }
    }
}

Write-Host "Cleanup completed!" -ForegroundColor Green
```

## 統合例：完全な機能開発サイクル

```powershell
# 1. 新機能の企画
$feature = "realtime-collaboration"

# 2. Worktree作成
.\create-worktree.ps1 -FeatureName $feature

# 3. 開発環境起動
cd "../PlantUML-feature-$feature"
docker-compose up -d

# 4. 開発作業
code .  # VS Code起動

# 5. テスト実行
npm run test
npm run test:e2e

# 6. コミット＆プッシュ
git add .
git commit -m "feat($feature): 実装完了"
git push origin "feature/$feature"

# 7. PR作成
gh pr create --web

# 8. マージ後のクリーンアップ
cd ../PlantUML
.\cleanup-worktrees.ps1
```

## 効果測定

### 期待される効果
- **並行開発**: 3-4機能同時開発可能
- **コンテキストスイッチ削減**: 80%削減
- **ビルド時間**: キャッシュ活用で60%短縮
- **マージコンフリクト**: 早期発見で50%削減

---

このガイドに従って、Git Worktreesを活用した効率的な並行開発を実現してください。