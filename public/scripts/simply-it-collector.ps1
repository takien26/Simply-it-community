# ==============================================================================
# SIMPLY IT - Enterprise Asset Agent v4
# Windows 10/11 + PowerShell 5.1 + GPO/SYSTEM compatible
#
# FEATURES:
# - Keeps ORIGINAL SIMPLY IT payload field names for backend compatibility.
# - Fast WMI/CIM query filtering (avoids slow SoftwareLicensingProduct full scan).
# - Safe logged-on user detection under SYSTEM/GPO context (avoids NT AUTHORITY\SYSTEM).
# - WMI/CIM fallback wrapper for maximum OS compatibility (Win 7/8/10/11).
# - Local logging to C:\ProgramData\SimplyIT\SimplyIT-Agent.log.
# - Local payload backup to C:\ProgramData\SimplyIT\SimplyIT-last-payload.json.
# - Automatic TLS 1.2 support and robust HTTP status code inspection.
# - GPO Startup safe: exits 0 even if network is temporarily unreachable.
# ==============================================================================

param(
    [string]$ServerUrl = "__AUTO__"
)

# Set UTF-8 Output Encoding for console compatibility
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'

# Auto-detect local port only if ServerUrl was not explicitly provided (still has default value)
if ($ServerUrl -eq "__AUTO__") {
    $candidatePorts = @(3001, 3000, 3444)
    foreach ($p in $candidatePorts) {
        try {
            $tcp = Test-NetConnection -ComputerName "127.0.0.1" -Port $p -WarningAction SilentlyContinue
            if ($tcp.TcpTestSucceeded) {
                $ServerUrl = "http://localhost:$p"
                break
            }
        } catch {}
    }
    if (-not $ServerUrl -or $ServerUrl -eq "__AUTO__") { $ServerUrl = "http://localhost:3001" }
}

$ServerUrl = $ServerUrl.TrimEnd('/')

$AgentRoot = Join-Path $env:ProgramData "SimplyIT"
$LogFile   = Join-Path $AgentRoot "SimplyIT-Agent.log"
$JsonFile  = Join-Path $AgentRoot "SimplyIT-last-payload.json"

New-Item -Path $AgentRoot -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null

function Log {
    param([string]$Text)
    try {
        Add-Content -Path $LogFile -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Text" -Encoding UTF8
    } catch {}
}

function Get-CimCompat {
    param([string]$ClassName)

    try {
        $x = Get-CimInstance -ClassName $ClassName -ErrorAction Stop
        if ($x) { return $x }
    } catch {
        Log "CIM failed: $ClassName : $($_.Exception.Message)"
    }

    try {
        $x = Get-WmiObject -Class $ClassName -ErrorAction Stop
        if ($x) { return $x }
    } catch {
        Log "WMI failed: $ClassName : $($_.Exception.Message)"
    }

    return $null
}

function Get-LoggedOnUserSafe {
    # GPO Startup runs as SYSTEM, so env:USERNAME is not the real logged-on user.
    try {
        $csu = Get-CimCompat "Win32_ComputerSystem"
        if ($csu -and $csu.UserName) {
            return [string]$csu.UserName
        }
    } catch {}

    try {
        $explorers = @(Get-CimCompat "Win32_Process" | Where-Object { $_.Name -ieq "explorer.exe" })
        foreach ($p in $explorers) {
            try {
                $o = Invoke-CimMethod -InputObject $p -MethodName GetOwner -ErrorAction Stop
                if ($o -and $o.User) {
                    return "$($o.Domain)\$($o.User)"
                }
            } catch {}
        }
    } catch {}

    if ($env:USERNAME) {
        return "$env:USERDOMAIN\$env:USERNAME"
    }

    return ""
}

function Get-NetworkSafe {
    $result = @()

    try {
        $all = @(Get-CimCompat "Win32_NetworkAdapterConfiguration")
        foreach ($n in $all) {
            if (-not $n.IPEnabled) { continue }

            $ipv4 = @($n.IPAddress | Where-Object {
                $_ -match '^\d{1,3}(\.\d{1,3}){3}$'
            })

            if ($ipv4.Count -gt 0) {
                $result += [pscustomobject]@{
                    IP          = [string]$ipv4[0]
                    MAC         = [string]$n.MACAddress
                    Description = [string]$n.Description
                }
            }
        }
    } catch {
        Log "Network collection failed: $($_.Exception.Message)"
    }

    if ($result.Count -gt 0) {
        return $result[0]
    }

    return [pscustomobject]@{
        IP          = ""
        MAC         = ""
        Description = ""
    }
}

