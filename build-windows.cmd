@echo off
setlocal
cd /d "%~dp0"

echo Node version:
node --version
if errorlevel 1 goto fail

echo npm version:
call npm --version
if errorlevel 1 goto fail

echo Installing dependencies...
call npm install
if errorlevel 1 goto fail

echo Running checks...
call npm run check
if errorlevel 1 goto fail

echo Building Windows package...
call npm run package:win
if errorlevel 1 goto fail

echo.
echo Build complete: dist\dota-theorycraft-calculator-win32-x64\dota-theorycraft-calculator.exe
pause
exit /b 0

:fail
echo.
echo Build failed. Make sure Node.js 22.12.0 or newer is installed.
pause
exit /b 1
