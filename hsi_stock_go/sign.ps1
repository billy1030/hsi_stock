$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=HSI Live Stock" -CertStoreLocation Cert:\CurrentUser\My
Set-AuthenticodeSignature -FilePath "C:\ai\etnet\hsi_stock_go\build\bin\HSI_Stock.exe" -Certificate $cert
Copy-Item -Path "C:\ai\etnet\hsi_stock_go\build\bin\HSI_Stock.exe" -Destination "C:\ai\etnet\HSI_Stock.exe" -Force
