@echo off
REM Phase2 E2Eテスト 統合実行スクリプト（Windows用）
REM このスクリプトは環境確認から実際のテスト実行まで全て自動化します

echo.
echo ============================================================
echo   PlantUML Editor Phase2 E2E Tests - 統合実行スクリプト
echo ============================================================
echo.

REM 現在の作業ディレクトリを設定
cd /d "%~dp0"

echo [1/4] 実行環境確認中...
node test-execution-script.cjs
if %ERRORLEVEL% neq 0 (
    echo ❌ 実行環境に問題があります。上記のエラーを確認してください。
    pause
    exit /b 1
)

echo.
echo [2/4] 同期機能テスト実行中...
echo ----------------------------------------
node test-sync-functionality.cjs
set SYNC_RESULT=%ERRORLEVEL%

echo.
echo [3/4] 複雑フローテスト実行中...
echo ----------------------------------------
node test-complex-flows.cjs
set COMPLEX_RESULT=%ERRORLEVEL%

echo.
echo [4/4] パフォーマンステスト実行中...
echo ----------------------------------------
node test-performance-metrics.cjs
set PERF_RESULT=%ERRORLEVEL%

echo.
echo ============================================================
echo   テスト実行完了 - 結果サマリー
echo ============================================================

REM 結果の表示
if %SYNC_RESULT% equ 0 (
    echo ✅ 同期機能テスト: 成功
) else (
    echo ❌ 同期機能テスト: 失敗
)

if %COMPLEX_RESULT% equ 0 (
    echo ✅ 複雑フローテスト: 成功
) else (
    echo ❌ 複雑フローテスト: 失敗
)

if %PERF_RESULT% equ 0 (
    echo ✅ パフォーマンステスト: 成功
) else (
    echo ❌ パフォーマンステスト: 失敗
)

echo.
echo テスト結果ファイル: .\test-results\
echo 詳細レポート: .\PHASE2_TEST_EXECUTION_REPORT.md
echo.

REM 総合判定
set /a TOTAL_ERRORS=%SYNC_RESULT%+%COMPLEX_RESULT%+%PERF_RESULT%
if %TOTAL_ERRORS% equ 0 (
    echo 🎉 すべてのテストが成功しました！
    echo.
    pause
    exit /b 0
) else (
    echo ⚠️  一部のテストで問題が発生しました。詳細を確認してください。
    echo.
    pause
    exit /b 1
)