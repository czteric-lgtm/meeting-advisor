@echo off
setlocal

REM 启动一个本地静态服务器，自动打开浏览器访问 http://localhost:4173

cd /d %~dp0

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [错误] 未检测到 Node.js。
  echo 请先在瀏覽器打開 https://nodejs.org/ 安裝 LTS 版本，
  echo 安裝完成後重新雙擊本文件即可。
  echo.
  pause
  exit /b 1
)

echo.
echo 啟動本地服務器中...
echo 如果瀏覽器沒有自動打開，請手動訪問: http://localhost:4173
echo.

start "" cmd /c "npx serve . -l 4173"

start "" "http://localhost:4173"

endlocal
exit /b 0

