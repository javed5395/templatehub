@echo off
cd /d "%~dp0"
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo ═══ Committing: revive sitewide auth (navbar.js injected-script fix) ═══
git add navbar.js
git commit -m "Auth fix: execute the injected Firebase auth module for real - sign-in was dead sitewide"
echo.
echo ═══ Pushing to GitHub ═══
git push
echo.
echo ═══ Done ═══
pause
