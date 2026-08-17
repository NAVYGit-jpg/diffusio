@echo off
rem ---------------------------------------------------------------------------
rem  DIFFUSIO - demarrage de l'application en local
rem
rem  Double-cliquez sur ce fichier : il ouvre le serveur puis le navigateur.
rem  Laissez cette fenetre ouverte tant que vous utilisez l'application.
rem  Pour arreter : revenez ici et faites Ctrl + C.
rem
rem  Le chemin n'est pas ecrit en dur : %~dp0 designe le dossier de ce fichier,
rem  donc le raccourci suit le projet si vous le deplacez ou le copiez.
rem ---------------------------------------------------------------------------

chcp 65001 >nul
cd /d "%~dp0"

title DIFFUSIO - serveur local

echo.
echo   DIFFUSIO
echo   Calendrier de diffusion statistique
echo.
echo   Dossier : %CD%
echo.

rem Les echecs sont testes avec ||, jamais avec "if errorlevel" ni %ERRORLEVEL%.
rem
rem "if errorlevel 1" teste « superieur ou egal a 1 » et laisse passer les codes
rem negatifs : npm renvoie -4058 quand un fichier manque. Et %ERRORLEVEL% place
rem dans un bloc entre parentheses est remplace par sa valeur au moment ou le
rem bloc est lu, donc avant que la commande n'ait tourne. Les deux formes
rem laissaient l'echec passer inapercu et l'utilisateur voyait une cascade
rem d'erreurs au lieu du message utile.

rem Node.js est la seule dependance a verifier : sans lui, npm n'existe pas.
where node >nul 2>nul || goto :sans_node

rem Premiere utilisation sur un poste neuf : les dependances manquent.
if exist "node_modules" goto :lancer

echo   Premiere installation des dependances, cela peut prendre plusieurs
echo   minutes. Ne fermez pas cette fenetre.
echo.
call npm install || goto :echec_installation

:lancer
rem Le navigateur est lance en parallele, apres un delai : le serveur met
rem quelques secondes a repondre et une page ouverte trop tot afficherait une
rem erreur de connexion.
start "" cmd /c "timeout /t 12 >nul & start "" http://localhost:3000"

echo   Demarrage du serveur...
echo   Le navigateur s'ouvrira automatiquement dans une douzaine de secondes.
echo   Adresse : http://localhost:3000
echo.

call npm run dev

rem On n'arrive ici que si le serveur s'arrete : la fenetre reste ouverte pour
rem que le message d'erreur eventuel soit lisible.
echo.
echo   Le serveur est arrete.
pause
exit /b 0

:sans_node
echo   [ERREUR] Node.js est introuvable sur cet ordinateur.
echo   Installez-le depuis https://nodejs.org puis relancez ce fichier.
echo.
pause
exit /b 1

:echec_installation
echo.
echo   [ERREUR] L'installation des dependances a echoue.
echo   Verifiez votre connexion internet, puis relancez ce fichier.
echo.
pause
exit /b 1
