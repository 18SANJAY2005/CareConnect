# CareConnect Cloudflare Quick Tunnel Launcher
Clear-Host
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "        CareConnect Cloudflare Tunnel Launcher     " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CloudflaredExe = "E:\CareConnect\cloudflared.exe"

if (-not (Test-Path $CloudflaredExe)) {
    $CloudflaredExe = Join-Path $ScriptDir "cloudflared.exe"
}

if (-not (Test-Path $CloudflaredExe)) {
    Write-Host "[*] Downloading cloudflared.exe..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $CloudflaredExe
}

Write-Host "[1/3] Launching Family Portal Tunnel (Port 5173)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "title Tunnel :5173 [Family Portal] && `"$CloudflaredExe`" tunnel --url http://localhost:5173"

Write-Host "[2/3] Launching Caregiver PWA Tunnel (Port 5174)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "title Tunnel :5174 [Caregiver PWA] && `"$CloudflaredExe`" tunnel --url http://localhost:5174"

Write-Host "[3/3] Launching FastAPI Backend Tunnel (Port 8000)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "title Tunnel :8000 [FastAPI Backend] && `"$CloudflaredExe`" tunnel --url http://localhost:8000"

Write-Host ""
Write-Host "Tunnels have been launched in separate console windows." -ForegroundColor Cyan
Write-Host "Check each window for its respective https://*.trycloudflare.com URL." -ForegroundColor Cyan

