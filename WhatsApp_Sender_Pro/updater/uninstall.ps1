# Removes the WhatsApp Sender Pro updater (the extension itself stays installed).
$ErrorActionPreference = 'Stop'
$HostName = 'com.execristian.whatsapp_sender_pro'
Remove-Item -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName" -Force -ErrorAction SilentlyContinue
# Keep data\ (the automatic copy of contacts and templates); remove everything else
$root = Join-Path $env:LOCALAPPDATA 'WhatsAppSenderPro'
if (Test-Path -LiteralPath $root) {
  Get-ChildItem -LiteralPath $root -Force | Where-Object { $_.Name -ne 'data' } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host 'Actualizador desinstalado. La extensión sigue instalada; las actualizaciones vuelven a ser manuales.' -ForegroundColor Green
Write-Host "La copia de tus contactos y plantillas queda en $root\data" 
