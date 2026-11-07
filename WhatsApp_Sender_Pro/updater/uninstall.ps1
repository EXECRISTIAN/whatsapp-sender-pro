# Removes the WhatsApp Sender Pro updater (the extension itself stays installed).
$ErrorActionPreference = 'Stop'
$HostName = 'com.execristian.whatsapp_sender_pro'
Remove-Item -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $env:LOCALAPPDATA 'WhatsAppSenderPro') -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Actualizador desinstalado. La extensión sigue instalada; las actualizaciones vuelven a ser manuales.' -ForegroundColor Green
