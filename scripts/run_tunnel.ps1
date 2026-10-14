# CareConnect Cloudflare Quick Tunnel Launcher
param(
    [int]$TargetPort = 3000
)

Clear-Host
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "        CareConnect Cloudflare Tunnel Launcher     " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path "$ScriptDir\..").Path
$CloudflaredExe = Join-Path $ScriptDir "cloudflared.exe"

if (-not (Test-Path $CloudflaredExe)) {
    $RootCandidate = Join-Path $ProjectRoot "cloudflared.exe"
    if (Test-Path $RootCandidate) {
        $CloudflaredExe = $RootCandidate
    } elseif (Get-Command cloudflared -ErrorAction SilentlyContinue) {
        $CloudflaredExe = (Get-Command cloudflared).Source
    }
}

if (-not (Test-Path $CloudflaredExe)) {
    Write-Host "[*] cloudflared.exe not found. Downloading to $CloudflaredExe..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $CloudflaredExe
}

Write-Host "[*] Using binary: $CloudflaredExe" -ForegroundColor Gray
Write-Host "[*] Tunneling target: http://localhost:$TargetPort" -ForegroundColor Green
if ($TargetPort -eq 3000) {
    Write-Host "    (Unified Reverse Proxy exposing Family, Caregiver, Admin & Backend)" -ForegroundColor DarkCyan
}
Write-Host ""
Write-Host "Starting Cloudflare quick tunnel..." -ForegroundColor Yellow
Write-Host "Look for the public URL ending with '.trycloudflare.com' below:" -ForegroundColor Yellow
Write-Host "---------------------------------------------------" -ForegroundColor Gray

& "$CloudflaredExe" tunnel --url "http://localhost:$TargetPort"