function Get-SoftwareSafe {
    $paths = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    $apps = @()
    $seen = @{}

    foreach ($path in $paths) {
        try {
            Get-ItemProperty $path -ErrorAction SilentlyContinue | ForEach-Object {
                $name = [string]$_.DisplayName
                $version = [string]$_.DisplayVersion
                $publisher = [string]$_.Publisher
                $installDate = [string]$_.InstallDate

                if ($name -and
                    ($name -notmatch "^KB\d+") -and
                    ($name -notmatch "^Security Update") -and
                    ($name -notmatch "^Update for Windows")) {

                    $key = "$name|$version"
                    if (-not $seen.ContainsKey($key)) {
                        $seen[$key] = $true
                        $apps += @{
                            name        = $name
                            version     = $version
                            publisher   = $publisher
                            installDate = $installDate
                        }
                    }
                }
            }
        } catch {
            Log "Software scan failed: $path : $($_.Exception.Message)"
        }
    }

    return @($apps)
}

function Get-WindowsLicenseSafe {
    $empty = @{
        name        = ""
        status      = "Unknown"
        channel     = "Unknown"
        partialKey  = ""
        isKms       = $false
        isKmsCrack  = $false
        isGenuine   = $false
    }

    try {
        $osLic = $null
        try {
            $osLic = Get-CimInstance -ClassName SoftwareLicensingProduct `
                -Filter "ApplicationID='55c92734-d682-4d71-983e-d6ec3f16059f' AND PartialProductKey IS NOT NULL" `
                -ErrorAction Stop |
                Where-Object { $_.Name -like "*Windows*" -and $_.Description -like "*Operating System*" } |
                Select-Object -First 1
        } catch {
            try {
                $osLic = Get-WmiObject -Class SoftwareLicensingProduct `
                    -Filter "ApplicationID='55c92734-d682-4d71-983e-d6ec3f16059f' AND PartialProductKey IS NOT NULL" `
                    -ErrorAction Stop |
                    Where-Object { $_.Name -like "*Windows*" -and $_.Description -like "*Operating System*" } |
                    Select-Object -First 1
            } catch {
                Log "Windows license query failed: $($_.Exception.Message)"
            }
        }

        if ($osLic) {
            $statusText = switch ([int]$osLic.LicenseStatus) {
                1 { "Licensed" }
                0 { "Unlicensed" }
                2 { "OOBGrace" }
                3 { "OOTGrace" }
                4 { "NonGenuineGrace" }
                5 { "Notification" }
                default { "Status-$($osLic.LicenseStatus)" }
            }

            $channel = if ($osLic.Description -match "OEM") {
                "OEM"
            } elseif ($osLic.Description -match "VOLUME_KMS|VOLUME:GVLK") {
                "KMS"
            } elseif ($osLic.Description -match "VOLUME_MAK|VOLUME:MAK") {
                "MAK"
            } elseif ($osLic.Description -match "RETAIL") {
                "Retail"
            } else {
                "Standard"
            }

            $kmsHost = [string]$osLic.KeyManagementServiceMachine
            $isKmsCrack = ($channel -eq "KMS" -and (
                $kmsHost -match "127\.0\.0\.1|localhost|0\.0\.0\.0" -or
                [string]::IsNullOrWhiteSpace($kmsHost)
            ))

            return @{
                name        = [string]$osLic.Name
                description = [string]$osLic.Description
                status      = $statusText
                statusCode  = [int]$osLic.LicenseStatus
                channel     = $channel
                partialKey  = [string]$osLic.PartialProductKey
                isKms       = ($channel -eq "KMS")
                isKmsCrack  = $isKmsCrack
                isGenuine   = ($statusText -eq "Licensed" -and -not $isKmsCrack)
                kmsHost     = $kmsHost
            }
        }
    } catch {
        Log "Windows license scan failed: $($_.Exception.Message)"
    }

    return $empty
}

