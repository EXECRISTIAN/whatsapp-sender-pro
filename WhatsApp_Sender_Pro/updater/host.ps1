# WhatsApp Sender Pro - native helper: installs newer GitHub releases, keeps a copy of the data and
# moves the extension to its own folder. Chrome starts it through host.bat (native messaging): one
# JSON message in, one JSON message out. Only this extension may call it (allowed_origins), it only
# downloads from the project's GitHub releases, and it only writes into the folder Chrome loads the
# extension from (read from Chrome's preferences) after checking it holds this extension at the
# version Chrome is running.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Repo = 'EXECRISTIAN/whatsapp-sender-pro'
$AppName = 'WhatsApp Sender Pro'
$HostVersion = '3'
$FolderName = 'WhatsApp Sender Pro'
# Fixed ID from the "key" in manifest.json (the same in any folder)
$ExtensionIds = @('gemleaglcoamjgkmckdhnbanhccogpjb')
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
  if ($size -le 0 -or $size -gt 16MB) { return $null }
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

function Save-Config([string]$dir) {
  $file = Join-Path $PSScriptRoot 'config.json'
  $config = Get-Config
  $config.extensionDir = $dir
  [IO.File]::WriteAllText($file, ($config | ConvertTo-Json), (New-Object Text.UTF8Encoding $false))
}

# Folders Chrome loads this extension from, read from every profile's preferences (read only)
function Get-LoadedDirs {
  $dirs = @()
  try { Add-Type -AssemblyName System.Web.Extensions } catch { return $dirs }
  $json = New-Object System.Web.Script.Serialization.JavaScriptSerializer
  $json.MaxJsonLength = [int]::MaxValue
  $ids = @($ExtensionIds + @((Get-Config).ids)) | Where-Object { $_ } | Select-Object -Unique
  $userData = Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data'
  if (-not (Test-Path -LiteralPath $userData)) { return $dirs }
  foreach ($profile in Get-ChildItem -LiteralPath $userData -Directory -ErrorAction SilentlyContinue) {
    foreach ($name in 'Secure Preferences', 'Preferences') {
      $file = Join-Path $profile.FullName $name
      if (-not (Test-Path -LiteralPath $file)) { continue }
      try {
        $prefs = $json.DeserializeObject([IO.File]::ReadAllText($file, [Text.Encoding]::UTF8))
        $settings = $prefs['extensions']['settings']
        foreach ($id in $ids) {
          if ($settings -and $settings.ContainsKey($id) -and $settings[$id].ContainsKey('path')) {
            $path = [string]$settings[$id]['path']
            if ([IO.Path]::IsPathRooted($path) -and (Test-Path -LiteralPath (Join-Path $path 'manifest.json'))) { $dirs += $path }
          }
        }
      } catch {}
    }
  }
  return @($dirs | Select-Object -Unique)
}

# The folder to work on: the one Chrome loads at the running version, else the one recorded at install
function Get-ExtensionDir([string]$current) {
  foreach ($dir in Get-LoadedDirs) {
    $m = Read-Manifest $dir
    if ($m -and $m.name -eq $AppName -and (-not $current -or $m.version -eq $current)) {
      if ($dir -ne [string](Get-Config).extensionDir) { try { Save-Config $dir } catch {} }
      return $dir
    }
  }
  return [string](Get-Config).extensionDir
}

function Get-Drives {
  return @([IO.DriveInfo]::GetDrives() | Where-Object { $_.IsReady -and ($_.DriveType -eq 'Fixed' -or $_.DriveType -eq 'Removable') } | ForEach-Object {
    @{ name = $_.Name.TrimEnd('\'); label = [string]$_.VolumeLabel; free = [double]$_.AvailableFreeSpace; total = [double]$_.TotalSize }
  })
}

function Get-Location($msg) {
  $current = Get-ExtensionDir ([string]$msg.current)
  return @{ ok = $true; current = $current; drives = @(Get-Drives); folderName = $FolderName; systemDrive = $env:SystemDrive }
}

# Windows folder picker, on top of Chrome
function Select-Folder {
  Add-Type -AssemblyName System.Windows.Forms
  $owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false }
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = "Elegí dónde guardar $AppName (adentro se crea la carpeta '$FolderName')"
  $dialog.ShowNewFolderButton = $true
  try {
    if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) { return @{ ok = $true; path = $dialog.SelectedPath } }
    return @{ ok = $false; cancelled = $true }
  } finally { $owner.Dispose() }
}

