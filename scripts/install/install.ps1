# gamekit installer for Windows
# Usage: irm https://github.com/gamekit-agent/gamekit-cli/releases/latest/download/install.ps1 | iex

$ErrorActionPreference = "Stop"

# Configuration
$Repo = "gamekit-agent/gamekit-cli"
$InstallDir = "$env:LOCALAPPDATA\gamekit\bin"
$BinaryName = "gamekit.exe"

Write-Host "Installing gamekit..." -ForegroundColor Green

# Create install directory
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Get latest release
Write-Host "Fetching latest release..."
$ReleaseUrl = "https://api.github.com/repos/$Repo/releases/latest"
try {
    $Release = Invoke-RestMethod -Uri $ReleaseUrl -Headers @{ "User-Agent" = "gamekit-installer" }
} catch {
    Write-Host "Failed to fetch release information: $_" -ForegroundColor Red
    exit 1
}

# Find Windows binary
$Asset = $Release.assets | Where-Object { $_.name -like "*windows-x64*" }
if (!$Asset) {
    Write-Host "Failed to find Windows binary in release" -ForegroundColor Red
    exit 1
}

$DownloadUrl = $Asset.browser_download_url
Write-Host "Downloading from $DownloadUrl..."

# Download binary
$TempFile = Join-Path $env:TEMP "gamekit-download.exe"
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempFile -UseBasicParsing
} catch {
    Write-Host "Failed to download: $_" -ForegroundColor Red
    exit 1
}

# Move to install location
$TargetPath = Join-Path $InstallDir $BinaryName
Move-Item -Path $TempFile -Destination $TargetPath -Force

Write-Host "Installed gamekit to $TargetPath" -ForegroundColor Green

# Check if already in PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentPath -notlike "*$InstallDir*") {
    Write-Host ""
    # Try to read from console even when piped
    try {
        Write-Host "Add to PATH automatically? [Y/n]: " -NoNewline
        $response = [Console]::ReadLine()
    } catch {
        $response = "Y"  # Default to yes if can't prompt
    }
    if ($response -ne "n" -and $response -ne "N") {
        $NewPath = "$CurrentPath;$InstallDir"
        [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")

        # Update current session
        $env:Path = "$env:Path;$InstallDir"

        Write-Host "Added to PATH. You may need to restart your terminal." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "To add gamekit to your PATH manually, run:" -ForegroundColor Yellow
        Write-Host "  [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';$InstallDir', 'User')"
    }
} else {
    Write-Host "$InstallDir is already in your PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Get started:"
Write-Host "  gamekit --help"
Write-Host "  gamekit init"
