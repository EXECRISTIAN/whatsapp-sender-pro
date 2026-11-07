# Registers the WhatsApp Sender Pro updater for the extension in the parent folder (current user, no admin).
# It also keeps a copy of contacts and templates in %LOCALAPPDATA%\WhatsAppSenderPro\data.
# -Setup (INSTALAR.cmd) first copies the extension to its own folder (default C:\WhatsApp Sender Pro),
# so the downloaded folder can be deleted; -Target picks another folder.
param([string]$Id = '', [switch]$Setup, [string]$Target = '')
$ErrorActionPreference = 'Stop'

$HostName = 'com.execristian.whatsapp_sender_pro'
$AppName = 'WhatsApp Sender Pro'
$ext = Split-Path -Parent $PSScriptRoot
$manifestFile = Join-Path $ext 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestFile)) { throw "No se encontró manifest.json en $ext" }
$manifest = Get-Content -LiteralPath $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.name -ne $AppName) { throw "La carpeta $ext no contiene $AppName." }

# Chrome gives unpacked extensions an ID made from the folder path: compute it for the usual spellings
function Get-ExtensionId([string]$path) {
  $hash = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::Unicode.GetBytes($path))
  return -join ($hash[0..15] | ForEach-Object { [char](97 + ($_ -shr 4)); [char](97 + ($_ -band 15)) })
}
$paths = @($ext, ($ext.Substring(0,1).ToLower() + $ext.Substring(1)), ($ext.Substring(0,1).ToUpper() + $ext.Substring(1)))
try { $paths += (New-Object -ComObject Scripting.FileSystemObject).GetFolder($ext).ShortPath } catch {}
$ids = @($paths | Select-Object -Unique | ForEach-Object { Get-ExtensionId $_ })
# With "key" in manifest.json the ID is the same in any folder: SHA-256 of the public key
if ($manifest.key) {
  $hash = [Security.Cryptography.SHA256]::Create().ComputeHash([Convert]::FromBase64String([string]$manifest.key))
  $ids = @(-join ($hash[0..15] | ForEach-Object { [char](97 + ($_ -shr 4)); [char](97 + ($_ -band 15)) })) + $ids
}
if ($Id -match '^[a-p]{32}$') { $ids = @($Id) + $ids }
$ids = @($ids | Select-Object -Unique)

if ($Setup) {
  if (-not $Target) {
    $Target = Join-Path ($env:SystemDrive + '\') $AppName
    try {
      New-Item -ItemType Directory -Path $Target -Force | Out-Null
      $probe = Join-Path $Target '.write-test'
      [IO.File]::WriteAllText($probe, '')
      Remove-Item -LiteralPath $probe -Force
    } catch { $Target = Join-Path $env:LOCALAPPDATA "Programs\$AppName" }
  }
  $Target = [IO.Path]::GetFullPath($Target).TrimEnd('\')
  if ($Target -ne [IO.Path]::GetFullPath($ext).TrimEnd('\')) {
    if (Test-Path -LiteralPath $Target) {
      $existingFile = Join-Path $Target 'manifest.json'
      $existing = $null
      if (Test-Path -LiteralPath $existingFile) { $existing = Get-Content -LiteralPath $existingFile -Raw -Encoding UTF8 | ConvertFrom-Json }
      $hasFiles = @(Get-ChildItem -LiteralPath $Target -Force -ErrorAction SilentlyContinue).Count -gt 0
      if ($hasFiles -and (-not $existing -or $existing.name -ne $AppName)) { throw "La carpeta $Target ya tiene otros archivos." }
    }
    New-Item -ItemType Directory -Path $Target -Force | Out-Null
    & robocopy.exe $ext $Target /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "No se pudo copiar la extensión a $Target" }
    $ext = $Target
  }
}

$dest = Join-Path $env:LOCALAPPDATA 'WhatsAppSenderPro\updater'
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'host.ps1') -Destination $dest -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'host.bat') -Destination $dest -Force

$utf8 = New-Object Text.UTF8Encoding $false
[IO.File]::WriteAllText((Join-Path $dest 'config.json'), (@{ extensionDir = $ext; ids = $ids } | ConvertTo-Json), $utf8)
$hostManifest = [ordered]@{
  name = $HostName
  description = 'WhatsApp Sender Pro updater'
  path = (Join-Path $dest 'host.bat')
  type = 'stdio'
  allowed_origins = @($ids | ForEach-Object { "chrome-extension://$_/" })
}
$hostManifestFile = Join-Path $dest "$HostName.json"
[IO.File]::WriteAllText($hostManifestFile, ($hostManifest | ConvertTo-Json), $utf8)

$key = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
New-Item -Path $key -Force | Out-Null
Set-Item -Path $key -Value $hostManifestFile

if ($Setup) {
  # First install (INSTALAR.cmd): the ID comes from the manifest key, so the updater works before Chrome loads the folder
  try { Set-Clipboard -Value $ext } catch {}
  try { Start-Process 'chrome.exe' 'chrome://extensions' } catch {}
  Write-Host ''
  Write-Host "WhatsApp Sender Pro $($manifest.version) instalado en:" -ForegroundColor Green
  Write-Host "  $ext" -ForegroundColor Green
  Write-Host 'Actualizaciones automaticas activadas. Ya podes borrar la carpeta que descargaste.'
  Write-Host 'Para guardarlo en otro lado: Configuracion > Ubicacion en la extension.'
  Write-Host ''
  Write-Host 'Ultimo paso, en la pagina chrome://extensions que se acaba de abrir:'
  Write-Host '  1. Activa "Modo de desarrollador" (arriba a la derecha).'
  Write-Host '  2. Clic en "Cargar descomprimida".'
  Write-Host '  3. En la barra de direccion de la ventana pega (Ctrl+V) esta carpeta y elegi "Seleccionar carpeta":'
  Write-Host "     $ext" -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'Listo. Desde ahora la extension se actualiza sola. Podes cerrar esta ventana.'
  return
}

Write-Host ''
Write-Host "Actualizador instalado para $AppName $($manifest.version)" -ForegroundColor Green
Write-Host "Carpeta de la extensión: $ext"
Write-Host "ID autorizados: $($ids -join ', ')"
Write-Host ''
Write-Host 'Listo. Abrí la extensión: en Configuración > Actualizaciones debería decir "Actualizador activo".'
Write-Host 'Si dice que no está instalado, copiá el ID que muestra ahí y ejecutá:'
Write-Host '  instalar-actualizador.cmd ID_DE_LA_EXTENSION'
