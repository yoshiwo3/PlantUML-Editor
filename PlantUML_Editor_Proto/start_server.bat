@echo off
chcp 65001 >nul
echo ========================================
echo   PlantUML Editor Proto - HTTPサーバー
echo ========================================
echo.

rem Python確認
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Pythonがインストールされていません
    echo 📥 https://www.python.org からダウンロードしてください
    pause
    exit /b 1
)

rem ディレクトリ確認
cd /d "%~dp0"

rem ポート確認
netstat -an | find "8080" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️ ポート8080は既に使用中です
    echo 💡 別のポートを使用するか、使用中のプロセスを終了してください
    pause
)

echo 🚀 HTTPサーバーを起動しています...
echo.
echo 📱 ブラウザで以下のURLにアクセスしてください:
echo    http://localhost:8080
echo.
echo 📖 操作方法:
echo    - サーバー停止: Ctrl+C
echo    - ブラウザ起動: http://localhost:8080 をクリック
echo.
echo 🆘 問題が発生した場合:
echo    - より詳細な起動オプション: start-app-advanced.bat を実行
echo    - PowerShell版: start-app.ps1 を実行
echo.
echo ========================================
echo.

python -m http.server 8080