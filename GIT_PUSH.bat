@echo off
cd /d "%~dp0"
echo ═══ Clearing any stale git lock ═══
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo ═══ Committing upload_form.html security fix ═══
git add upload_form.html
git commit -m "Security: strip Section 11 from supporting-doc PDFs before upload"
echo.
echo ═══ Pushing to GitHub ═══
git push
echo.
echo ═══ Done — check the result above ═══
pause
