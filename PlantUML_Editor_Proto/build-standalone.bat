@echo off
setlocal EnableDelayedExpansion

REM =============================================================================
REM PlantUML Editor Proto - スタンドアロンビルド実行スクリプト
REM 
REM 完全スタンドアロン版を一括ビルドします。
REM - ES6モジュール統合
REM - CSS/JSインライン化
REM - 画像Base64化
REM - PWA対応
REM - 複数出力形式
REM 
REM Version: 2.0.0
REM Author: PlantUML Editor Development Team
REM =============================================================================

echo.
echo ================================================================
echo ^|                                                              ^|
echo ^|       PlantUML Editor Proto - スタンドアロンビルダー           ^|
echo ^|                                                              ^|
echo ^|              完全統合ビルドシステム v2.0.0                    ^|
echo ^|                                                              ^|
echo ================================================================
echo.

REM 環境変数設定
set PROJECT_ROOT=%~dp0
set SCRIPTS_DIR=%PROJECT_ROOT%scripts
set DIST_DIR=%PROJECT_ROOT%dist
set LOG_FILE=%PROJECT_ROOT%build.log

REM ビルドオプション（デフォルト値）
set BUILD_MINIFY=true
set BUILD_SOURCEMAP=true
set BUILD_PWA=true
set BUILD_DEBUG=false
set BUILD_OBFUSCATE=false
set BUILD_TARGET_SIZE=3072
set BUILD_CLEAN=true

echo 📂 プロジェクトルート: %PROJECT_ROOT%
echo 🔧 スクリプトディレクトリ: %SCRIPTS_DIR%
echo 📦 出力ディレクトリ: %DIST_DIR%
echo 📝 ログファイル: %LOG_FILE%
echo.

REM ログファイル初期化
echo [%date% %time%] PlantUML Editor スタンドアロンビルド開始 > "%LOG_FILE%"

REM =============================================================================
REM コマンドライン引数解析
REM =============================================================================

:parse_args
if "%~1"=="" goto check_environment

if /i "%~1"=="--help" goto show_help
if /i "%~1"=="-h" goto show_help
if /i "%~1"=="--no-minify" set BUILD_MINIFY=false
if /i "%~1"=="--no-sourcemap" set BUILD_SOURCEMAP=false
if /i "%~1"=="--no-pwa" set BUILD_PWA=false
if /i "%~1"=="--debug" set BUILD_DEBUG=true
if /i "%~1"=="--obfuscate" set BUILD_OBFUSCATE=true
if /i "%~1"=="--no-clean" set BUILD_CLEAN=false
if /i "%~1"=="--target-size" (
    shift
    set BUILD_TARGET_SIZE=%~1
)

shift
goto parse_args

:show_help
echo.
echo 使用方法: build-standalone.bat [オプション]
echo.
echo オプション:
echo   --help, -h          このヘルプを表示
echo   --no-minify         minifyを無効化
echo   --no-sourcemap      ソースマップ生成を無効化
echo   --no-pwa            PWA機能を無効化
echo   --debug             デバッグモードを有効化
echo   --obfuscate         コード難読化を有効化
echo   --no-clean          ビルド前のクリーンアップをスキップ
echo   --target-size SIZE  目標ファイルサイズ（KB）
echo.
echo 例:
echo   build-standalone.bat
echo   build-standalone.bat --debug --no-minify
echo   build-standalone.bat --obfuscate --target-size 2048
echo.
goto :eof

REM =============================================================================
REM 環境チェック
REM =============================================================================

:check_environment
echo 🔍 環境チェック中...

REM Node.jsチェック
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.jsが見つかりません。
    echo    Node.js 16.0.0以上をインストールしてください。
    echo    ダウンロード: https://nodejs.org/
    echo    現在のパス: %PATH%
    echo [%date% %time%] エラー: Node.jsが見つかりません >> "%LOG_FILE%"
    pause
    exit /b 1
)

for /f "tokens=1" %%v in ('node --version') do set NODE_VERSION=%%v
echo ✅ Node.js %NODE_VERSION% 検出

REM npmチェック
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npmが見つかりません。
    echo [%date% %time%] エラー: npmが見つかりません >> "%LOG_FILE%"
    pause
    exit /b 1
)

for /f "tokens=1" %%v in ('npm --version') do set NPM_VERSION=%%v
echo ✅ npm %NPM_VERSION% 検出

