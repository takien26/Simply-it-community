# ==============================================================================
# SIMPLY IT - Hardware & Installed Software Auto-Discovery Collector v2.0
# Copyright (c) 2026 Simply IT Management Platform
# ==============================================================================

param(
    [string]$ServerUrl = "http://localhost:3000"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SIMPLY IT - THU THẬP PHẦN CỨNG & PHẦN MỀM TỰ ĐỘNG     " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Thu thập thông tin Cơ Bản & Phần Cứng
Write-Host "[1/3] Đang thu thập thông số phần cứng..." -ForegroundColor Green
$ComputerName = $env:COMPUTERNAME
$CurrentUser = $env:USERNAME

# BIOS & Serial Number
$Bios = Get-WmiObject win32_bios
$SerialNumber = $Bios.SerialNumber
$Manufacturer = $Bios.Manufacturer

# Motherboard & Model
$ComputerSystem = Get-WmiObject win32_computersystem
$Brand = $ComputerSystem.Manufacturer
$Model = $ComputerSystem.Model

# Processor (CPU)
$Cpu = (Get-WmiObject win32_processor | Select-Object -First 1).Name

# Memory (RAM)
$TotalRamBytes = $ComputerSystem.TotalPhysicalMemory
$TotalRamGB = [math]::Round($TotalRamBytes / 1GB)
$RamString = "$TotalRamGB GB"

# Hard Disks (Storage)
$Disks = Get-WmiObject win32_logicaldisk -Filter "DriveType=3" | ForEach-Object {
    $SizeGB = [math]::Round($_.Size / 1GB)
    $FreeGB = [math]::Round($_.FreeSpace / 1GB)
    "$($_.DeviceID) $SizeGB GB (Trống $FreeGB GB)"
}
$StorageString = $Disks -join "; "

# Operating System
$OS = (Get-WmiObject win32_operatingsystem).Caption

# Network IP & MAC Address
$NetworkAdapter = Get-WmiObject win32_networkadapterconfiguration -Filter "IPEnabled = True" | Select-Object -First 1
$IPAddress = ($NetworkAdapter.IPAddress | Where-Object { $_ -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$' } | Select-Object -First 1)
$MACAddress = $NetworkAdapter.MACAddress

# 2. Thu thập Danh sách Phần mềm đã cài đặt (Registry 64-bit, 32-bit & User Profile)
Write-Host "[2/3] Đang quét danh sách ứng dụng & phần mềm đã cài đặt..." -ForegroundColor Green

$RegistryPaths = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

$InstalledApps = @()
$SeenAppNames = @{}

foreach ($path in $RegistryPaths) {
    if (Test-Path (Split-Path $path)) {
        Get-ItemProperty $path -ErrorAction SilentlyContinue | ForEach-Object {
            $AppName = $_.DisplayName
            $AppVersion = $_.DisplayVersion
            $AppPublisher = $_.Publisher
            $AppInstallDate = $_.InstallDate

            if ($AppName -and ($AppName -notmatch "^KB\d+") -and ($AppName -notmatch "^Security Update") -and ($AppName -notmatch "^Update for Windows")) {
                $CleanKey = "$AppName|$AppVersion"
                if (-not $SeenAppNames.ContainsKey($CleanKey)) {
                    $SeenAppNames[$CleanKey] = $true
                    $InstalledApps += @{
                        name = [string]$AppName
                        version = [string]$AppVersion
                        publisher = [string]$AppPublisher
                        installDate = [string]$AppInstallDate
                    }
                }
            }
        }
    }
}

Write-Host "-> Đã phát hiện $($InstalledApps.Count) phần mềm/ứng dụng trên máy tính." -ForegroundColor Cyan

# 3. Đóng gói Payload và gửi về Server SIMPLY IT
Write-Host "[3/3] Đang gửi dữ liệu về hệ thống Simply IT ($ServerUrl)..." -ForegroundColor Green

$Payload = @{
    hostname = $ComputerName
    serialNumber = $SerialNumber
    brand = $Brand
    model = $Model
    scannedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    specs = @{
        cpu = $Cpu
        ram = $RamString
        storage = $StorageString
        os = $OS
        ipAddress = $IPAddress
        macAddress = $MACAddress
        currentUser = $CurrentUser
        manufacturer = $Manufacturer
    }
    installedSoftware = $InstalledApps
}

$JsonPayload = $Payload | ConvertTo-Json -Depth 5

try {
    $Endpoint = "$ServerUrl/api/v1/auto-scan/collect"
    $Response = Invoke-RestMethod -Uri $Endpoint -Method Post -Body $JsonPayload -ContentType "application/json; charset=utf-8"
    
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "✅ THÀNH CÔNG: $($Response.message)" -ForegroundColor Green
    Write-Host "   Mã Tài Sản (Tag): $($Response.assetTag)" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host "❌ LỖI GỬI DỮ LIỆU: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Vui lòng kiểm tra địa chỉ ServerUrl và kết nối mạng." -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Red
}
