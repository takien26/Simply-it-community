# ==============================================================================
# SIMPLY IT - Hardware, Software & License Compliance Collector v3.0
# Copyright (c) 2026 Simply IT Management Platform
# ==============================================================================

param(
    [string]$ServerUrl = "http://localhost:3000"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SIMPLY IT - THU THẬP PHẦN CỨNG, PHẦN MỀM & BẢN QUYỀN   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Thu thập thông tin Cơ Bản & Phần Cứng
Write-Host "[1/4] Đang thu thập thông số phần cứng..." -ForegroundColor Green
$ComputerName = $env:COMPUTERNAME
$CurrentUser = $env:USERNAME

# BIOS & Serial Number
$Bios = Get-CimInstance win32_bios -ErrorAction SilentlyContinue
if (-not $Bios) { $Bios = Get-WmiObject win32_bios -ErrorAction SilentlyContinue }
$SerialNumber = $Bios.SerialNumber
$Manufacturer = $Bios.Manufacturer

# Motherboard & Model
$ComputerSystem = Get-CimInstance win32_computersystem -ErrorAction SilentlyContinue
if (-not $ComputerSystem) { $ComputerSystem = Get-WmiObject win32_computersystem -ErrorAction SilentlyContinue }
$Brand = $ComputerSystem.Manufacturer
$Model = $ComputerSystem.Model

# Processor (CPU)
$CpuObj = Get-CimInstance win32_processor -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $CpuObj) { $CpuObj = Get-WmiObject win32_processor -ErrorAction SilentlyContinue | Select-Object -First 1 }
$Cpu = $CpuObj.Name

# Memory (RAM)
$TotalRamBytes = $ComputerSystem.TotalPhysicalMemory
$TotalRamGB = [math]::Round($TotalRamBytes / 1GB)
$RamString = "$TotalRamGB GB"

# Hard Disks (Storage)
$Disks = Get-CimInstance win32_logicaldisk -Filter "DriveType=3" -ErrorAction SilentlyContinue | ForEach-Object {
    $SizeGB = [math]::Round($_.Size / 1GB)
    $FreeGB = [math]::Round($_.FreeSpace / 1GB)
    "$($_.DeviceID) $SizeGB GB (Trống $FreeGB GB)"
}
$StorageString = $Disks -join "; "

# Operating System
$OsObj = Get-CimInstance win32_operatingsystem -ErrorAction SilentlyContinue
if (-not $OsObj) { $OsObj = Get-WmiObject win32_operatingsystem -ErrorAction SilentlyContinue }
$OS = $OsObj.Caption

