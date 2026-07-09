@echo off
cd /d C:\Users\javed\Desktop\WebMarketplace\website
del .git\index.lock 2>nul
del .git\HEAD.lock 2>nul
git add navbar.js
git commit -m "feat: universal theme colour picker — works on all pages from navbar.js alone"
git push origin main
echo.
echo Done! Press any key to close.
pause
