@echo off
rem Instala WhatsApp Sender Pro: activa las actualizaciones automaticas y abre Chrome para cargar la extension (sin permisos de administrador)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0updater\install.ps1" -Setup
pause
