@echo off
echo ======================================
echo PlantUML Editor HTTPサーバー起動
echo ======================================
echo.

:: ポート番号を設定（変更可能）
set PORT=8085

echo HTTPサーバーをポート %PORT% で起動します...
echo.

:: Node.jsが利用可能か確認
where node >nul 2>&1
if %errorlevel%==0 (
    echo Node.jsを使用してHTTPサーバーを起動します...
    npx http-server -p %PORT% -o
    goto end
)

:: Pythonが利用可能か確認
where python >nul 2>&1
if %errorlevel%==0 (
    echo Pythonを使用してHTTPサーバーを起動します...
    echo ブラウザで http://localhost:%PORT% を開いてください
    python -m http.server %PORT%
    goto end
)

:: Python3が利用可能か確認
where python3 >nul 2>&1
if %errorlevel%==0 (
    echo Python3を使用してHTTPサーバーを起動します...
    echo ブラウザで http://localhost:%PORT% を開いてください
    python3 -m http.server %PORT%
    goto end
)

echo エラー: Node.jsまたはPythonがインストールされていません
echo いずれかをインストールしてから再度実行してください
echo.
echo Node.js: https://nodejs.org/
echo Python: https://www.python.org/
echo.
pause
exit /b 1

:end
pause