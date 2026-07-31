# HSI Stock Wails Build & Self-Sign Automation Script

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Stopping existing HSI Stock processes... " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Get-Process -Name "HSI_Stock" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "ETNet_Live_Stock" -ErrorAction SilentlyContinue | Stop-Process -Force

Set-Location -Path "C:\ai\etnet\hsi_stock_go"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building Wails binary with -trimpath...  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

wails build -clean -trimpath

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed with error code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

$exePath = "C:\ai\etnet\hsi_stock_go\build\bin\HSI_Stock.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "Error: Built executable not found at $exePath" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Ensuring Code Signing Certificate...     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*CN=HSI Live Stock*" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "Creating new self-signed Code Signing Certificate..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=HSI Live Stock" -CertStoreLocation Cert:\CurrentUser\My
}

Write-Host "Signing executable: $exePath" -ForegroundColor Yellow
Set-AuthenticodeSignature -FilePath $exePath -Certificate $cert

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Deploying binary to root directory...   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Copy-Item -Path $exePath -Destination "C:\ai\etnet\HSI_Stock.exe" -Force

Write-Host "SUCCESS: Built and signed C:\ai\etnet\HSI_Stock.exe" -ForegroundColor Green
