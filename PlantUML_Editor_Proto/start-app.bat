@echo off
chcp 65001 >nul
echo ========================================
echo   PlantUML Editor Proto 起動中...
echo ========================================
echo.

rem Python確認
echo 🔍 Python環境を確認しています...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Pythonがインストールされていません
    echo.
    echo 📥 以下のURLからPythonをインストールしてください:
    echo    https://www.python.org
    echo.
    echo ⚠️  インストール時は「Add Python to PATH」をチェックしてください
    echo.
    pause
    exit /b 1
)

rem Python バージョン表示
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ %PYTHON_VERSION% が見つかりました

rem ポート確認
echo.
echo 🔍 ポート8080の使用状況を確認しています...
netstat -an | find "8080" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️ ポート8080は既に使用中です
    echo.
    echo 使用可能なポート番号を入力してください
    set /p port="ポート番号 (推奨: 8081-8090): "
    if "!port!"=="" set port=8081
) else (
    set port=8080
    echo ✅ ポート8080は使用可能です
)

rem ディレクトリ確認
echo.
echo 📁 ディレクトリを確認しています...
cd /d "%~dp0"
echo ✅ 作業ディレクトリ: %CD%

rem 必要なファイルの存在確認
if not exist "index.html" (
    echo ❌ index.htmlが見つかりません
    echo    このスクリプトをPlantUML_Editor_Protoフォルダに配置してください
    pause
    exit /b 1
)

rem HTTPサーバー起動
echo.
echo 🚀 HTTPサーバーを起動しています...
echo    ポート: %port%
echo    URL: http://localhost:%port%
echo.

rem サーバー起動（バックグラウンド）
start /b python -m http.server %port%

rem 少し待機してサーバー起動を確認
echo ⏳ サーバー起動を待機中...
timeout /t 3 /nobreak >nul

rem サーバー確認
powershell -Command "(New-Object Net.WebClient).DownloadString('http://localhost:%port%')" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ サーバーが正常に起動しました
) else (
    echo ⚠️ サーバー起動の確認ができませんが、続行します
)

rem ブラウザ起動
echo.
echo 🌐 ブラウザを起動しています...
start http://localhost:%port%

echo.
echo ========================================
echo ✅ 起動完了！
echo.
echo 📱 アプリケーション URL:
echo    http://localhost:%port%
echo.
echo 📖 使用方法:
echo    - ブラウザでアプリケーションが開きます
echo    - このウィンドウを閉じるとサーバーが停止します
echo    - 手動停止: Ctrl+C
echo.
echo 🆘 問題が発生した場合:
echo    1. ウイルス対策ソフトが実行をブロックしていないか確認
echo    2. Windows Defenderの除外設定を確認
echo    3. 管理者として実行してみる
echo ========================================
echo.

rem サーバー実行を継続（フォアグラウンド）
echo 📊 サーバーログ:
echo ---------------------------------------
python -m http.server %port%