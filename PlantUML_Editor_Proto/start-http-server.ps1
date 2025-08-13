# PlantUML Editor HTTPサーバー起動スクリプト

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "PlantUML Editor HTTPサーバー起動" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ポート番号を設定（変更可能）
$port = 8085

# 使用可能なポートを探す関数
function Find-AvailablePort {
    param([int]$startPort = 8085)
    
    $port = $startPort
    while ($port -lt 9000) {
        $listener = $null
        try {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
            $listener.Start()
            $listener.Stop()
            return $port
        }
        catch {
            $port++
        }
        finally {
            if ($listener) { $listener.Stop() }
        }
    }
    return -1
}

# 使用可能なポートを探す
Write-Host "使用可能なポートを検索中..." -ForegroundColor Yellow
$availablePort = Find-AvailablePort -startPort $port

if ($availablePort -eq -1) {
    Write-Host "エラー: 使用可能なポートが見つかりません" -ForegroundColor Red
    exit 1
}

$port = $availablePort
Write-Host "ポート $port を使用します" -ForegroundColor Green
Write-Host ""

# Node.jsが利用可能か確認
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "Node.jsを使用してHTTPサーバーを起動します..." -ForegroundColor Green
    Write-Host "ブラウザが自動的に開きます" -ForegroundColor Yellow
    Write-Host ""
    
    # HTTPサーバーを起動
    npx http-server -p $port -o
}
# Pythonが利用可能か確認
elseif (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Pythonを使用してHTTPサーバーを起動します..." -ForegroundColor Green
    Write-Host ""
    
    # ブラウザを開く
    Start-Process "http://localhost:$port"
    
    # HTTPサーバーを起動
    python -m http.server $port
}
# Python3が利用可能か確認
elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    Write-Host "Python3を使用してHTTPサーバーを起動します..." -ForegroundColor Green
    Write-Host ""
    
    # ブラウザを開く
    Start-Process "http://localhost:$port"
    
    # HTTPサーバーを起動
    python3 -m http.server $port
}
else {
    Write-Host "エラー: Node.jsまたはPythonがインストールされていません" -ForegroundColor Red
    Write-Host "いずれかをインストールしてから再度実行してください" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Node.js: https://nodejs.org/" -ForegroundColor Cyan
    Write-Host "Python: https://www.python.org/" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Enterキーを押して終了"
    exit 1
}