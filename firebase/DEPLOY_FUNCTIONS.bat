@echo off
cd /d "%~dp0"
echo ═══ Deploying Firebase Functions (extended discovery timeout) ═══
set FUNCTIONS_DISCOVERY_TIMEOUT=180
call firebase deploy --only functions
echo.
echo ═══ Finished — window stays open so the result can be read ═══
pause
