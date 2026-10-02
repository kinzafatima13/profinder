@echo off
cd /d "%~dp0"
echo Installing ProFinder. This can take a few minutes.
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)
call .\node_modules\.bin\prisma generate
if errorlevel 1 (
  echo prisma generate failed.
  pause
  exit /b 1
)
echo Starting http://localhost:3000
call npm run dev
pause
