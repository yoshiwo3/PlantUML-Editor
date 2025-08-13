# PlantUML Editor Proto 起動スクリプト (PowerShell版)
# 文字コード: UTF-8 (BOM無し)
# 実行ポリシー設定が必要な場合: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# UTF-8出力の設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PlantUML Editor Proto 起動中..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Python確認
Write-Host "🔍 Python環境を確認しています..." -ForegroundColor Blue
try {
    $pythonVersion = python --version 2>$null
    if ($pythonVersion) {
        Write-Host "✅ Python検出: $pythonVersion" -ForegroundColor Green
    } else {
        throw "Python not found"
    }
} catch {
    Write-Host "❌ Pythonがインストールされていません" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 以下のURLからPythonをインストールしてください:" -ForegroundColor Yellow
    Write-Host "   https://www.python.org" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  インストール時は「Add Python to PATH」をチェックしてください" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Enterキーを押して終了"
    exit 1
}

# Node.js確認（利用可能な場合は選択肢として提示）
$nodeAvailable = $false
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        $nodeAvailable = $true
        Write-Host "✅ Node.js検出: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "ℹ️ Node.jsは見つかりませんが、Pythonで実行します" -ForegroundColor Yellow
}

# サーバー選択
if ($nodeAvailable) {
    Write-Host ""
    Write-Host "🔧 使用するHTTPサーバーを選択してください:" -ForegroundColor Blue
    Write-Host "  1. Python (推奨)" -ForegroundColor White
    Write-Host "  2. Node.js (npx http-server)" -ForegroundColor White
    $serverChoice = Read-Host "選択 (1-2, デフォルト: 1)"
    if (!$serverChoice) { $serverChoice = "1" }
} else {
    $serverChoice = "1"
}

# ポート自動検索機能
Write-Host ""
Write-Host "🔍 利用可能なポートを検索しています..." -ForegroundColor Blue

$port = 8080
$maxPort = 8090
$portFound = $false

for ($p = $port; $p -le $maxPort; $p++) {
    $tcpConnection = Test-NetConnection -ComputerName localhost -Port $p -InformationLevel Quiet -WarningAction SilentlyContinue
    if (-not $tcpConnection) {
        $port = $p
        $portFound = $true
        Write-Host "✅ ポート$port が利用可能です" -ForegroundColor Green
        break
    } else {
        Write-Host "⚠️ ポート$p は既に使用中" -ForegroundColor Yellow
    }
}

if (-not $portFound) {
    Write-Host "❌ ポート8080-8090の範囲で利用可能なポートが見つかりません" -ForegroundColor Red
    $customPort = Read-Host "手動でポート番号を入力してください"
    if ($customPort -match '^\d+$' -and $customPort -gt 1024 -and $customPort -lt 65536) {
        $port = $customPort
    } else {
        Write-Host "❌ 無効なポート番号です" -ForegroundColor Red
        exit 1
    }
}

# ディレクトリ確認・移動
Write-Host ""
Write-Host "📁 ディレクトリを確認しています..." -ForegroundColor Blue
Set-Location $PSScriptRoot
Write-Host "✅ 作業ディレクトリ: $(Get-Location)" -ForegroundColor Green

# 必要なファイルの存在確認
$requiredFiles = @("index.html", "app.js", "styles.css")
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ 必要なファイルが見つかりません: $file" -ForegroundColor Red
        Read-Host "Enterキーを押して終了"
        exit 1
    }
}
Write-Host "✅ 必要なファイルが確認できました" -ForegroundColor Green

# HTTPサーバー起動
Write-Host ""
Write-Host "🚀 HTTPサーバーを起動しています..." -ForegroundColor Green
Write-Host "   サーバー: $(if ($serverChoice -eq '2') { 'Node.js (http-server)' } else { 'Python' })" -ForegroundColor White
Write-Host "   ポート: $port" -ForegroundColor White
Write-Host "   URL: http://localhost:$port" -ForegroundColor White
Write-Host ""

# サーバー起動（バックグラウンド）
try {
    if ($serverChoice -eq "2" -and $nodeAvailable) {
        # Node.js版
        $job = Start-Job -ScriptBlock {
            param($path, $port)
            Set-Location $path
            npx http-server -p $port -c-1 --silent
        } -ArgumentList $PSScriptRoot, $port
    } else {
        # Python版
        $job = Start-Job -ScriptBlock {
            param($path, $port)
            Set-Location $path
            python -m http.server $port
        } -ArgumentList $PSScriptRoot, $port
    }
    
    # サーバー起動待機
    Write-Host "⏳ サーバー起動を待機中..." -ForegroundColor Blue
    Start-Sleep -Seconds 3
    
    # 健全性チェック
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ サーバーが正常に起動しました" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ サーバー起動の確認ができませんが、続行します" -ForegroundColor Yellow
    }
    
    # ブラウザ起動
    Write-Host ""
    Write-Host "🌐 ブラウザを起動しています..." -ForegroundColor Green
    Start-Process "http://localhost:$port"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ 起動完了！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 アプリケーション URL:" -ForegroundColor Blue
    Write-Host "   http://localhost:$port" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 使用方法:" -ForegroundColor Blue
    Write-Host "   - ブラウザでアプリケーションが開きます" -ForegroundColor White
    Write-Host "   - 終了するには Ctrl+C を押してください" -ForegroundColor White
    Write-Host ""
    Write-Host "🆘 問題が発生した場合:" -ForegroundColor Blue
    Write-Host "   1. PowerShell実行ポリシーを確認" -ForegroundColor White
    Write-Host "   2. ウイルス対策ソフトの設定を確認" -ForegroundColor White
    Write-Host "   3. 管理者として実行してみる" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # ログファイル作成
    $logFile = "start-app-log-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    "PlantUML Editor Proto 起動ログ" | Out-File $logFile
    "起動時刻: $(Get-Date)" | Out-File $logFile -Append
    "ポート: $port" | Out-File $logFile -Append
    "サーバー: $(if ($serverChoice -eq '2') { 'Node.js' } else { 'Python' })" | Out-File $logFile -Append
    "PID: $($job.Id)" | Out-File $logFile -Append
    
    Write-Host "📊 サーバーログ:" -ForegroundColor Blue
    Write-Host "--------------------------------------" -ForegroundColor Gray
    
    # サーバーのログを表示
    try {
        Receive-Job $job -Wait
    } catch {
        Write-Host "❌ サーバーが予期せず終了しました" -ForegroundColor Red
    } finally {
        # クリーンアップ
        Remove-Job $job -Force -ErrorAction SilentlyContinue
        "終了時刻: $(Get-Date)" | Out-File $logFile -Append
        Write-Host "📄 ログファイル: $logFile" -ForegroundColor Blue
    }
    
} catch {
    Write-Host "❌ サーバー起動に失敗しました: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Enterキーを押して終了"
    exit 1
}