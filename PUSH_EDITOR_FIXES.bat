@echo off
cd /d "%~dp0"
echo ═══ Clearing any stale git lock ═══
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo ═══ Committing the editor bug-fix edition ═══
git add editor.html lazydog_renderer.js
git commit -m "Editor: resolve all 83 audit items (dead buttons, duplicates, font px/pt unification, state persistence, AI panel, toggle states)"
echo.
echo ═══ Pushing to GitHub ═══
git push
echo.
echo ═══ Done — check the result above ═══
pause
