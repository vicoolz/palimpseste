@echo off
echo ========================================
echo    PALIMPSESTE - Explorateur litteraire
echo ========================================
echo.
echo Demarrage du serveur...
echo L'application va s'ouvrir dans votre navigateur.
echo.
echo Pour arreter: fermez cette fenetre.
echo ========================================
start http://localhost:8080
python -m http.server 8080
pause