function Get-OfficeLicenseSafe {
    $empty = @{
        name       = "Microsoft Office"
        status     = "NotDetected"
        channel    = ""
        partialKey = ""
        isKms      = $false
    }

    try {
        $off = $null
        try {
            $off = Get-CimInstance -ClassName SoftwareLicensingProduct `
                -Filter "PartialProductKey IS NOT NULL" `
                -ErrorAction Stop |
                Where-Object { $_.Name -like "*Office*" } |
                Select-Object -First 1
        } catch {
            try {
                $off = Get-CimInstance -Namespace root\cimv2 -ClassName OfficeSoftwareProtectionProduct `
                    -Filter "PartialProductKey IS NOT NULL" `
                    -ErrorAction SilentlyContinue |
                    Where-Object { $_.Name -like "*Office*" } |
                    Select-Object -First 1
            } catch {}
        }

        if ($off) {
            $offStatus = switch ([int]$off.LicenseStatus) {
                1 { "Licensed" }
                0 { "Unlicensed" }
                5 { "Notification" }
                default { "Status-$($off.LicenseStatus)" }
            }

            $offChannel = if ($off.Description -match "OEM") {
                "OEM"
            } elseif ($off.Description -match "VOLUME_KMS|VOLUME:GVLK") {
                "KMS"
            } elseif ($off.Description -match "VOLUME_MAK|VOLUME:MAK") {
                "MAK"
            } elseif ($off.Description -match "RETAIL") {
                "Retail"
            } elseif ($off.Description -match "SUBSCRIPTION") {
                "Subscription"
            } else {
                "Standard"
            }

            return @{
                name       = [string]$off.Name
                status     = $offStatus
                statusCode = [int]$off.LicenseStatus
                channel    = $offChannel
                partialKey = [string]$off.PartialProductKey
                isKms      = ($offChannel -eq "KMS")
            }
        }
    } catch {
        Log "Office license scan failed: $($_.Exception.Message)"
    }

    return $empty
}

