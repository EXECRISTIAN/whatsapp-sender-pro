@echo off
rem Quita el actualizador automatico de WhatsApp Sender Pro
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0updater\uninstall.ps1"
pause
