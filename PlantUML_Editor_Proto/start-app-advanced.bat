@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

rem ========================================
rem PlantUML Editor Proto - 高機能起動スクリプト
rem ========================================
rem 機能:
rem - 複数HTTPサーバー対応 (Python/Node.js/npm)
rem - ポート自動検索 (8080-8090)
rem - 詳細なシステム診断
rem - 実行ログ記録
rem - 健全性チェック
rem - エラー時詳細サポート
rem ========================================

set "SCRIPT_VERSION=2.0"
set "START_TIME=%date% %time%"
set "LOG_FILE=start-app-log-%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt"
set "LOG_FILE=!LOG_FILE: =0!"

echo ========================================
echo   PlantUML Editor Proto v%SCRIPT_VERSION%
echo   高機能起動システム
echo ========================================
echo.

rem ログ開始
echo PlantUML Editor Proto 起動ログ > "!LOG_FILE!"
echo 開始時刻: !START_TIME! >> "!LOG_FILE!"
echo スクリプトバージョン: %SCRIPT_VERSION% >> "!LOG_FILE!"
echo. >> "!LOG_FILE!"

rem システム情報収集
echo 🔍 システム情報を収集しています...
echo [システム情報] >> "!LOG_FILE!"
echo OS: %OS% >> "!LOG_FILE!"
echo プロセッサ: %PROCESSOR_IDENTIFIER% >> "!LOG_FILE!"
echo ユーザー: %USERNAME% >> "!LOG_FILE!"
echo コンピューター: %COMPUTERNAME% >> "!LOG_FILE!"
echo. >> "!LOG_FILE!"

rem 管理者権限確認
net session >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 管理者権限で実行中
    echo 管理者権限: はい >> "!LOG_FILE!"
) else (
    echo ⚠️ 管理者権限なしで実行中
    echo 管理者権限: いいえ >> "!LOG_FILE!"
)

rem ディレクトリ確認
echo.
echo 📁 ディレクトリを確認しています...
cd /d "%~dp0"
echo ✅ 作業ディレクトリ: %CD%
echo 作業ディレクトリ: %CD% >> "!LOG_FILE!"

rem 必要なファイル確認
echo.
echo 📋 必要なファイルを確認しています...
set "MISSING_FILES="
set "REQUIRED_FILES=index.html app.js styles.css"

for %%F in (%REQUIRED_FILES%) do (
    if exist "%%F" (
        echo ✅ %%F
    ) else (
        echo ❌ %%F (見つかりません)
        set "MISSING_FILES=!MISSING_FILES! %%F"
    )
)

if defined MISSING_FILES (
    echo.
    echo ❌ 必要なファイルが見つかりません:!MISSING_FILES!
    echo 必要なファイルが見つかりません:!MISSING_FILES! >> "!LOG_FILE!"
    echo.
    echo 🔧 対処法:
    echo    1. PlantUML_Editor_Protoフォルダに移動してください
    echo    2. ファイルが存在することを確認してください
    pause
    exit /b 1
)

rem HTTPサーバー環境確認
echo.
echo 🔍 HTTPサーバー環境を確認しています...

rem Python確認
set "PYTHON_AVAILABLE=0"
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do set "PYTHON_VERSION=%%i"
    echo ✅ !PYTHON_VERSION!
    echo Python: !PYTHON_VERSION! >> "!LOG_FILE!"
    set "PYTHON_AVAILABLE=1"
) else (
    echo ❌ Python未検出
    echo Python: 未検出 >> "!LOG_FILE!"
)

rem Node.js確認
set "NODE_AVAILABLE=0"
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version 2^>^&1') do set "NODE_VERSION=%%i"
    echo ✅ Node.js !NODE_VERSION!
    echo Node.js: !NODE_VERSION! >> "!LOG_FILE!"
    set "NODE_AVAILABLE=1"
) else (
    echo ❌ Node.js未検出
    echo Node.js: 未検出 >> "!LOG_FILE!"
)

rem npm確認
set "NPM_AVAILABLE=0"
if !NODE_AVAILABLE! equ 1 (
    npm --version >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%i in ('npm --version 2^>^&1') do set "NPM_VERSION=%%i"
        echo ✅ npm !NPM_VERSION!
        echo npm: !NPM_VERSION! >> "!LOG_FILE!"
        set "NPM_AVAILABLE=1"
    )
)