function Get-CrackDetectionSafe {
    $warnings = @()

    try {
        $hostsPath = Join-Path $env:windir "System32\drivers\etc\hosts"
        if (Test-Path $hostsPath) {
            $lines = @(Get-Content $hostsPath -ErrorAction SilentlyContinue)
            $blocked = @(
                $lines | Where-Object {
                    $_ -and
                    (-not $_.Trim().StartsWith("#")) -and
                    ($_ -match "adobe|autodesk|corel|jetbrains|photoshop|acrobat")
                }
            )

            if ($blocked.Count -gt 0) {
                $warnings += "File hosts chua $($blocked.Count) dong chan server ban quyen (Adobe/Autodesk/Corel...)"
            }
        }
    } catch {}

    try {
        $suspect = @("AutoKMS", "KMSPico", "KMSAuto", "SECOH-QAD", "AAct", "HEU_KMS")
        $running = @(Get-Process -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessName)

        foreach ($p in $suspect) {
            if ($running -contains $p) {
                $warnings += "Phat hien tien trinh crack dang chay: $p"
            }
        }
    } catch {}

    return @{
        hasSuspect = ($warnings.Count -gt 0)
        warnings   = $warnings
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SIMPLY IT - THU THAP PHAN CUNG, PHAN MEM & BAN QUYEN   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
Write-Host "Identity  : $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"

Log "===== SIMPLY IT AGENT v4 START ====="
Log "PowerShell=$($PSVersionTable.PSVersion)"
Log "Identity=$([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"
Log "ServerUrl=$ServerUrl"

try {
    # --------------------------------------------------------------------------
    # 1. Hardware
    # --------------------------------------------------------------------------
    Write-Host "[1/4] Dang thu thap thong so phan cung..." -ForegroundColor Green

    $hostname   = [string]$env:COMPUTERNAME
    $loggedUser = Get-LoggedOnUserSafe

    $bios       = Get-CimCompat "Win32_BIOS"
    $cs         = Get-CimCompat "Win32_ComputerSystem"
    $csProduct  = Get-CimCompat "Win32_ComputerSystemProduct"
    $cpuObj     = @(Get-CimCompat "Win32_Processor") | Select-Object -First 1
    $ramChips   = @(Get-CimCompat "Win32_PhysicalMemory")
    $disks      = @(Get-CimCompat "Win32_DiskDrive")
    $gpus       = @(Get-CimCompat "Win32_VideoController")
    $osObj      = Get-CimCompat "Win32_OperatingSystem"

    $serialNumber = [string]$bios.SerialNumber
    if ([string]::IsNullOrWhiteSpace($serialNumber) -or
        $serialNumber -match "To be filled|Default|None|0123456789") {
        $serialNumber = [string]$csProduct.IdentifyingNumber
    }
    if ([string]::IsNullOrWhiteSpace($serialNumber)) {
        $serialNumber = $hostname
    }

    $brand = [string]$cs.Manufacturer
    $model = [string]$cs.Model

    $cpu = [string]$cpuObj.Name
    if ($cpu) { $cpu = $cpu.Trim() }

    $totalRamBytes = 0
    foreach ($r in $ramChips) {
        try { $totalRamBytes += [int64]$r.Capacity } catch {}
    }
    $ramGB    = [math]::Round($totalRamBytes / 1GB, 0)
    $ramSpeed = [string](($ramChips | Select-Object -First 1).Speed)
    $ramCount = @($ramChips).Count
    $ramInfo  = "$ramGB GB ($ramCount slots, $ramSpeed MHz)"

    $storageList = @()
    foreach ($d in $disks) {
        try {
            $sizeGB = [math]::Round(([double]$d.Size) / 1GB, 0)
            $storageList += "$([string]$d.Model) ($sizeGB GB)"
        } catch {}
    }
    $storageInfo = $storageList -join " + "

    $gpuNames = @()
    foreach ($g in $gpus) {
        if ($g.Name) { $gpuNames += [string]$g.Name }
    }
    $gpusText = $gpuNames -join " / "

    $os = [string]$osObj.Caption
    if ($os) { $os = $os.Trim() }

    $network    = Get-NetworkSafe
    $ipAddress  = [string]$network.IP
    $macAddress = [string]$network.MAC

    Log "Hardware collected: Host=$hostname Serial=$serialNumber Model=$model IP=$ipAddress"

    # --------------------------------------------------------------------------
    # 2. Software
    # --------------------------------------------------------------------------
    Write-Host "[2/4] Dang quet danh sach ung dung & phan mem da cai dat..." -ForegroundColor Green

    $InstalledApps = @(Get-SoftwareSafe)

    Write-Host "-> Da phat hien $($InstalledApps.Count) phan mem/ung dung tren may tinh." -ForegroundColor Cyan
    Log "Software count=$($InstalledApps.Count)"

    # --------------------------------------------------------------------------
    # 3. License + Audit
    # --------------------------------------------------------------------------
    Write-Host "[3/4] Dang kiem tra ban quyen Windows, Office & dau hieu be khoa..." -ForegroundColor Green

    $licenseStart   = Get-Date
    $WindowsLicense = Get-WindowsLicenseSafe
    $OfficeLicense  = Get-OfficeLicenseSafe
    $CrackDetection = Get-CrackDetectionSafe
    Log "License/audit collection time: $([math]::Round(((Get-Date)-$licenseStart).TotalSeconds,2)) sec"

    if ($WindowsLicense.isKmsCrack) {
        $kmsTarget = if ($WindowsLicense.kmsHost) { $WindowsLicense.kmsHost } else { "127.0.0.1" }
        $CrackDetection.warnings += "Ban quyen Windows kich hoat qua may chu KMS gia lap ($kmsTarget)"
        $CrackDetection.hasSuspect = $true
    }

    # --------------------------------------------------------------------------
    # 4. ORIGINAL PAYLOAD FORMAT
    # --------------------------------------------------------------------------
    $payload = @{
        hostname          = $hostname
        serialNumber      = $serialNumber
        brand             = $brand
        model             = $model
        specs             = @{
            cpu        = $cpu
            ram        = $ramInfo
            storage    = $storageInfo
            gpu        = $gpusText
            os         = $os
            ipAddress  = $ipAddress
            macAddress = $macAddress
            loggedUser = $loggedUser
        }
        installedSoftware = $InstalledApps
        osLicense         = $WindowsLicense
        officeLicense     = $OfficeLicense
        crackDetection    = $CrackDetection
        scannedAt         = (Get-Date).ToString("o")
    }

    $jsonBody = $payload | ConvertTo-Json -Depth 8 -Compress

    try {
        $payload | ConvertTo-Json -Depth 8 | Set-Content -Path $JsonFile -Encoding UTF8
        Log "Payload saved to $JsonFile"
    } catch {
        Log "Payload save failed: $($_.Exception.Message)"
    }

    # --------------------------------------------------------------------------
    # SEND HTTP POST TO SIMPLY IT SERVER
    # --------------------------------------------------------------------------
    Write-Host "[4/4] Dang gui du lieu ve he thong Simply IT ($ServerUrl)..." -ForegroundColor Green

    $endpoints = @(
        "$ServerUrl/api/v1/auto-scan/collect",
        "$ServerUrl/api/auto-scan/collect"
    )

    $sent = $false
    $lastError = ""

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    } catch {}

    foreach ($ep in $endpoints) {
        if ($sent) { break }

        Log "POST $ep"

        try {
            $resp = Invoke-WebRequest `
                -Uri $ep `
                -Method Post `
                -Body $jsonBody `
                -ContentType "application/json; charset=utf-8" `
                -UseBasicParsing `
                -TimeoutSec 20 `
                -ErrorAction Stop

            $status = [int]$resp.StatusCode
            Log "HTTP $status from $ep"

            if ($status -ge 200 -and $status -lt 300) {
                $sent = $true

                $responseObj = $null
                try {
                    if ($resp.Content) {
                        $responseObj = $resp.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
                    }
                } catch {}

                $assetTag   = "N/A"
                $devName    = $hostname
                $matchCount = 0

                if ($responseObj) {
                    if ($responseObj.assetTag) { $assetTag = [string]$responseObj.assetTag }
                    if ($responseObj.deviceName) { $devName = [string]$responseObj.deviceName }
                    if ($responseObj.licenseMatchAlertCount) { $matchCount = [int]$responseObj.licenseMatchAlertCount }
                }

                Write-Host "==========================================================" -ForegroundColor Green
                Write-Host "   [SIMPLY IT] GUI DU LIEU THANH CONG!" -ForegroundColor Green
                Write-Host "   May tinh    : $devName" -ForegroundColor White
                Write-Host "   Ma thiet bi : $assetTag" -ForegroundColor White
                Write-Host "   Server URL  : $ServerUrl" -ForegroundColor Gray
                Write-Host "   HTTP Status : $status" -ForegroundColor Gray
                if ($matchCount -gt 0) {
                    Write-Host "   Canh bao    : Phat hien $matchCount phan mem trung voi License trong kho (cho duyet)!" -ForegroundColor Yellow
                }
                Write-Host "==========================================================" -ForegroundColor Green
                Log "SEND SUCCESS HTTP=$status AssetTag=$assetTag"
            }
        } catch {
            $lastError = $_.Exception.Message
            Log "POST FAILED $ep : $lastError"
        }
    }

    if (-not $sent) {
        Write-Host "==========================================================" -ForegroundColor Red
        Write-Host "   [SIMPLY IT] KHONG GUI DUOC DU LIEU" -ForegroundColor Red
        Write-Host "   Server: $ServerUrl" -ForegroundColor Yellow
        Write-Host "   Loi cuoi: $lastError" -ForegroundColor Yellow
        Write-Host "   Payload da duoc luu tai: $JsonFile" -ForegroundColor Yellow
        Write-Host "==========================================================" -ForegroundColor Red
        Log "SEND FAILED. LastError=$lastError"
    }
}
catch {
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host "   [SIMPLY IT] LOI THUC THI: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "==========================================================" -ForegroundColor Red
    Log "FATAL: $($_.Exception.Message)"
}

Log "===== SIMPLY IT AGENT v4 END ====="

# GPO Startup safe: don't report failure if network is temporarily unreachable
exit 0