# Network IP & MAC Address
$NetworkAdapter = Get-CimInstance win32_networkadapterconfiguration -Filter "IPEnabled = True" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $NetworkAdapter) { $NetworkAdapter = Get-WmiObject win32_networkadapterconfiguration -Filter "IPEnabled = True" -ErrorAction SilentlyContinue | Select-Object -First 1 }
$IPAddress = ($NetworkAdapter.IPAddress | Where-Object { $_ -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$' } | Select-Object -First 1)
$MACAddress = $NetworkAdapter.MACAddress

# 2. Thu thập Danh sách Phần mềm đã cài đặt (Registry 64-bit, 32-bit & User Profile)
Write-Host "[2/4] Đang quét danh sách ứng dụng & phần mềm đã cài đặt..." -ForegroundColor Green

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

# 3. Thu thập Trạng Thái Bản Quyền & Dấu Hiệu Bẻ Khóa (Compliance & Crack Audit)
Write-Host "[3/4] Đang kiểm tra bản quyền Windows, Office & dấu hiệu bẻ khóa..." -ForegroundColor Green

# 3.1. Bản quyền Windows
$WindowsLicense = @{
    name = $OS
    status = "Unknown"
    channel = "Unknown"
    partialKey = ""
    isKms = $false
    isKmsCrack = $false
    isGenuine = $false
}

try {
    $osLic = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "*Windows*" -and $_.Description -like "*Operating System*" } |
        Select-Object -First 1

    if ($osLic) {
        $statusText = switch ($osLic.LicenseStatus) {
            1 { "Licensed" }
            0 { "Unlicensed" }
            2 { "OOBGrace" }
            3 { "OOTGrace" }
            4 { "NonGenuineGrace" }
            5 { "Notification" }
            default { "Status-$($osLic.LicenseStatus)" }
        }

        $channel = if ($osLic.Description -match "OEM") { "OEM" }
                   elseif ($osLic.Description -match "VOLUME_KMS|VOLUME:GVLK") { "KMS" }
                   elseif ($osLic.Description -match "VOLUME_MAK|VOLUME:MAK") { "MAK" }
                   elseif ($osLic.Description -match "RETAIL") { "Retail" }
                   else { "Standard" }

        $kmsHost = [string]$osLic.KeyManagementServiceMachine
        $isKmsCrack = $false
        if ($channel -eq "KMS") {
            if ($kmsHost -match "127\.0\.0\.1|localhost|0\.0\.0\.0|10\.0\.0\.1" -or (-not $kmsHost)) {
                $isKmsCrack = $true
            }
        }

        $WindowsLicense = @{
            name = [string]$osLic.Name
            description = [string]$osLic.Description
            status = $statusText
            statusCode = [int]$osLic.LicenseStatus
            channel = $channel
            partialKey = [string]$osLic.PartialProductKey
            isKms = ($channel -eq "KMS")
            isKmsCrack = $isKmsCrack
            isGenuine = ($statusText -eq "Licensed" -and -not $isKmsCrack)
            kmsHost = $kmsHost
        }
    }
} catch {
    $WindowsLicense.status = "ErrorQuerying"
}

# 3.2. Bản quyền Microsoft Office
$OfficeLicense = @{
    name = "Microsoft Office"
    status = "NotDetected"
    channel = ""
    partialKey = ""
    isKms = $false
}

try {
    $offLic = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "*Office*" } |
        Select-Object -First 1

    if (-not $offLic) {
        $offLic = Get-CimInstance -Namespace root\cimv2 -ClassName OfficeSoftwareProtectionProduct -Filter "PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like "*Office*" } |
            Select-Object -First 1
    }

    if ($offLic) {
        $offStatus = switch ($offLic.LicenseStatus) {
            1 { "Licensed" }
            0 { "Unlicensed" }
            5 { "Notification" }
            default { "Status-$($offLic.LicenseStatus)" }
        }
        $offChannel = if ($offLic.Description -match "OEM") { "OEM" }
                      elseif ($offLic.Description -match "VOLUME_KMS|VOLUME:GVLK") { "KMS" }
                      elseif ($offLic.Description -match "VOLUME_MAK|VOLUME:MAK") { "MAK" }
                      elseif ($offLic.Description -match "RETAIL") { "Retail" }
                      elseif ($offLic.Description -match "SUBSCRIPTION") { "Subscription" }
                      else { "Standard" }

        $OfficeLicense = @{
            name = [string]$offLic.Name
            status = $offStatus
            statusCode = [int]$offLic.LicenseStatus
            channel = $offChannel
            partialKey = [string]$offLic.PartialProductKey
            isKms = ($offChannel -eq "KMS")
        }
    }
} catch {
    $OfficeLicense.status = "ErrorQuerying"
}

# 3.3. Dấu hiệu Crack / Bẻ khóa (Crack / Tamper Detection)
$CrackWarnings = @()

# A. Kiểm tra file hosts chặn server bản quyền của hãng
$HostsPath = "$env:windir\System32\drivers\etc\hosts"
if (Test-Path $HostsPath) {
    $HostsLines = Get-Content $HostsPath -ErrorAction SilentlyContinue
    $BlockedDomains = @()
    foreach ($line in $HostsLines) {
        $trimmed = $line.Trim()
        if ($trimmed -and (-not $trimmed.StartsWith("#"))) {
            if ($trimmed -match "adobe|autodesk|corel|jetbrains|photoshop|acrobat") {
                $BlockedDomains += $trimmed
            }
        }
    }
    if ($BlockedDomains.Count -gt 0) {
        $CrackWarnings += "File hosts chứa $($BlockedDomains.Count) dòng chặn server bản quyền của hãng (Adobe/Autodesk/Corel...)"
    }
}