rem package.json確認
set "PACKAGE_JSON_AVAILABLE=0"
if exist "package.json" (
    echo ✅ package.json検出
    echo package.json: 検出 >> "!LOG_FILE!"
    set "PACKAGE_JSON_AVAILABLE=1"
) else (
    echo ⚠️ package.json未検出
    echo package.json: 未検出 >> "!LOG_FILE!"
)

rem サーバー選択
echo.
echo 🔧 HTTPサーバーを選択してください:

set "SERVER_OPTIONS="
set "OPTION_COUNT=0"

if !PYTHON_AVAILABLE! equ 1 (
    set /a OPTION_COUNT+=1
    echo   !OPTION_COUNT!. Python HTTP Server (推奨)
    set "SERVER_OPTIONS=!SERVER_OPTIONS! !OPTION_COUNT!:python"
)

if !NPM_AVAILABLE! equ 1 if !PACKAGE_JSON_AVAILABLE! equ 1 (
    set /a OPTION_COUNT+=1
    echo   !OPTION_COUNT!. npm start
    set "SERVER_OPTIONS=!SERVER_OPTIONS! !OPTION_COUNT!:npm"
)

if !NODE_AVAILABLE! equ 1 (
    set /a OPTION_COUNT+=1
    echo   !OPTION_COUNT!. Node.js http-server
    set "SERVER_OPTIONS=!SERVER_OPTIONS! !OPTION_COUNT!:node"
)

if !OPTION_COUNT! equ 0 (
    echo ❌ 利用可能なHTTPサーバーがありません
    echo.
    echo 🔧 解決方法:
    echo    1. Pythonをインストール: https://www.python.org
    echo    2. Node.jsをインストール: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo   !OPTION_COUNT!. 診断モード (システム診断のみ)
set /a OPTION_COUNT+=1

echo.
set /p "SERVER_CHOICE=選択 (1-!OPTION_COUNT!, デフォルト: 1): "
if "!SERVER_CHOICE!"=="" set "SERVER_CHOICE=1"

rem 診断モード
if !SERVER_CHOICE! equ !OPTION_COUNT! (
    echo.
    echo 🔍 システム診断を実行しています...
    echo.
    call :SystemDiagnosis
    pause
    exit /b 0
)

rem ポート自動検索
echo.
echo 🔍 利用可能なポートを検索しています...
set "PORT=8080"
set "MAX_PORT=8090"
set "PORT_FOUND=0"

for /l %%P in (8080,1,!MAX_PORT!) do (
    netstat -an | find ":%%P " >nul 2>&1
    if !errorlevel! neq 0 (
        set "PORT=%%P"
        set "PORT_FOUND=1"
        echo ✅ ポート%%P が利用可能です
        goto :PortSelected
    ) else (
        echo ⚠️ ポート%%P は使用中
    )
)

:PortSelected
if !PORT_FOUND! equ 0 (
    echo ❌ ポート8080-!MAX_PORT!の範囲で利用可能なポートが見つかりません
    echo.
    set /p "CUSTOM_PORT=手動でポート番号を入力してください (1024-65535): "
    if "!CUSTOM_PORT!" neq "" (
        set "PORT=!CUSTOM_PORT!"
    ) else (
        echo ❌ 無効なポート番号です
        pause
        exit /b 1
    )
)

echo ポート: !PORT! >> "!LOG_FILE!"

rem サーバー起動
echo.
echo 🚀 HTTPサーバーを起動しています...
echo    選択: !SERVER_CHOICE!
echo    ポート: !PORT!
echo    URL: http://localhost:!PORT!

rem サーバー種別に応じた起動
if !SERVER_CHOICE! equ 1 if !PYTHON_AVAILABLE! equ 1 (
    echo    サーバー: Python HTTP Server
    echo サーバー: Python HTTP Server >> "!LOG_FILE!"
    start /b python -m http.server !PORT!
    set "SERVER_TYPE=python"
) else if !SERVER_CHOICE! equ 2 if !NPM_AVAILABLE! equ 1 (
    echo    サーバー: npm start
    echo サーバー: npm start >> "!LOG_FILE!"
    start /b npm start
    set "SERVER_TYPE=npm"
) else if !NODE_AVAILABLE! equ 1 (
    echo    サーバー: Node.js http-server
    echo サーバー: Node.js http-server >> "!LOG_FILE!"
    start /b npx http-server -p !PORT! -c-1
    set "SERVER_TYPE=node"
) else (
    echo ❌ 選択されたサーバーが利用できません
    pause
    exit /b 1
)

rem 起動待機
echo.
echo ⏳ サーバー起動を待機中...
timeout /t 5 /nobreak >nul

rem 健全性チェック
echo 🔍 サーバー健全性チェック中...
powershell -Command "try { (New-Object Net.WebClient).DownloadString('http://localhost:!PORT!') >$null; exit 0 } catch { exit 1 }" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ サーバーが正常に動作しています
    echo 健全性チェック: 成功 >> "!LOG_FILE!"
) else (
    echo ⚠️ サーバー応答を確認できませんが、続行します
    echo 健全性チェック: 応答なし >> "!LOG_FILE!"
)

