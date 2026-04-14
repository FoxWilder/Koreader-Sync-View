<#
.SYNOPSIS
    KOReader Sync — Windows Server Deployment Script

.DESCRIPTION
    Installs or updates KOReader Sync as a Windows service.
    Automatically downloads the latest release from GitHub.
    All files are stored relative to the directory this script is run from.

    On first run: downloads and installs as a Windows service.
    On subsequent runs: detects the installed version and applies updates.
    NSSM (Non-Sucking Service Manager) is downloaded automatically if needed.

.PARAMETER Port
    Port the sync server listens on. Default: 7300

.PARAMETER DataDir
    Directory for reading progress data. Default: .\data (next to this script)

.PARAMETER ServiceName
    Windows service name. Default: KOReaderSync

.PARAMETER GitHubRepo
    GitHub repository owner/repo. Change this if you are self-hosting a fork.
    Default: your-username/koreader-sync

.PARAMETER Uninstall
    Stops and removes the Windows service and NSSM, but leaves data intact.

.EXAMPLE
    .\koreader-sync.ps1

    .\koreader-sync.ps1 -Port 8080

    .\koreader-sync.ps1 -Uninstall
#>

[CmdletBinding()]
param(
    [int]    $Port        = 7300,
    [string] $DataDir     = "",
    [string] $ServiceName = "KOReaderSync",
    [string] $GitHubRepo  = "FoxWilder/Koreader-Sync-View",
    [switch] $Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Paths (all relative to where the script lives) ──────────────────────────
$Base        = $PSScriptRoot
$AppDir      = Join-Path $Base "app"
$NssmExe     = Join-Path $Base "nssm.exe"
$VersionFile = Join-Path $Base ".installed-version"
if (-not $DataDir) { $DataDir = Join-Path $Base "data" }

# ── Helpers ─────────────────────────────────────────────────────────────────
function Write-Header([string]$text) {
    Write-Host ""
    Write-Host "  ═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   $text" -ForegroundColor Cyan
    Write-Host "  ═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step([string]$text) {
    Write-Host "  ▶ $text" -ForegroundColor Yellow
}

function Write-Ok([string]$text) {
    Write-Host "  ✔ $text" -ForegroundColor Green
}

function Write-Err([string]$text) {
    Write-Host "  ✖ $text" -ForegroundColor Red
}

function Write-Info([string]$text) {
    Write-Host "  · $text" -ForegroundColor Gray
}

# ── Admin check ──────────────────────────────────────────────────────────────
function Assert-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Err "This script must be run as Administrator."
        Write-Info "Right-click PowerShell and choose 'Run as administrator', then try again."
        exit 1
    }
}

# ── Node.js check ────────────────────────────────────────────────────────────
function Assert-NodeJs {
    Write-Step "Checking Node.js..."
    try {
        $ver = & node --version 2>&1
        if ($LASTEXITCODE -ne 0) { throw "node exited $LASTEXITCODE" }
        # Require v20 or higher
        $major = [int]($ver -replace "v(\d+)\..*", '$1')
        if ($major -lt 20) {
            Write-Err "Node.js $ver is too old. Version 20 or higher required."
            Write-Info "Download from: https://nodejs.org/en/download/"
            exit 1
        }
        Write-Ok "Node.js $ver"
    } catch {
        Write-Err "Node.js not found."
        Write-Info "Install Node.js 20+ from: https://nodejs.org/en/download/"
        Write-Info "Then re-run this script."
        exit 1
    }
}

