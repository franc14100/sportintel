@echo off
title 1xBET PredictAI Server
echo ===================================================
echo   INICIANDO 1xBET PREDICT.AI - SERVIDOR PORTABLE
echo ===================================================
echo.
echo 1. Abriendo la aplicacion en tu navegador...
start http://localhost:8080/
echo 2. Iniciando servidor local en puerto 8080...
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