rem ブラウザ起動
echo.
echo 🌐 ブラウザを起動しています...
start http://localhost:!PORT!
echo ブラウザ起動: http://localhost:!PORT! >> "!LOG_FILE!"

rem 完了メッセージ
echo.
echo ========================================
echo ✅ 起動完了！
echo.
echo 📱 アプリケーション URL:
echo    http://localhost:!PORT!
echo.
echo 📊 起動情報:
echo    サーバー: !SERVER_TYPE!
echo    ポート: !PORT!
echo    ログファイル: !LOG_FILE!
echo.
echo 📖 操作方法:
echo    - ブラウザでアプリケーションが開きます
echo    - サーバー停止: このウィンドウを閉じる / Ctrl+C
echo    - 問題発生時: !LOG_FILE! を確認
echo.
echo 🆘 トラブルシューティング:
echo    1. ブラウザでCORSエラー表示 → 正常 (file://ではない)
echo    2. ポート変更が必要 → このスクリプトを再実行
echo    3. アプリが動作しない → ログファイルを確認
echo    4. 詳細診断が必要 → 診断モードで再実行
echo ========================================
echo.

echo 終了時刻: %date% %time% >> "!LOG_FILE!"
echo ログ記録完了 >> "!LOG_FILE!"

rem サーバー継続実行
echo 📊 サーバーログ:
echo ---------------------------------------
if "!SERVER_TYPE!"=="python" (
    python -m http.server !PORT!
) else (
    echo サーバーはバックグラウンドで動作中...
    echo このウィンドウを閉じるまで待機します...
    pause >nul
)

goto :eof

rem ========================================
rem システム診断サブルーチン
rem ========================================
:SystemDiagnosis
echo 💻 システム診断レポート
echo ========================================
echo.
echo 【環境情報】
echo OS: %OS%
echo プロセッサ: %PROCESSOR_IDENTIFIER%
echo ユーザー: %USERNAME%
echo.
echo 【ネットワーク】
echo ホスト名: %COMPUTERNAME%
netsh interface show interface 2>nul | find "接続済み" && echo ✅ ネットワーク接続: 正常 || echo ❌ ネットワーク接続: 問題あり
echo.
echo 【利用可能ポート】
for /l %%P in (8080,1,8090) do (
    netstat -an | find ":%%P " >nul 2>&1
    if !errorlevel! neq 0 (
        echo ✅ ポート%%P: 利用可能
    ) else (
        echo ❌ ポート%%P: 使用中
    )
)
echo.
echo 【セキュリティ】
net session >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ 管理者権限: あり
) else (
    echo ⚠️ 管理者権限: なし
)
echo.
echo 【推奨事項】
if !PYTHON_AVAILABLE! equ 0 if !NODE_AVAILABLE! equ 0 (
    echo ❗ PythonまたはNode.jsのインストールが必要です
)
if !PYTHON_AVAILABLE! equ 1 (
    echo ✅ Pythonが利用可能 - 推奨設定です
)
if !NODE_AVAILABLE! equ 1 (
    echo ✅ Node.jsが利用可能 - 高機能サーバーとして使用可能
)
echo.
goto :eof