# Copies the running extension into <base>\WhatsApp Sender Pro; Chrome then loads it from there
function Move-Extension($msg) {
  $source = Get-ExtensionDir ([string]$msg.current)
  $installed = Read-Manifest $source
  if (-not $installed -or $installed.name -ne $AppName) { throw 'No se encontró la carpeta de la extensión.' }
  $base = [string]$msg.base
  if (-not [IO.Path]::IsPathRooted($base)) { throw 'Ubicación no válida.' }
  if ((Split-Path -Leaf $base) -eq $FolderName) { $target = $base } else { $target = Join-Path $base $FolderName }
  $target = [IO.Path]::GetFullPath($target).TrimEnd('\')
  $src = [IO.Path]::GetFullPath($source).TrimEnd('\')
  if ($target -eq $src) { return @{ ok = $true; path = $target; same = $true } }
  if ($target.StartsWith($src + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'La carpeta nueva no puede estar dentro de la actual.' }
  if (Test-Path -LiteralPath $target) {
    $existing = Read-Manifest $target
    $hasFiles = @(Get-ChildItem -LiteralPath $target -Force -ErrorAction SilentlyContinue).Count -gt 0
    if ($hasFiles -and (-not $existing -or $existing.name -ne $AppName)) { throw "La carpeta $target ya tiene otros archivos." }
  }
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  if (-not (Invoke-Robocopy $src $target)) { throw 'No se pudieron copiar los archivos.' }
  $copied = Read-Manifest $target
  if (-not $copied -or $copied.version -ne $installed.version) { throw 'La copia quedó incompleta.' }
  Save-Config $target
  return @{ ok = $true; path = $target; previous = $src }
}

function Invoke-Robocopy([string]$from, [string]$to) {
  & robocopy.exe $from $to /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  return $LASTEXITCODE -lt 8
}

function Update-Extension($msg) {
  $ext = Get-ExtensionDir ([string]$msg.current)
  $installed = Read-Manifest $ext
  if (-not $installed -or $installed.name -ne $AppName) { throw 'No se encontró la carpeta de la extensión.' }
  if ($msg.current -and $installed.version -ne [string]$msg.current) {
    throw "La carpeta $ext tiene la versión $($installed.version), pero Chrome usa la $($msg.current). Volvé a ejecutar INSTALAR.cmd."
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

# Copy of contacts and templates outside Chrome, so they come back if the extension is removed and loaded again
$DataDir = Join-Path $Root 'data'
$DataFile = Join-Path $DataDir 'backup.json'

function Save-Data($msg) {
  $json = [string]$msg.json
  if (-not $json.StartsWith('{')) { throw 'Copia de datos no válida.' }
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
  $tmp = "$DataFile.tmp"
  [IO.File]::WriteAllText($tmp, $json, (New-Object Text.UTF8Encoding $false))
  if (Test-Path -LiteralPath $DataFile) { Copy-Item -LiteralPath $DataFile -Destination (Join-Path $DataDir 'backup.prev.json') -Force }
  Move-Item -LiteralPath $tmp -Destination $DataFile -Force
  return @{ ok = $true }
}

function Read-Data {
  if (-not (Test-Path -LiteralPath $DataFile)) { return @{ ok = $true; json = '' } }
  # Chrome accepts at most 1 MB from a native host
  if ((Get-Item -LiteralPath $DataFile).Length -gt 900KB) { return @{ ok = $false; error = 'La copia es demasiado grande para restaurarla sola: importala desde Configuración.' } }
  return @{ ok = $true; json = [IO.File]::ReadAllText($DataFile, [Text.Encoding]::UTF8) }
}

try {
  New-Item -ItemType Directory -Path $Root -Force | Out-Null
  $msg = Read-Message
  if (-not $msg) { exit 0 }
  switch ([string]$msg.action) {
    'ping' {
      $dir = Get-ExtensionDir ([string]$msg.current)
      $manifest = Read-Manifest $dir
      Send-Message @{ ok = $true; host = $HostVersion; extensionDir = $dir; installed = $(if ($manifest) { [string]$manifest.version } else { '' }) }
    }
    'location' { Send-Message (Get-Location $msg) }
    'pickFolder' { Send-Message (Select-Folder) }
    'relocate' {
      Write-Log "Moviendo la extensión a $($msg.base)"
      $result = Move-Extension $msg
      Write-Log "Copiada a $($result.path)"
      Send-Message $result
    }
    'update' {
      Write-Log "Actualizando a $($msg.version) desde $($msg.url)"
      $result = Update-Extension $msg
      Write-Log "Listo: $($result.previous) -> $($result.version)"
      Send-Message $result
    }
    'backup' { Send-Message (Save-Data $msg) }
    'restore' { Send-Message (Read-Data) }
    default { Send-Message @{ ok = $false; error = 'Acción desconocida.' } }
  }
} catch {
  Write-Log "Error: $($_.Exception.Message)"
  Send-Message @{ ok = $false; error = $_.Exception.Message }
}
