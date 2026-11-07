# WhatsApp Sender Pro - native helper that replaces the extension files with a newer GitHub release.
# Chrome starts it through host.bat (native messaging): one JSON message in, one JSON message out.
# Only this extension may call it (allowed_origins), it only downloads from the project's GitHub
# releases, and it only writes into the folder recorded at install time, after checking that the
# folder holds this extension at the version Chrome is running.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Repo = 'EXECRISTIAN/whatsapp-sender-pro'
$AppName = 'WhatsApp Sender Pro'
$HostVersion = '1'
$Root = Join-Path $env:LOCALAPPDATA 'WhatsAppSenderPro'
$LogFile = Join-Path $Root 'updater.log'

function Write-Log([string]$text) {
  try { Add-Content -LiteralPath $LogFile -Value ('{0:yyyy-MM-dd HH:mm:ss} {1}' -f (Get-Date), $text) -Encoding UTF8 } catch {}
}

function Read-Exactly($stream, [int]$count) {
  $buffer = New-Object byte[] $count
  $read = 0
  while ($read -lt $count) {
    $n = $stream.Read($buffer, $read, $count - $read)
    if ($n -le 0) { return $null }
    $read += $n
  }
  return ,$buffer
}

function Read-Message {
  $stdin = [Console]::OpenStandardInput()
  $header = Read-Exactly $stdin 4
  if (-not $header) { return $null }
  $size = [BitConverter]::ToInt32($header, 0)
  if ($size -le 0 -or $size -gt 1MB) { return $null }
  $body = Read-Exactly $stdin $size
  if (-not $body) { return $null }
  return [Text.Encoding]::UTF8.GetString($body) | ConvertFrom-Json
}

function Send-Message($data) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($data | ConvertTo-Json -Compress -Depth 5))
  $stdout = [Console]::OpenStandardOutput()
  $stdout.Write([BitConverter]::GetBytes([int]$bytes.Length), 0, 4)
  $stdout.Write($bytes, 0, $bytes.Length)
  $stdout.Flush()
}

function Read-Manifest([string]$dir) {
  $path = Join-Path $dir 'manifest.json'
  if (-not (Test-Path -LiteralPath $path)) { return $null }
  return Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-Config {
  return Get-Content -LiteralPath (Join-Path $PSScriptRoot 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Invoke-Robocopy([string]$from, [string]$to) {
  & robocopy.exe $from $to /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  return $LASTEXITCODE -lt 8
}

function Update-Extension($msg) {
  $config = Get-Config
  $ext = [string]$config.extensionDir
  $installed = Read-Manifest $ext
  if (-not $installed -or $installed.name -ne $AppName) { throw 'La carpeta registrada no contiene la extensión.' }
  if ($msg.current -and $installed.version -ne [string]$msg.current) {
    throw "La carpeta registrada tiene la versión $($installed.version), pero Chrome usa la $($msg.current). Volvé a ejecutar instalar-actualizador.cmd desde la carpeta que cargaste en Chrome."
  }
  $url = [string]$msg.url
  if (-not $url.StartsWith("https://github.com/$Repo/releases/download/")) { throw 'Dirección de descarga no permitida.' }

  $work = Join-Path $Root ('work-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $work | Out-Null
  try {
    $zip = Join-Path $work 'update.zip'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 180 -Headers @{ 'User-Agent' = 'WhatsAppSenderPro-Updater' }
    if ((Get-Item -LiteralPath $zip).Length -gt 30MB) { throw 'El archivo descargado es demasiado grande.' }

    $source = Join-Path $work 'new'
    Expand-Archive -LiteralPath $zip -DestinationPath $source
    if (-not (Test-Path -LiteralPath (Join-Path $source 'manifest.json'))) {
      $folders = @(Get-ChildItem -LiteralPath $source -Directory)
      if ($folders.Count -eq 1) { $source = $folders[0].FullName }
    }
    $new = Read-Manifest $source
    if (-not $new -or $new.name -ne $AppName) { throw 'El ZIP del release no contiene la extensión.' }
    if ($msg.version -and $new.version -ne [string]$msg.version) { throw "El ZIP tiene la versión $($new.version) y se esperaba la $($msg.version)." }
    if (([version]$new.version).CompareTo([version]$installed.version) -le 0) { throw 'La versión descargada no es más nueva que la instalada.' }

    $backup = Join-Path $Root 'backup'
    if (-not (Invoke-Robocopy $ext $backup)) { throw 'No se pudo hacer la copia de respaldo.' }
    if (-not (Invoke-Robocopy $source $ext)) {
      Invoke-Robocopy $backup $ext | Out-Null
      throw 'No se pudieron copiar los archivos nuevos; se restauró la versión anterior.'
    }
    # Keep this helper current too (the running script is already in memory)
    $newHost = Join-Path $source 'updater\host.ps1'
    if (Test-Path -LiteralPath $newHost) { Copy-Item -LiteralPath $newHost -Destination (Join-Path $PSScriptRoot 'host.ps1') -Force }
    return @{ ok = $true; version = [string]$new.version; previous = [string]$installed.version }
  } finally {
    Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
  }
}

try {
  New-Item -ItemType Directory -Path $Root -Force | Out-Null
  $msg = Read-Message
  if (-not $msg) { exit 0 }
  switch ([string]$msg.action) {
    'ping' {
      $config = Get-Config
      $manifest = Read-Manifest ([string]$config.extensionDir)
      Send-Message @{ ok = $true; host = $HostVersion; extensionDir = [string]$config.extensionDir; installed = $(if ($manifest) { [string]$manifest.version } else { '' }) }
    }
    'update' {
      Write-Log "Actualizando a $($msg.version) desde $($msg.url)"
      $result = Update-Extension $msg
      Write-Log "Listo: $($result.previous) -> $($result.version)"
      Send-Message $result
    }
    default { Send-Message @{ ok = $false; error = 'Acción desconocida.' } }
  }
} catch {
  Write-Log "Error: $($_.Exception.Message)"
  Send-Message @{ ok = $false; error = $_.Exception.Message }
}