# ── NSSM ─────────────────────────────────────────────────────────────────────
function Get-Nssm {
    if (Test-Path $NssmExe) {
        Write-Ok "NSSM already present."
        return
    }
    Write-Step "Downloading NSSM (service manager)..."
    $nssmZip = Join-Path $env:TEMP "nssm.zip"
    $nssmTmp = Join-Path $env:TEMP "nssm-extract"
    try {
        Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" `
            -OutFile $nssmZip -UseBasicParsing
        Expand-Archive -Path $nssmZip -DestinationPath $nssmTmp -Force
        # NSSM zip has a subdirectory; find the right exe for this OS architecture
        $arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
        $exe  = Get-ChildItem -Path $nssmTmp -Recurse -Filter "nssm.exe" |
                Where-Object { $_.Directory.Name -eq $arch } |
                Select-Object -First 1
        if (-not $exe) {
            # Fall back to any nssm.exe in the zip
            $exe = Get-ChildItem -Path $nssmTmp -Recurse -Filter "nssm.exe" |
                   Select-Object -First 1
        }
        Copy-Item $exe.FullName $NssmExe
        Remove-Item $nssmZip -Force -ErrorAction SilentlyContinue
        Remove-Item $nssmTmp -Recurse -Force -ErrorAction SilentlyContinue
        Write-Ok "NSSM downloaded."
    } catch {
        Write-Err "Failed to download NSSM: $_"
        Write-Info "You can download nssm.exe manually from https://nssm.cc/download"
        Write-Info "Place nssm.exe next to this script and try again."
        exit 1
    }
}

# ── GitHub Release info ───────────────────────────────────────────────────────
function Get-LatestRelease {
    Write-Step "Fetching latest release from GitHub..."
    $apiUrl  = "https://api.github.com/repos/$GitHubRepo/releases/latest"
    $headers = @{ Accept = "application/vnd.github.v3+json"; "User-Agent" = "koreader-sync-installer" }
    try {
        $rel = Invoke-RestMethod -Uri $apiUrl -Headers $headers
    } catch {
        Write-Err "Could not reach GitHub API: $_"
        Write-Info "Check your internet connection and that the repo '$GitHubRepo' is correct."
        exit 1
    }
    $version    = $rel.tag_name
    $serverZip  = $rel.assets |
                  Where-Object { $_.name -like "koreader-sync-server-*.zip" } |
                  Select-Object -First 1
    if (-not $serverZip) {
        Write-Err "No server zip found in release $version."
        exit 1
    }
    Write-Ok "Latest release: $version"
    return @{ Version = $version; ZipUrl = $serverZip.browser_download_url }
}

# ── Download and extract ──────────────────────────────────────────────────────
function Install-Bundle([string]$zipUrl, [string]$version) {
    $tmpZip  = Join-Path $env:TEMP "koreader-sync-server.zip"
    $tmpDir  = Join-Path $env:TEMP "koreader-sync-extract"
    Write-Step "Downloading server bundle..."
    Invoke-WebRequest -Uri $zipUrl -OutFile $tmpZip -UseBasicParsing
    Write-Ok "Downloaded."

    Write-Step "Extracting to $AppDir ..."
    if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
    Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force
    Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue

    if (-not (Test-Path $AppDir)) { New-Item -ItemType Directory -Path $AppDir | Out-Null }

    # Replace app files (keep data directory untouched)
    Get-ChildItem $tmpDir | Copy-Item -Destination $AppDir -Recurse -Force
    Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

    # Write installed version marker
    $version | Out-File -FilePath $VersionFile -Encoding utf8 -NoNewline
    Write-Ok "Extracted version $version."
}

# ── Windows Service management ────────────────────────────────────────────────
function Get-ServiceStatus {
    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($svc) { return $svc.Status } else { return $null }
}