REM プロジェクトファイルチェック
if not exist "%PROJECT_ROOT%package.json" (
    echo ❌ package.jsonが見つかりません。
    echo    プロジェクトルートディレクトリで実行してください。
    echo [%date% %time%] エラー: package.jsonが見つかりません >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo ✅ package.json 検出

if not exist "%SCRIPTS_DIR%\standalone-builder.js" (
    echo ❌ standalone-builder.jsが見つかりません。
    echo    scriptsディレクトリを確認してください。
    echo [%date% %time%] エラー: standalone-builder.jsが見つかりません >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo ✅ standalone-builder.js 検出
echo.

REM =============================================================================
REM 依存関係チェック・インストール
REM =============================================================================

echo 📦 依存関係チェック中...

REM package.jsonの存在チェック（再確認）
if exist "%PROJECT_ROOT%package.json" (
    echo ✅ package.json 確認済み
    
    REM node_modules存在チェック
    if not exist "%PROJECT_ROOT%node_modules" (
        echo 📥 依存関係をインストール中...
        echo [%date% %time%] npm install 実行開始 >> "%LOG_FILE%"
        
        cd /d "%PROJECT_ROOT%"
        npm install
        
        if errorlevel 1 (
            echo ❌ 依存関係のインストールに失敗しました。
            echo    エラー詳細をログファイルで確認してください: %LOG_FILE%
            echo [%date% %time%] エラー: npm install 失敗 >> "%LOG_FILE%"
            pause
            exit /b 1
        )
        
        echo ✅ 依存関係インストール完了
        echo [%date% %time%] npm install 完了 >> "%LOG_FILE%"
    ) else (
        echo ✅ node_modules 既存
    )
) else (
    echo ❌ package.jsonが見つかりません
    exit /b 1
)

echo.

REM =============================================================================
REM ビルド前クリーンアップ
REM =============================================================================

if "%BUILD_CLEAN%"=="true" (
    echo 🧹 ビルド前クリーンアップ実行中...
    
    if exist "%DIST_DIR%" (
        echo    🗑️ 既存のdistディレクトリを削除中...
        rmdir /s /q "%DIST_DIR%" 2>nul
        if exist "%DIST_DIR%" (
            echo    ⚠️ distディレクトリの削除に失敗しました（ファイルが使用中の可能性）
            echo    手動で削除してから再実行してください: %DIST_DIR%
            echo [%date% %time%] 警告: distディレクトリ削除失敗 >> "%LOG_FILE%"
        ) else (
            echo    ✅ distディレクトリ削除完了
        )
    )
    
    REM ログファイル以外の一時ファイルクリーンアップ
    if exist "%PROJECT_ROOT%*.tmp" del /q "%PROJECT_ROOT%*.tmp" 2>nul
    if exist "%PROJECT_ROOT%*.temp" del /q "%PROJECT_ROOT%*.temp" 2>nul
    
    echo ✅ クリーンアップ完了
    echo.
)

REM =============================================================================
REM ビルド設定表示
REM =============================================================================

echo 📋 ビルド設定:
echo    🗜️  Minify: %BUILD_MINIFY%
echo    🗺️  SourceMap: %BUILD_SOURCEMAP%
echo    📱 PWA: %BUILD_PWA%
echo    🐛 Debug: %BUILD_DEBUG%
echo    🔒 Obfuscate: %BUILD_OBFUSCATE%
echo    🎯 Target Size: %BUILD_TARGET_SIZE%KB
echo    🧹 Clean: %BUILD_CLEAN%
echo.

echo [%date% %time%] ビルド設定: minify=%BUILD_MINIFY%, sourcemap=%BUILD_SOURCEMAP%, pwa=%BUILD_PWA%, debug=%BUILD_DEBUG%, obfuscate=%BUILD_OBFUSCATE%, target=%BUILD_TARGET_SIZE%KB >> "%LOG_FILE%"

REM =============================================================================
REM メインビルド実行
REM =============================================================================

echo 🚀 スタンドアロンビルド実行中...
echo    This may take a few moments...
echo.

cd /d "%PROJECT_ROOT%"

REM ビルドコマンド構築
set BUILD_CMD=node "%SCRIPTS_DIR%\standalone-builder.js"

if "%BUILD_MINIFY%"=="false" set BUILD_CMD=%BUILD_CMD% --no-minify
if "%BUILD_SOURCEMAP%"=="false" set BUILD_CMD=%BUILD_CMD% --no-sourcemap
if "%BUILD_PWA%"=="false" set BUILD_CMD=%BUILD_CMD% --no-pwa
if "%BUILD_DEBUG%"=="true" set BUILD_CMD=%BUILD_CMD% --debug
if "%BUILD_OBFUSCATE%"=="true" set BUILD_CMD=%BUILD_CMD% --obfuscate
set BUILD_CMD=%BUILD_CMD% --target-size %BUILD_TARGET_SIZE%

echo 💻 実行コマンド: %BUILD_CMD%
echo [%date% %time%] ビルドコマンド実行: %BUILD_CMD% >> "%LOG_FILE%"
echo.

REM ビルド実行
%BUILD_CMD%

set BUILD_EXIT_CODE=%errorlevel%

echo.
echo [%date% %time%] ビルド終了コード: %BUILD_EXIT_CODE% >> "%LOG_FILE%"

REM =============================================================================
REM ビルド結果確認
REM =============================================================================

if %BUILD_EXIT_CODE% neq 0 (
    echo ❌ ビルドが失敗しました。
    echo    終了コード: %BUILD_EXIT_CODE%
    echo    詳細はログファイルを確認してください: %LOG_FILE%
    echo.
    echo 🔧 トラブルシューティング:
    echo    1. Node.js バージョンが16.0.0以上か確認
    echo    2. npm install が正常に完了しているか確認
    echo    3. ディスク容量が十分にあるか確認
    echo    4. アンチウイルスソフトがビルドファイルをブロックしていないか確認
    echo    5. 管理者権限で実行してみる
    echo.
    pause
    exit /b %BUILD_EXIT_CODE%
)

echo.
echo 🎉 ビルド成功！
echo.

REM 出力ファイル確認
echo 📁 出力ファイル確認中...

set OUTPUT_COUNT=0

if exist "%DIST_DIR%\standalone\plantuml-editor-standalone.html" (
    for %%f in ("%DIST_DIR%\standalone\plantuml-editor-standalone.html") do (
        echo    📄 Standalone版: %%~nxf (%%~zf bytes)
        set /a OUTPUT_COUNT+=1
    )
)

if exist "%DIST_DIR%\debug\plantuml-editor-debug.html" (
    for %%f in ("%DIST_DIR%\debug\plantuml-editor-debug.html") do (
        echo    🐛 Debug版: %%~nxf (%%~zf bytes)
        set /a OUTPUT_COUNT+=1
    )
)

if exist "%DIST_DIR%\minimal\plantuml-editor-minimal.html" (
    for %%f in ("%DIST_DIR%\minimal\plantuml-editor-minimal.html") do (
        echo    📦 Minimal版: %%~nxf (%%~zf bytes)
        set /a OUTPUT_COUNT+=1
    )
)

if exist "%DIST_DIR%\build-info.json" (
    echo    📊 Build Info: build-info.json
)

if "%BUILD_PWA%"=="true" (
    if exist "%DIST_DIR%\service-worker.js" (
        echo    📱 Service Worker: service-worker.js
    )
    if exist "%DIST_DIR%\manifest.json" (
        echo    📋 PWA Manifest: manifest.json
    )
)

echo.
echo 📊 生成ファイル数: %OUTPUT_COUNT%

if %OUTPUT_COUNT% equ 0 (
    echo ⚠️ 出力ファイルが見つかりません。
    echo    ビルドが部分的に失敗した可能性があります。
    echo    ログファイルを確認してください: %LOG_FILE%
)

REM =============================================================================
REM ビルド後の動作確認・テスト
REM =============================================================================

echo.
echo 🧪 ビルド後テスト実行中...

REM ファイルサイズチェック
if exist "%DIST_DIR%\standalone\plantuml-editor-standalone.html" (
    for %%f in ("%DIST_DIR%\standalone\plantuml-editor-standalone.html") do (
        set FILE_SIZE=%%~zf
        set /a FILE_SIZE_KB=!FILE_SIZE!/1024
        
        echo    📏 Standalone版サイズ: !FILE_SIZE_KB!KB (!FILE_SIZE! bytes)
        
        if !FILE_SIZE_KB! leq %BUILD_TARGET_SIZE% (
            echo    ✅ サイズ目標達成: !FILE_SIZE_KB!KB ≤ %BUILD_TARGET_SIZE%KB
        ) else (
            echo    ⚠️ サイズ目標未達成: !FILE_SIZE_KB!KB > %BUILD_TARGET_SIZE%KB
            echo       最適化オプションを検討してください（--obfuscate, --no-sourcemap等）
        )
    )
)

REM HTML構文チェック（基本的）
if exist "%DIST_DIR%\standalone\plantuml-editor-standalone.html" (
    findstr /i "<!DOCTYPE html>" "%DIST_DIR%\standalone\plantuml-editor-standalone.html" >nul
    if !errorlevel! equ 0 (
        echo    ✅ HTML文書型宣言: 正常
    ) else (
        echo    ⚠️ HTML文書型宣言: 見つかりません
    )
    
    findstr /i "</body>" "%DIST_DIR%\standalone\plantuml-editor-standalone.html" >nul
    if !errorlevel! equ 0 (
        echo    ✅ HTMLクロージングタグ: 正常
    ) else (
        echo    ⚠️ HTMLクロージングタグ: 見つかりません
    )
)

echo ✅ ビルド後テスト完了
echo.

REM =============================================================================
REM 使用ガイド表示
REM =============================================================================

echo 📖 使用方法:
echo.
echo 🌐 ブラウザで直接開く:
if exist "%DIST_DIR%\standalone\plantuml-editor-standalone.html" (
    echo    📄 "%DIST_DIR%\standalone\plantuml-editor-standalone.html"
)
echo    ✅ file:// プロトコルで動作します（サーバー不要）
echo    ✅ インターネット接続なしでも基本機能が利用可能
echo.

if "%BUILD_PWA%"=="true" (
    echo 📱 PWA（プログレッシブWebアプリ）として使用:
    echo    1. Webサーバーで配信
    echo    2. ブラウザでアクセス
    echo    3. "アプリをインストール" ボタンをクリック
    echo    4. デスクトップアプリとして利用可能
    echo.
)

echo 🔧 開発・デバッグ:
if exist "%DIST_DIR%\debug\plantuml-editor-debug.html" (
    echo    🐛 Debug版: "%DIST_DIR%\debug\plantuml-editor-debug.html"
    echo       ソースマップ付き、デバッグコンソール利用可能
)
echo.

echo 📦 配布・デプロイ:
if exist "%DIST_DIR%\minimal\plantuml-editor-minimal.html" (
    echo    📦 Minimal版: "%DIST_DIR%\minimal\plantuml-editor-minimal.html"
    echo       軽量版、基本機能のみ
)
echo    🌐 Webサーバーに配置するだけで利用可能
echo    📂 単一HTMLファイルなので配布が簡単
echo.

REM =============================================================================
REM 最終メッセージ・ログ出力
REM =============================================================================

echo [%date% %time%] ビルド正常終了 >> "%LOG_FILE%"

echo ================================================================
echo ^|                                                              ^|
echo ^|                    🎉 ビルド完了！ 🎉                        ^|
echo ^|                                                              ^|
echo ^|   PlantUML Editor のスタンドアロン版が正常に生成されました    ^|
echo ^|                                                              ^|
echo ^|              file:// プロトコルで動作します                   ^|
echo ^|                                                              ^|
echo ================================================================
echo.

echo 📝 詳細ログ: %LOG_FILE%
echo 📁 出力ディレクトリ: %DIST_DIR%
echo ⏱️ ビルド時間: %date% %time%
echo.

echo このウィンドウを閉じるには何かキーを押してください...
pause >nul

goto :eof

REM =============================================================================
REM エラーハンドリング・復旧
REM =============================================================================

:error_recovery
echo.
echo 🚨 エラーリカバリモード
echo.
echo 基本的なスタンドアロン版の生成を試行します...

REM 最小限のHTMLファイル生成
mkdir "%DIST_DIR%" 2>nul
mkdir "%DIST_DIR%\emergency" 2>nul

echo ^<!DOCTYPE html^> > "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^<html lang="ja"^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^<head^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^<meta charset="UTF-8"^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^<title^>PlantUML Editor - Emergency Mode^</title^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^</head^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^<body^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^<h1^>PlantUML Editor - Emergency Mode^</h1^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^<p^>通常のビルドに失敗したため、緊急モードで最小限の機能を提供します。^</p^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^</body^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"
echo ^</html^> >> "%DIST_DIR%\emergency\plantuml-editor-emergency.html"

echo ✅ 緊急用ファイルを生成しました: %DIST_DIR%\emergency\plantuml-editor-emergency.html
echo.

goto :eof