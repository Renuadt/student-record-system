@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (echo Missing Node.js. Install Node.js and try again.& exit /b 1)
where npm >nul 2>nul || (echo Missing npm. Install Node.js and try again.& exit /b 1)
where gcc >nul 2>nul || (echo Missing GCC. Install GCC and try again.& exit /b 1)

if not exist "server\node_modules\express" (
  echo Installing server dependencies...
  call npm --prefix server install
  if errorlevel 1 exit /b 1
)

echo Starting the Student Record System. Keep this window open; press Ctrl+C to stop.
node server\server.js