# B. Kiểm tra tiến trình crack đang chạy
$SuspectProcesses = @("AutoKMS", "KMSPico", "KMSAuto", "SECOH-QAD", "AAct", "HEU_KMS")
$RunningProcs = Get-Process -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessName
foreach ($proc in $SuspectProcesses) {
    if ($RunningProcs -contains $proc) {
        $CrackWarnings += "Phát hiện tiến trình công cụ crack đang chạy ngầm: $proc"
    }
}

# C. Kiểm tra dịch vụ Windows bẻ khóa
$SuspectServices = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "AutoKMS|KMSPico|SECOH-QAD" }
foreach ($svc in $SuspectServices) {
    $CrackWarnings += "Phát hiện dịch vụ kích hoạt lậu: $($svc.Name) ($($svc.Status))"
}

# D. Kiểm tra file tool crack trên ổ cứng
$SuspectFiles = @(
    "$env:windir\AutoKMS\AutoKMS.exe",
    "$env:ProgramFiles\KMSPico\AutoPico.exe",
    "$env:ProgramFiles (x86)\KMSPico\AutoPico.exe",
    "$env:windir\SECOH-QAD.exe"
)
foreach ($f in $SuspectFiles) {
    if (Test-Path $f) {
        $CrackWarnings += "Phát hiện file công cụ bẻ khóa: $f"
    }
}

# Nếu Windows kích hoạt qua KMS crack thì thêm cảnh báo
if ($WindowsLicense.isKmsCrack) {
    $kmsTarget = if ($WindowsLicense.kmsHost) { $WindowsLicense.kmsHost } else { '127.0.0.1' }
    $CrackWarnings += "Bản quyền Windows kích hoạt qua máy chủ KMS giả lập / lậu (KMS Host: $kmsTarget)"
}

$CrackDetection = @{
    hasSuspect = ($CrackWarnings.Count -gt 0)
    warnings = $CrackWarnings
}

Write-Host "-> Windows: $($WindowsLicense.name) - Kênh: $($WindowsLicense.channel) ($($WindowsLicense.status))" -ForegroundColor Cyan
if ($CrackDetection.hasSuspect) {
    Write-Host "⚠️ CẢNH BÁO: Phát hiện $($CrackWarnings.Count) dấu hiệu bẻ khóa phần mềm!" -ForegroundColor Red
} else {
    Write-Host "-> Không phát hiện dấu hiệu bẻ khóa phổ biến." -ForegroundColor Green
}

# 4. Đóng gói Payload và gửi về Server SIMPLY IT
Write-Host "[4/4] Đang gửi dữ liệu về hệ thống Simply IT ($ServerUrl)..." -ForegroundColor Green

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
    osLicense = $WindowsLicense
    officeLicense = $OfficeLicense
    crackDetection = $CrackDetection
}

$JsonPayload = $Payload | ConvertTo-Json -Depth 6

try {
    $Endpoint = "$ServerUrl/api/v1/auto-scan/collect"
    $Response = Invoke-RestMethod -Uri $Endpoint -Method Post -Body $JsonPayload -ContentType "application/json; charset=utf-8"
    
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "✅ THÀNH CÔNG: $($Response.message)" -ForegroundColor Green
    Write-Host "   Mã Thiết Bị (Tag): $($Response.assetTag)" -ForegroundColor White
    if ($Response.licenseMatchAlertCount -gt 0) {
        Write-Host "   Phát hiện trùng khớp: $($Response.licenseMatchAlertCount) phần mềm trùng với License trong kho (Chờ duyệt)!" -ForegroundColor Yellow
    }
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host "❌ LỖI GỬI DỮ LIỆU: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Vui lòng kiểm tra địa chỉ ServerUrl và kết nối mạng." -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Red
}
