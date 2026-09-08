# ==============================================================================
# SIMPLY IT - Enterprise Hardware, Software & License Auto-Discovery Agent (.ps1)
# Collects: Hardware, OS/Office License, Installed Software & Crack Detection
# ==============================================================================

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'

# SIMPLY IT Server Endpoint
$serverUrl = "http://localhost:3000/api/v1/auto-scan/collect"

try {
    # 1. Hostname & User
    $hostname = $env:COMPUTERNAME
    $username = $env:USERNAME
    $userDomain = $env:USERDOMAIN

    # 2. BIOS & Serial Number
    $bios = Get-CimInstance Win32_Bios
    if (-not $bios) { $bios = Get-WmiObject Win32_Bios }
    $serialNumber = $bios.SerialNumber
    if (-not $serialNumber -or $serialNumber -match "To be filled|Default|None|0123456789") {
        $csProduct = Get-CimInstance Win32_ComputerSystemProduct
        if (-not $csProduct) { $csProduct = Get-WmiObject Win32_ComputerSystemProduct }
        $serialNumber = $csProduct.IdentifyingNumber
    }
    if (-not $serialNumber) { $serialNumber = $hostname }

    # 3. Manufacturer & Model
    $cs = Get-CimInstance Win32_ComputerSystem
    if (-not $cs) { $cs = Get-WmiObject Win32_ComputerSystem }
    $brand = $cs.Manufacturer
    $model = $cs.Model

    # 4. Processor (CPU)
    $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name.Trim()

    # 5. Memory (RAM)
    $ramChips = Get-CimInstance Win32_PhysicalMemory
    $totalRamBytes = ($ramChips | Measure-Object -Property Capacity -Sum).Sum
    $ramGB = [math]::Round($totalRamBytes / 1GB, 0)
    $ramSpeed = ($ramChips | Select-Object -First 1).Speed
    $ramCount = ($ramChips | Measure-Object).Count
    $ramInfo = "$ramGB GB ($ramCount slots, $ramSpeed MHz)"

    # 6. Storage (SSD / HDD)
    $disks = Get-CimInstance Win32_DiskDrive
    $storageList = @()
    foreach ($d in $disks) {
        $sizeGB = [math]::Round($d.Size / 1GB, 0)
        $storageList += "$($d.Model) ($sizeGB GB)"
    }
    $storageInfo = $storageList -join " + "

    # 7. Graphics (GPU)
    $gpus = (Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }) -join " / "

    # 8. Operating System
    $os = (Get-CimInstance Win32_OperatingSystem).Caption.Trim()

    # 9. Network IP & MAC
    $activeNet = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1
    $ipAddress = ($activeNet.IPAddress | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1)
    $macAddress = $activeNet.MACAddress

    # 10. Installed Software List
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

    # 11. Windows License Check
    $WindowsLicense = @{ name = $os; status = "Unknown"; channel = "Unknown"; partialKey = ""; isKms = $false; isKmsCrack = $false; isGenuine = $false }
    try {
        $osLic = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like "*Windows*" -and $_.Description -like "*Operating System*" } | Select-Object -First 1
        if ($osLic) {
            $statusText = switch ($osLic.LicenseStatus) {
                1 { "Licensed" } 0 { "Unlicensed" } 2 { "OOBGrace" } 3 { "OOTGrace" } 4 { "NonGenuineGrace" } 5 { "Notification" } default { "Status-$($osLic.LicenseStatus)" }
            }
            $channel = if ($osLic.Description -match "OEM") { "OEM" } elseif ($osLic.Description -match "VOLUME_KMS|VOLUME:GVLK") { "KMS" } elseif ($osLic.Description -match "VOLUME_MAK|VOLUME:MAK") { "MAK" } elseif ($osLic.Description -match "RETAIL") { "Retail" } else { "Standard" }
            $kmsHost = [string]$osLic.KeyManagementServiceMachine
            $isKmsCrack = ($channel -eq "KMS" -and ($kmsHost -match "127\.0\.0\.1|localhost|0\.0\.0\.0" -or (-not $kmsHost)))
            $WindowsLicense = @{
                name = [string]$osLic.Name; description = [string]$osLic.Description; status = $statusText; statusCode = [int]$osLic.LicenseStatus; channel = $channel; partialKey = [string]$osLic.PartialProductKey; isKms = ($channel -eq "KMS"); isKmsCrack = $isKmsCrack; isGenuine = ($statusText -eq "Licensed" -and -not $isKmsCrack); kmsHost = $kmsHost
            }
        }
    } catch {}

    # 12. Office License Check
    $OfficeLicense = @{ name = "Microsoft Office"; status = "NotDetected"; channel = ""; partialKey = ""; isKms = $false }
    try {
        $offLic = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Office*" } | Select-Object -First 1
        if (-not $offLic) {
            $offLic = Get-CimInstance -Namespace root\cimv2 -ClassName OfficeSoftwareProtectionProduct -Filter "PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Office*" } | Select-Object -First 1
        }
        if ($offLic) {
            $offStatus = switch ($offLic.LicenseStatus) { 1 { "Licensed" } 0 { "Unlicensed" } 5 { "Notification" } default { "Status-$($offLic.LicenseStatus)" } }
            $offChannel = if ($offLic.Description -match "OEM") { "OEM" } elseif ($offLic.Description -match "VOLUME_KMS|VOLUME:GVLK") { "KMS" } elseif ($offLic.Description -match "VOLUME_MAK|VOLUME:MAK") { "MAK" } elseif ($offLic.Description -match "RETAIL") { "Retail" } elseif ($offLic.Description -match "SUBSCRIPTION") { "Subscription" } else { "Standard" }
            $OfficeLicense = @{
                name = [string]$offLic.Name; status = $offStatus; statusCode = [int]$offLic.LicenseStatus; channel = $offChannel; partialKey = [string]$offLic.PartialProductKey; isKms = ($offChannel -eq "KMS")
            }
        }
    } catch {}

    # 13. Crack & Tamper Audit
    $CrackWarnings = @()
    $HostsPath = "$env:windir\System32\drivers\etc\hosts"
    if (Test-Path $HostsPath) {
        $HostsLines = Get-Content $HostsPath -ErrorAction SilentlyContinue
        $BlockedDomains = @($HostsLines | Where-Object { $_ -and (-not $_.Trim().StartsWith("#")) -and ($_ -match "adobe|autodesk|corel|jetbrains|photoshop|acrobat") })
        if ($BlockedDomains.Count -gt 0) {
            $CrackWarnings += "File hosts chứa $($BlockedDomains.Count) dòng chặn server bản quyền của hãng (Adobe/Autodesk/Corel...)"
        }
    }
    $SuspectProcesses = @("AutoKMS", "KMSPico", "KMSAuto", "SECOH-QAD", "AAct", "HEU_KMS")
    $RunningProcs = Get-Process -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessName
    foreach ($proc in $SuspectProcesses) {
        if ($RunningProcs -contains $proc) { $CrackWarnings += "Phát hiện tiến trình crack đang chạy: $proc" }
    }
    if ($WindowsLicense.isKmsCrack) {
        $kmsTarget = if ($WindowsLicense.kmsHost) { $WindowsLicense.kmsHost } else { '127.0.0.1' }
        $CrackWarnings += "Bản quyền Windows kích hoạt qua máy chủ KMS giả lập / lậu ($kmsTarget)"
    }
    $CrackDetection = @{ hasSuspect = ($CrackWarnings.Count -gt 0); warnings = $CrackWarnings }

    # Build Payload
    $payload = @{
        hostname = $hostname
        serialNumber = $serialNumber
        brand = $brand
        model = $model
        specs = @{
            cpu = $cpu
            ram = $ramInfo
            storage = $storageInfo
            gpu = $gpus
            os = $os
            ipAddress = $ipAddress
            macAddress = $macAddress
            loggedUser = "$userDomain\$username"
        }
        installedSoftware = $InstalledApps
        osLicense = $WindowsLicense
        officeLicense = $OfficeLicense
        crackDetection = $CrackDetection
        scannedAt = (Get-Date).ToString("o")
    }

    $jsonBody = $payload | ConvertTo-Json -Depth 6 -Compress

    # Send HTTP POST to SIMPLY IT Server
    $response = Invoke-RestMethod -Uri $serverUrl -Method Post -Body $jsonBody -ContentType "application/json; charset=utf-8" -TimeoutSec 10
    Write-Output "✅ [SIMPLY IT] Auto-Scan: $($response.message)"
} catch {
    Write-Output "⚠️ [SIMPLY IT] Error: $($_.Exception.Message)"
}
