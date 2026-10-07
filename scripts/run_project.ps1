# CareConnect Platform PowerShell Launcher
Clear-Host
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          CareConnect Platform Launcher            " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (Test-Path "$ScriptDir\backend\run.py") {
    $ProjectRoot = $ScriptDir
} elseif (Test-Path "$ScriptDir\..\backend\run.py") {
    $ProjectRoot = (Resolve-Path "$ScriptDir\..").Path
} elseif (Test-Path "$ScriptDir\CareConnect\CareConnect\backend\run.py") {
    $ProjectRoot = "$ScriptDir\CareConnect\CareConnect"
} elseif (Test-Path "$ScriptDir\CareConnect\backend\run.py") {
    $ProjectRoot = "$ScriptDir\CareConnect"
} else {
    Write-Host "[ERROR] Could not locate backend\run.py!" -ForegroundColor Red
    exit 1
}

$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$CaregiverDir = Join-Path $ProjectRoot "caregiver-app"
$AdminDir = Join-Path $ProjectRoot "admin-web"

Write-Host "[*] Project Root  : $ProjectRoot" -ForegroundColor Gray
Write-Host "[*] Backend Dir   : $BackendDir" -ForegroundColor Gray
Write-Host "[*] Frontend Dir  : $FrontendDir" -ForegroundColor Gray
Write-Host "[*] Caregiver Dir : $CaregiverDir" -ForegroundColor Gray
Write-Host "[*] Admin Dir     : $AdminDir" -ForegroundColor Gray
Write-Host ""

# Verify Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python was not found in your PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.10+ and add it to your system PATH." -ForegroundColor Red
    exit 1
}

# Verify npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm was not found in your PATH." -ForegroundColor Red
    Write-Host "Please install Node.js and add it to your system PATH." -ForegroundColor Red
    exit 1
}

# Free ports 8000, 5173, 5174, and 5175 if occupied by prior or orphaned processes
Get-NetTCPConnection -LocalPort 8000, 5173, 5174, 5175 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "[*] Freeing occupied port $($_.LocalPort) (PID: $($_.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "[1/5] Starting FastAPI Backend on Port 8000..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$BackendDir`" && title CareConnect Backend [FastAPI :8000] && python run.py"

Write-Host "[2/5] Starting Vite Family Frontend on Port 5173..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$FrontendDir`" && title CareConnect Family Frontend [Vite :5173] && npm run dev"

Write-Host "[3/5] Starting Vite Caregiver PWA on Port 5174..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$CaregiverDir`" && title CareConnect Caregiver PWA [Vite :5174] && npm run dev"

Write-Host "[4/5] Starting Vite Admin Portal on Port 5175..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$AdminDir`" && title CareConnect Admin Portal [Vite :5175] && npm run dev"

Write-Host "[5/5] Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Gray
Write-Host "Service Health Check:" -ForegroundColor Gray
Write-Host "---------------------------------------------------" -ForegroundColor Gray

$backendTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($backendTest) {
    Write-Host "  [OK] Backend        is LISTENING on http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "  [!] Backend is still initializing or encountered an error. Check Backend window." -ForegroundColor Yellow
}

$frontendTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($frontendTest) {
    Write-Host "  [OK] Family PWA     is LISTENING on http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "  [!] Family PWA is still initializing or encountered an error. Check Frontend window." -ForegroundColor Yellow
}

$caregiverTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 5174 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($caregiverTest) {
    Write-Host "  [OK] Caregiver PWA  is LISTENING on http://localhost:5174" -ForegroundColor Green
} else {
    Write-Host "  [!] Caregiver PWA is still initializing or encountered an error. Check Caregiver window." -ForegroundColor Yellow
}

$adminTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 5175 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($adminTest) {
    Write-Host "  [OK] Admin Portal   is LISTENING on http://localhost:5175" -ForegroundColor Green
} else {
    Write-Host "  [!] Admin Portal is still initializing or encountered an error. Check Admin window." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "         CareConnect is now running!               " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  - Family PWA       : http://localhost:5173" -ForegroundColor White
Write-Host "  - Caregiver PWA    : http://localhost:5174" -ForegroundColor White
Write-Host "  - Admin Portal     : http://localhost:5175" -ForegroundColor White
Write-Host "  - Backend REST API : http://localhost:8000" -ForegroundColor White
Write-Host "  - Swagger API Docs : http://localhost:8000/docs" -ForegroundColor White
Write-Host ""

Start-Process "http://localhost:5173"
Start-Process "http://localhost:5174"
Start-Process "http://localhost:5175"
