@echo off
rem Instala el actualizador automatico de WhatsApp Sender Pro (solo para tu usuario, sin permisos de administrador)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0updater\install.ps1" %*
pause
