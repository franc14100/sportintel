@echo off
title SportIntel AI - Servidor Local
echo ===================================================
echo     SportIntel AI - Analista Deportivo de Apuestas
echo ===================================================
echo.
echo [1/2] Generando reportes y datos actualizados del dia...
python backend\data_generator.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Error al generar los datos del dia con Python.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/2] Iniciando servidor web premium interactivo...
python backend\server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Hubo un error al iniciar el servidor de desarrollo.
    echo Asegurate de no tener restricciones de red o que Python este bien configurado.
    pause
)
