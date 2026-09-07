Get-Process -Name SimplyIT_Server -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$csSource = Join-Path $PSScriptRoot 'SimplyIT_Community_Launcher.cs'
$ico = Join-Path $PSScriptRoot 'app.ico'
$outExe = Join-Path $PSScriptRoot 'SimplyIT_Server.exe'

& $csc /target:winexe /win32icon:$ico /out:$outExe /r:System.dll,System.Windows.Forms.dll,System.Drawing.dll $csSource

Write-Host "Recompiled SimplyIT_Server.exe successfully!"