function Install-Service {
    $nodeExe = (Get-Command node -ErrorAction SilentlyContinue)?.Source
    if (-not $nodeExe) { $nodeExe = "node" }

    $entryPoint = Join-Path $AppDir "index.mjs"
    Write-Step "Creating Windows service '$ServiceName'..."
    & $NssmExe install $ServiceName $nodeExe $entryPoint
    & $NssmExe set $ServiceName AppDirectory $AppDir
    & $NssmExe set $ServiceName AppEnvironmentExtra `
        "PORT=$Port" `
        "KOREADER_DATA_DIR=$DataDir" `
        "NODE_ENV=production"
    & $NssmExe set $ServiceName DisplayName "KOReader Sync Server"
    & $NssmExe set $ServiceName Description "KOReader reading progress sync server and dashboard"
    & $NssmExe set $ServiceName Start SERVICE_AUTO_START

    # Log files
    $logDir = Join-Path $Base "logs"
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
    & $NssmExe set $ServiceName AppStdout (Join-Path $logDir "koreader-sync.log")
    & $NssmExe set $ServiceName AppStderr (Join-Path $logDir "koreader-sync-error.log")
    & $NssmExe set $ServiceName AppRotateFiles 1
    & $NssmExe set $ServiceName AppRotateSeconds 86400

    Write-Ok "Service created."
}

function Start-KoService {
    Write-Step "Starting service..."
    & $NssmExe start $ServiceName | Out-Null
    Start-Sleep -Seconds 2
    $status = Get-ServiceStatus
    if ($status -eq "Running") {
        Write-Ok "Service running."
    } else {
        Write-Err "Service did not start (status: $status). Check logs at $(Join-Path $Base 'logs')"
    }
}

function Stop-KoService {
    $status = Get-ServiceStatus
    if ($status -eq "Running") {
        Write-Step "Stopping service for update..."
        & $NssmExe stop $ServiceName | Out-Null
        Start-Sleep -Seconds 3
        Write-Ok "Service stopped."
    }
}

# ── Uninstall ─────────────────────────────────────────────────────────────────
function Remove-Service {
    Write-Header "Uninstalling KOReader Sync"
    $status = Get-ServiceStatus
    if ($status) {
        Write-Step "Stopping and removing service '$ServiceName'..."
        if ($status -eq "Running") {
            & $NssmExe stop $ServiceName | Out-Null
            Start-Sleep -Seconds 2
        }
        & $NssmExe remove $ServiceName confirm | Out-Null
        Write-Ok "Service removed."
    } else {
        Write-Info "Service '$ServiceName' was not found — nothing to remove."
    }
    Write-Info "Data at '$DataDir' and app files at '$AppDir' were left intact."
    Write-Info "Delete those directories manually if you want a full clean uninstall."
    exit 0
}

# ── Status summary ────────────────────────────────────────────────────────────
function Show-Status([string]$version) {
    Write-Header "KOReader Sync is ready"
    Write-Host "  Service : $ServiceName"                       -ForegroundColor White
    Write-Host "  Version : $version"                           -ForegroundColor White
    Write-Host "  Port    : $Port"                              -ForegroundColor White
    Write-Host "  Data    : $DataDir"                           -ForegroundColor White
    Write-Host "  Logs    : $(Join-Path $Base 'logs')"          -ForegroundColor White
    Write-Host ""
    Write-Host "  Dashboard  →  http://localhost:$Port/"        -ForegroundColor Cyan
    Write-Host "  Sync API   →  http://localhost:$Port/api/koreader" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  KOReader: Tools → Progress sync → Custom server" -ForegroundColor Gray
    Write-Host "  URL: http://<this-server-ip>:$Port/api/koreader" -ForegroundColor Gray
    Write-Host ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "KOReader Sync Installer"

Assert-Admin

if ($Uninstall) {
    Remove-Service
}

Assert-NodeJs
Get-Nssm

$release = Get-LatestRelease
$latestVersion = $release.Version

# Check if already installed
$installedVersion = if (Test-Path $VersionFile) {
    (Get-Content $VersionFile -Raw).Trim()
} else { "" }

if ($installedVersion -eq "") {
    # ── FRESH INSTALL ────────────────────────────────────────────────────────
    Write-Header "Fresh Install"
    Write-Info "Installing $latestVersion to $Base"

    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null

    Install-Bundle -zipUrl $release.ZipUrl -version $latestVersion

    $svcStatus = Get-ServiceStatus
    if ($svcStatus) {
        Write-Info "Service already exists (from a previous partial install). Removing and reinstalling."
        & $NssmExe stop  $ServiceName | Out-Null
        & $NssmExe remove $ServiceName confirm | Out-Null
    }

    Install-Service
    Start-KoService
    Show-Status -version $latestVersion

} elseif ($installedVersion -eq $latestVersion) {
    # ── ALREADY UP TO DATE ───────────────────────────────────────────────────
    Write-Header "Already up to date"
    Write-Ok "Version $installedVersion is the latest release."
    $status = Get-ServiceStatus
    if ($status -ne "Running") {
        Write-Step "Service is not running. Starting it..."
        Start-KoService
    }
    Show-Status -version $installedVersion

} else {
    # ── UPDATE ───────────────────────────────────────────────────────────────
    Write-Header "Updating $installedVersion → $latestVersion"

    Stop-KoService
    Install-Bundle -zipUrl $release.ZipUrl -version $latestVersion
    Start-KoService
    Show-Status -version $latestVersion
}
