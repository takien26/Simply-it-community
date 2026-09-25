# ==============================================================================
# SIMPLY IT - Enterprise Asset Agent v4.1.1
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
    [string]$ServerUrl = "__AUTO__",
    [ValidateSet("Inventory", "Health", "Install")]
    [string]$Mode = "Inventory",
    [int]$IntervalMinutes = 15
)

# Set UTF-8 Output Encoding for console compatibility
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'

# Auto-detect local port only if ServerUrl was not explicitly provided (still has default value)
if ($ServerUrl -eq "__AUTO__") {
    $candidatePorts = @(3001, 3000, 3443, 3444)
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

function Invoke-CollectorSafe {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][scriptblock]$Collector,
        $DefaultValue = $null
    )

    try {
        $result = & $Collector
        $isEmpty = ($null -eq $result)
        if (-not $isEmpty -and $result -is [string]) {
            $isEmpty = [string]::IsNullOrWhiteSpace([string]$result)
        } elseif (-not $isEmpty -and $result -is [array]) {
            $isEmpty = ($result.Count -eq 0)
        }

        if ($isEmpty) {
            Log "COLLECTOR EMPTY [$Name]"
        } else {
            Log "COLLECTOR OK [$Name]"
        }
        return $result
    } catch {
        Log "COLLECTOR FAILED [$Name] : $($_.Exception.Message)"
        return $DefaultValue
    }
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

# Safe Serial Number detection with robust blacklist filtering
$genericSerials = @(
    "Default string",
    "To be filled by O.E.M.",
    "None",
    "System Serial Number",
    "All Series",
    "0123456789",
    "1234567890",
    "Chassis Serial Number",
    "Not Specified",
    "System Manufacturer"
)

function Test-IsGenericSerial {
    param([string]$Serial)
    if ([string]::IsNullOrWhiteSpace($Serial)) { return $true }
    $s = $Serial.Trim()
    if ($s.Length -lt 3) { return $true }
    foreach ($g in $genericSerials) {
        if ($s -ieq $g -or $s.ToLower().StartsWith($g.ToLower())) {
            return $true
        }
    }
    return $false
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

# ==============================================================================
# IT HEALTH MONITORING COLLECTORS (Lightweight, 1-3 seconds, isolated try/catch)
# ==============================================================================

function Get-HealthCpu {
    try {
        $cpus = @(Get-CimCompat "Win32_Processor")
        if ($cpus.Count -gt 0) {
            $avg = ($cpus | Measure-Object -Property LoadPercentage -Average).Average
            if ($null -ne $avg) {
                return @{ usagePercent = [math]::Round([double]$avg, 1) }
            }
        }
    } catch {
        Log "Health CPU failed: $($_.Exception.Message)"
    }
    return @{ usagePercent = $null }
}

function Get-HealthRam {
    try {
        $os = Get-CimCompat "Win32_OperatingSystem"
        if ($os) {
            $totalKb = [double]$os.TotalVisibleMemorySize
            $freeKb  = [double]$os.FreePhysicalMemory
            if ($totalKb -gt 0) {
                $totalGB = [math]::Round($totalKb / (1024 * 1024), 2)
                $freeGB  = [math]::Round($freeKb / (1024 * 1024), 2)
                $usedGB  = [math]::Round($totalGB - $freeGB, 2)
                $usedPct = [math]::Round(($usedGB / $totalGB) * 100, 1)
                return @{
                    totalGB     = $totalGB
                    usedGB      = $usedGB
                    availableGB = $freeGB
                    usedPercent = $usedPct
                }
            }
        }
    } catch {
        Log "Health RAM failed: $($_.Exception.Message)"
    }
    return @{ totalGB = $null; usedGB = $null; availableGB = $null; usedPercent = $null }
}

function Get-HealthStorage {
    $drives = @()
    try {
        $disks = @(Get-CimCompat "Win32_LogicalDisk" | Where-Object { $_.DriveType -eq 3 })
        foreach ($d in $disks) {
            try {
                $size = [double]$d.Size
                $free = [double]$freeSpace = [double]$d.FreeSpace
                if ($size -gt 0) {
                    $totalGB = [math]::Round($size / (1024 * 1024 * 1024), 1)
                    $freeGB  = [math]::Round($freeSpace / (1024 * 1024 * 1024), 1)
                    $usedGB  = [math]::Round($totalGB - $freeGB, 1)
                    $usedPct = [math]::Round(($usedGB / $totalGB) * 100, 1)
                    $drives += @{
                        drive       = [string]$d.DeviceID
                        totalGB     = $totalGB
                        freeGB      = $freeGB
                        usedGB      = $usedGB
                        usedPercent = $usedPct
                    }
                }
            } catch {}
        }
    } catch {
        Log "Health Storage failed: $($_.Exception.Message)"
    }
    return @($drives)
}

function Get-HealthDefender {
    $result = @{
        available          = $false
        enabled            = $false
        realTimeProtection = $false
        signatureAgeDays   = $null
    }
    try {
        if (Get-Command Get-MpComputerStatus -ErrorAction SilentlyContinue) {
            $mp = Get-MpComputerStatus -ErrorAction Stop
            if ($mp) {
                $sigAge = if ($mp.AntivirusSignatureAge) { [int]$mp.AntivirusSignatureAge } else { 0 }
                return @{
                    available          = $true
                    enabled            = [bool]$mp.AntivirusEnabled
                    realTimeProtection = [bool]$mp.RealTimeProtectionEnabled
                    signatureAgeDays   = $sigAge
                }
            }
        }
    } catch {
        Log "Get-MpComputerStatus failed: $($_.Exception.Message)"
    }

    try {
        $av = Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction Stop |
            Where-Object { $_.displayName -match "Defender" } | Select-Object -First 1
        if ($av) {
            return @{
                available          = $true
                enabled            = $true
                realTimeProtection = $true
                signatureAgeDays   = $null
            }
        }
    } catch {}

    return $result
}

function Get-HealthFirewall {
    $result = @{
        domain  = $null
        private = $null
        public  = $null
    }
    try {
        if (Get-Command Get-NetFirewallProfile -ErrorAction SilentlyContinue) {
            $profiles = @(Get-NetFirewallProfile -ErrorAction Stop)
            foreach ($p in $profiles) {
                if ($p.Name -ieq "Domain") { $result.domain = [bool]$p.Enabled }
                if ($p.Name -ieq "Private") { $result.private = [bool]$p.Enabled }
                if ($p.Name -ieq "Public") { $result.public = [bool]$p.Enabled }
            }
            return $result
        }
    } catch {
        Log "Get-NetFirewallProfile failed: $($_.Exception.Message)"
    }

    try {
        $netsh = netsh advfirewall show allprofiles state
        $result.domain  = [bool]($netsh -match "Domain Profile[\s\S]*?State\s+ON")
        $result.private = [bool]($netsh -match "Private Profile[\s\S]*?State\s+ON")
        $result.public  = [bool]($netsh -match "Public Profile[\s\S]*?State\s+ON")
    } catch {}

    return $result
}

function Get-HealthBitLocker {
    $volumes = @()
    try {
        if (Get-Command Get-BitLockerVolume -ErrorAction SilentlyContinue) {
            $bvs = @(Get-BitLockerVolume -ErrorAction Stop)
            foreach ($bv in $bvs) {
                $status = switch ([int]$bv.ProtectionStatus) {
                    1 { "On" }
                    0 { "Off" }
                    default { [string]$bv.ProtectionStatus }
                }
                $volumes += @{
                    drive                = [string]$bv.MountPoint
                    protectionStatus     = $status
                    encryptionPercentage = [int]$bv.EncryptionPercentage
                }
            }
            return @($volumes)
        }
    } catch {
        Log "Get-BitLockerVolume failed: $($_.Exception.Message)"
    }

    try {
        $wmiBv = Get-CimInstance -Namespace root\CIMv2\Security\MicrosoftVolumeEncryption -ClassName Win32_EncryptableVolume -ErrorAction Stop
        foreach ($wb in $wmiBv) {
            $volumes += @{
                drive                = [string]$wb.DriveLetter
                protectionStatus     = if ($wb.ProtectionStatus -eq 1) { "On" } else { "Off" }
                encryptionPercentage = $null
            }
        }
    } catch {}

    return @($volumes)
}

function Get-HealthWindowsUpdate {
    $result = @{
        lastUpdate        = $null
        pendingReboot     = $false
        rebootPendingDays = 0
    }

    try {
        $rebootPending = $false
        $keys = @(
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending",
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired",
            "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations"
        )
        foreach ($k in $keys) {
            if (Test-Path $k) {
                $rebootPending = $true
                break
            }
        }
        $result.pendingReboot = $rebootPending
    } catch {}

    try {
        $detectKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\Results\Detect"
        if (Test-Path $detectKey) {
            $lastDetect = (Get-ItemProperty $detectKey -Name LastSuccessTime -ErrorAction SilentlyContinue).LastSuccessTime
            if ($lastDetect) {
                $result.lastUpdate = [string]$lastDetect
            }
        }
    } catch {}

    if (-not $result.lastUpdate) {
        try {
            $qfe = Get-CimCompat "Win32_QuickFixEngineering" | Sort-Object InstalledOn -Descending | Select-Object -First 1
            if ($qfe -and $qfe.InstalledOn) {
                $result.lastUpdate = [string]$qfe.InstalledOn
            }
        } catch {}
    }

    return $result
}

function Get-HealthServices {
    $targetServices = @("WinDefend", "wuauserv", "LanmanWorkstation")
    $list = @()
    foreach ($svcName in $targetServices) {
        try {
            $s = Get-Service -Name $svcName -ErrorAction SilentlyContinue
            if ($s) {
                $list += @{
                    name        = [string]$s.Name
                    status      = [string]$s.Status
                    displayName = [string]$s.DisplayName
                }
            }
        } catch {}
    }
    return @($list)
}

function Get-HealthBattery {
    try {
        $bats = @(Get-CimCompat "Win32_Battery")
        if ($bats.Count -gt 0) {
            $b = $bats[0]
            return @{
                present       = $true
                percentage    = [int]$b.EstimatedChargeRemaining
                healthPercent = if ($b.DesignCapacity -and $b.FullChargeCapacity -and $b.DesignCapacity -gt 0) {
                    [math]::Round(($b.FullChargeCapacity / $b.DesignCapacity) * 100, 0)
                } else { $null }
            }
        }
    } catch {}
    return @{ present = $false; percentage = $null; healthPercent = $null }
}

function Get-HealthUptime {
    try {
        $os = Get-CimCompat "Win32_OperatingSystem"
        if ($os -and $os.LastBootUpTime) {
            $boot = [datetime]$os.LastBootUpTime
            $diff = (Get-Date) - $boot
            return @{
                lastBoot      = $boot.ToString("o")
                uptimeMinutes = [int][math]::Floor($diff.TotalMinutes)
            }
        }
    } catch {}
    return @{ lastBoot = $null; uptimeMinutes = $null }
}

function Install-HealthTask {
    param(
        [string]$TargetServerUrl,
        [int]$Minutes = 15
    )

    $TaskName = "SIMPLY IT Agent Health"
    $InstallDir = $AgentRoot
    $TargetScript = Join-Path $InstallDir "simply-it-agent.ps1"

    Write-Host "[Install] Dang cai dat Scheduled Task '$TaskName' (Chu ky: $Minutes phut)..." -ForegroundColor Cyan
    Log "INSTALL: Starting installation of Scheduled Task '$TaskName' with interval $Minutes min"

    try {
        $currentScriptPath = $MyInvocation.MyCommand.Definition
        if ($currentScriptPath -and (Test-Path $currentScriptPath)) {
            Copy-Item -Path $currentScriptPath -Destination $TargetScript -Force -ErrorAction SilentlyContinue
            Log "INSTALL: Copied current script to $TargetScript"
        }

        if (Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue) {
            $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
            if ($existingTask) {
                Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
                Log "INSTALL: Removed existing task to prevent duplicates"
            }

            $action = New-ScheduledTaskAction -Execute "powershell.exe" `
                -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File `"$TargetScript`" -Mode Health -ServerUrl `"$TargetServerUrl`""

            $timespan = New-TimeSpan -Minutes $Minutes
            $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval $timespan
            $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
            $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

            Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

            Write-Host "==========================================================" -ForegroundColor Green
            Write-Host "   [SIMPLY IT] CAI DAT HEALTH TASK THANH CONG!            " -ForegroundColor Green
            Write-Host "   Task Name: $TaskName" -ForegroundColor Yellow
            Write-Host "   Chu ky   : Moi $Minutes phut" -ForegroundColor Yellow
            Write-Host "   Quyen    : NT AUTHORITY\SYSTEM" -ForegroundColor Yellow
            Write-Host "   Script   : $TargetScript" -ForegroundColor Yellow
            Write-Host "==========================================================" -ForegroundColor Green
            Log "INSTALL: Successfully registered task '$TaskName' under SYSTEM"
            return $true
        } else {
            $schCmd = "schtasks.exe /Create /TN `"$TaskName`" /TR `"powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File `\`"$TargetScript`\`" -Mode Health -ServerUrl `\`"$TargetServerUrl`\`"`" /SC MINUTE /MO $Minutes /RU `"SYSTEM`" /RL HIGHEST /F"
            cmd.exe /c $schCmd | Out-Null
            Log "INSTALL: Created task via schtasks fallback"
            return $true
        }
    } catch {
        Write-Host "   [SIMPLY IT] LOI CAI DAT TASK: $($_.Exception.Message)" -ForegroundColor Red
        Log "INSTALL FAILED: $($_.Exception.Message)"
        return $false
    }
}

# --------------------------------------------------------------------------
# SANITIZE PAYLOAD - PostgreSQL does not accept NUL (U+0000) in text fields.
# Some Windows WMI/Registry values can contain embedded NUL characters.
# Clean recursively before JSON serialization so the API cannot receive them.
# --------------------------------------------------------------------------
function Remove-NullCharacters {
    param(
        [Parameter(Mandatory = $false)]
        $Value
    )

    if ($null -eq $Value) {
        return $null
    }

    if ($Value -is [string]) {
        if ($Value.IndexOf([char]0) -ge 0) {
            return $Value.Replace([string][char]0, "")
        }
        return $Value
    }

    if ($Value -is [System.Collections.IDictionary]) {
        $clean = @{}
        foreach ($key in $Value.Keys) {
            $cleanKey = if ($key -is [string]) {
                ([string]$key).Replace([string][char]0, "")
            } else {
                $key
            }
            $clean[$cleanKey] = Remove-NullCharacters $Value[$key]
        }
        return $clean
    }

    if ($Value -is [System.Collections.IEnumerable] -and
        -not ($Value -is [System.Management.Automation.PSObject])) {
        $items = @()
        foreach ($item in $Value) {
            $items += ,(Remove-NullCharacters $item)
        }
        return $items
    }

    if ($Value.PSObject -and $Value.PSObject.Properties.Count -gt 0) {
        $clean = [ordered]@{}
        foreach ($prop in $Value.PSObject.Properties) {
            $clean[$prop.Name] = Remove-NullCharacters $prop.Value
        }
        return $clean
    }

    return $Value
}

# ==============================================================================
# MODE DISPATCHER: Install / Health / Inventory (Default)
# ==============================================================================

if ($Mode -eq "Install") {
    Install-HealthTask -TargetServerUrl $ServerUrl -Minutes $IntervalMinutes
    exit 0
}

if ($Mode -eq "Health") {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "   SIMPLY IT - THU THAP CHI SO SINH TON (HEALTH REPORT)   " -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Cyan
    Log "===== SIMPLY IT HEALTH AGENT START ====="

    try {
        $bios      = Get-CimCompat "Win32_BIOS"
        $csProduct = Get-CimCompat "Win32_ComputerSystemProduct"
        $hostname  = [string]$env:COMPUTERNAME

        $serialNumber = [string]$bios.SerialNumber
        if (Test-IsGenericSerial $serialNumber) {
            $serialNumber = [string]$csProduct.IdentifyingNumber
        }
        if (Test-IsGenericSerial $serialNumber) {
            $serialNumber = ""
        }

        # Each health collector is isolated so one failure cannot stop the remaining report.
        $healthCpu = Invoke-CollectorSafe -Name "Health.CPU" -DefaultValue @{ usagePercent = $null } -Collector { Get-HealthCpu }
        $healthRam = Invoke-CollectorSafe -Name "Health.RAM" -DefaultValue @{ totalGB = $null; usedGB = $null; availableGB = $null; usedPercent = $null } -Collector { Get-HealthRam }
        $healthStorage = Invoke-CollectorSafe -Name "Health.Storage" -DefaultValue @() -Collector { Get-HealthStorage }
        $healthDefender = Invoke-CollectorSafe -Name "Health.Defender" -DefaultValue @{ available=$false; enabled=$false; realTimeProtection=$false; signatureAgeDays=$null } -Collector { Get-HealthDefender }
        $healthFirewall = Invoke-CollectorSafe -Name "Health.Firewall" -DefaultValue @{ domain=$null; private=$null; public=$null } -Collector { Get-HealthFirewall }
        $healthBitLocker = Invoke-CollectorSafe -Name "Health.BitLocker" -DefaultValue @() -Collector { Get-HealthBitLocker }
        $healthWindowsUpdate = Invoke-CollectorSafe -Name "Health.WindowsUpdate" -DefaultValue @{ lastUpdate=$null; pendingReboot=$false; rebootPendingDays=0 } -Collector { Get-HealthWindowsUpdate }
        $healthServices = Invoke-CollectorSafe -Name "Health.Services" -DefaultValue @() -Collector { Get-HealthServices }
        $healthBattery = Invoke-CollectorSafe -Name "Health.Battery" -DefaultValue @{ present=$false; percentage=$null; healthPercent=$null } -Collector { Get-HealthBattery }
        $healthUptime = Invoke-CollectorSafe -Name "Health.Uptime" -DefaultValue @{ lastBoot=$null; uptimeMinutes=$null } -Collector { Get-HealthUptime }

        $healthPayload = [ordered]@{
            hostname       = $hostname
            serialNumber   = $serialNumber
            agent          = @{
                version       = "4.1.1"
                schemaVersion = "1.0"
                collectedAt   = (Get-Date).ToString("o")
            }
            cpu            = $healthCpu
            ram            = $healthRam
            storage        = $healthStorage
            security       = @{
                defender  = $healthDefender
                firewall  = $healthFirewall
                bitlocker = $healthBitLocker
            }
            windowsUpdate  = $healthWindowsUpdate
            services       = $healthServices
            battery        = $healthBattery
            uptime         = $healthUptime
        }

        $healthPayloadClean = Remove-NullCharacters $healthPayload
        $jsonHealth = $healthPayloadClean | ConvertTo-Json -Depth 8 -Compress

        $HealthJsonFile = Join-Path $AgentRoot "SimplyIT-last-health.json"
        try {
            $healthPayloadClean | ConvertTo-Json -Depth 8 | Set-Content -Path $HealthJsonFile -Encoding UTF8
            Log "Health payload saved to $HealthJsonFile"
        } catch {}

        $healthEndpoints = @(
            "$ServerUrl/api/v1/health/report",
            "http://127.0.0.1:3001/api/v1/health/report",
            "http://localhost:3001/api/v1/health/report"
        ) | Select-Object -Unique

        $sentHealth = $false
        foreach ($hep in $healthEndpoints) {
            if ($sentHealth) { break }
            try {
                Log "POST $hep ..."
                $webReq = [System.Net.HttpWebRequest]::Create($hep)
                $webReq.Method = "POST"
                $webReq.ContentType = "application/json; charset=utf-8"
                $webReq.Timeout = 15000
                $webReq.UserAgent = "SimplyIT-Agent-Health/4.1.1"

                $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonHealth)
                $webReq.ContentLength = $bytes.Length

                $reqStream = $webReq.GetRequestStream()
                $reqStream.Write($bytes, 0, $bytes.Length)
                $reqStream.Close()

                $resp = $webReq.GetResponse()
                $respStream = $resp.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
                $respText = $reader.ReadToEnd()
                $reader.Close()
                $resp.Close()

                $sentHealth = $true
                Write-Host "   [SIMPLY IT] GUI BAO CAO HEALTH THANH CONG!" -ForegroundColor Green
                Log "HEALTH SUCCESS: $hep"
            } catch {
                Log "HEALTH FAILED $hep : $($_.Exception.Message)"
            }
        }
    } catch {
        Log "HEALTH FATAL: $($_.Exception.Message)"
    }

    Log "===== SIMPLY IT HEALTH AGENT END ====="
    exit 0
}

# ==============================================================================
# MODE = "Inventory" (DEFAULT / ORIGINAL v4 EXECUTION)
# ==============================================================================
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SIMPLY IT - THU THAP PHAN CUNG, PHAN MEM & BAN QUYEN   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
Write-Host "Identity  : $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"

Log "===== SIMPLY IT AGENT v4.1.1 START ====="
Log "PowerShell=$($PSVersionTable.PSVersion)"
Log "Identity=$([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"
Log "ServerUrl=$ServerUrl"

try {
    # --------------------------------------------------------------------------
    # 1. Hardware
    # --------------------------------------------------------------------------
    Write-Host "[1/4] Dang thu thap thong so phan cung..." -ForegroundColor Green

    $hostname = [string]$env:COMPUTERNAME
    if ([string]::IsNullOrWhiteSpace($hostname)) {
        Log "COLLECTOR FAILED [Hardware.Hostname] : COMPUTERNAME is empty"
    } else {
        Log "COLLECTOR OK [Hardware.Hostname]"
    }

    $loggedUser = Invoke-CollectorSafe -Name "Hardware.LoggedOnUser" -DefaultValue "" -Collector { Get-LoggedOnUserSafe }

    # Hardware WMI/CIM collectors are isolated. A missing/broken class returns an empty value
    # and does not prevent the remaining hardware collectors from running.
    $bios       = Invoke-CollectorSafe -Name "Hardware.BIOS" -DefaultValue $null -Collector { Get-CimCompat "Win32_BIOS" }
    $cs         = Invoke-CollectorSafe -Name "Hardware.ComputerSystem" -DefaultValue $null -Collector { Get-CimCompat "Win32_ComputerSystem" }
    $csProduct  = Invoke-CollectorSafe -Name "Hardware.ComputerSystemProduct" -DefaultValue $null -Collector { Get-CimCompat "Win32_ComputerSystemProduct" }
    $baseBoard  = Invoke-CollectorSafe -Name "Hardware.BaseBoard" -DefaultValue $null -Collector { Get-CimCompat "Win32_BaseBoard" }
    $cpuObj     = @(Invoke-CollectorSafe -Name "Hardware.CPU" -DefaultValue @() -Collector { @(Get-CimCompat "Win32_Processor") | Select-Object -First 1 })
    $ramChips   = @(Invoke-CollectorSafe -Name "Hardware.RAM" -DefaultValue @() -Collector { @(Get-CimCompat "Win32_PhysicalMemory") })
    $disks      = @(Invoke-CollectorSafe -Name "Hardware.Disk" -DefaultValue @() -Collector { @(Get-CimCompat "Win32_DiskDrive") })
    $gpus       = @(Invoke-CollectorSafe -Name "Hardware.GPU" -DefaultValue @() -Collector { @(Get-CimCompat "Win32_VideoController") })
    $osObj      = Invoke-CollectorSafe -Name "Hardware.OS" -DefaultValue $null -Collector { Get-CimCompat "Win32_OperatingSystem" }
    $enclosure  = Invoke-CollectorSafe -Name "Hardware.Enclosure" -DefaultValue $null -Collector { Get-CimCompat "Win32_SystemEnclosure" }
    $batteries  = @(Invoke-CollectorSafe -Name "Hardware.Battery" -DefaultValue @() -Collector { @(Get-CimCompat "Win32_Battery") })

    $serialNumber = [string]$bios.SerialNumber
    if (Test-IsGenericSerial $serialNumber) {
        $serialNumber = [string]$csProduct.IdentifyingNumber
    }
    if (Test-IsGenericSerial $serialNumber) {
        # Fallback: leave empty so backend identifies via Hostname and stores NULL in database
        $serialNumber = ""
        Log "Serial is generic/OEM placeholder (e.g. Default string). Cleared to avoid database collision."
    }

    $brand = [string]$cs.Manufacturer
    $model = [string]$cs.Model

    # Collect Motherboard (BaseBoard) details
    $motherboard = ""
    if ($baseBoard) {
        $mbMfg  = [string]$baseBoard.Manufacturer
        $mbProd = [string]$baseBoard.Product
        if ($mbProd -and $mbProd -notmatch '(?i)base\s*board|to\s*be\s*filled') {
            if ($mbMfg -and -not ($mbProd.StartsWith($mbMfg, [System.StringComparison]::OrdinalIgnoreCase))) {
                $motherboard = "$mbMfg $mbProd".Trim()
            } else {
                $motherboard = $mbProd.Trim()
            }
        }
    }

    $cpu = [string]$cpuObj.Name
    if ($cpu) { $cpu = $cpu.Trim() }

    # RAM: never report fake 0 GB when RAM cannot be read. Preserve the existing
    # payload field (specs.ram) and return an empty string when no usable capacity is available.
    $ramInfo = Invoke-CollectorSafe -Name "Hardware.RAM.Format" -DefaultValue "" -Collector {
        $totalRamBytes = [int64]0
        $validRamChips = 0

        foreach ($r in $ramChips) {
            try {
                $capacity = [int64]$r.Capacity
                if ($capacity -gt 0) {
                    $totalRamBytes += $capacity
                    $validRamChips++
                }
            } catch {}
        }

        if ($totalRamBytes -le 0 -or $validRamChips -le 0) {
            Log "COLLECTOR FAILED [Hardware.RAM.Format] : RAM capacity unavailable; returning empty string"
            return ""
        }

        $ramGB = [math]::Round($totalRamBytes / 1GB, 0)
        $ramSpeed = ""
        try { $ramSpeed = [string](($ramChips | Select-Object -First 1).Speed) } catch {}
        $ramCount = $validRamChips

        if ([string]::IsNullOrWhiteSpace($ramSpeed)) {
            return "$ramGB GB ($ramCount slots,  MHz)"
        }

        return "$ramGB GB ($ramCount slots, $ramSpeed MHz)"
    }

    $storageInfo = Invoke-CollectorSafe -Name "Hardware.Storage.Format" -DefaultValue "" -Collector {
        $storageList = @()
        foreach ($d in $disks) {
            try {
                $sizeGB = [math]::Round(([double]$d.Size) / 1GB, 0)
                $storageList += "$([string]$d.Model) ($sizeGB GB)"
            } catch {
                Log "COLLECTOR ITEM FAILED [Hardware.Storage.Format] : $($_.Exception.Message)"
            }
        }
        return ($storageList -join " + ")
    }

    $gpusText = Invoke-CollectorSafe -Name "Hardware.GPU.Format" -DefaultValue "" -Collector {
        $gpuNames = @()
        foreach ($g in $gpus) {
            if ($g.Name) { $gpuNames += [string]$g.Name }
        }
        return ($gpuNames -join " / ")
    }

    $os = Invoke-CollectorSafe -Name "Hardware.OS.Format" -DefaultValue "" -Collector {
        $v = [string]$osObj.Caption
        if ($v) { $v = $v.Trim() }
        return $v
    }

    $network = Invoke-CollectorSafe -Name "Hardware.Network" -DefaultValue ([pscustomobject]@{ IP=""; MAC=""; Description="" }) -Collector { Get-NetworkSafe }
    $ipAddress  = [string]$network.IP
    $macAddress = [string]$network.MAC

    # Detect Device Type (Laptop / Desktop / Server)
    $hasBattery = ($batteries.Count -gt 0)
    $chassisList = @(Invoke-CollectorSafe -Name "Hardware.Chassis" -DefaultValue @() -Collector {
        if ($enclosure -and $enclosure.ChassisTypes) { return @($enclosure.ChassisTypes) }
        return @()
    })

    $desktopChassis = @(3, 4, 5, 6, 7, 15, 16, 24)
    $laptopChassis  = @(8, 9, 10, 11, 12, 14, 30, 31, 32)
    $serverChassis  = @(17, 23, 28, 29)

    $deviceType = "Desktop"

    # Comprehensive Desktop motherboards pattern (supports B760M, H610M, B550M, Z790, etc.)
    $desktopPatterns = '(?i)\b(b[12345678]\d{2}|h[134568]\d{2}|z[12345678]\d{2}|x[2345678]\d{2}|a[356]\d{2}|q[13456]\d{2}|b85|h81|h61|b75)(m|e|-|\b)|AORUS|TOMAHAWK|MORTAR|PRO-VDH|GAMING-X|STRIX\s+[BHZX]|TUF\s+GAMING\s+[BHZX]|PRIME\s+[BHZA]|STEEL\s+LEGEND|OptiPlex|ProDesk|EliteDesk|ThinkCentre|Tower|Workstation'

    if (-not $motherboard -and $model -match $desktopPatterns) {
        $motherboard = $model
    }

    if ($motherboard -match $desktopPatterns -or $model -match $desktopPatterns -or $brand -match "Gigabyte|ASRock|Micro-Star|ASUSTeK|ASUS" -or ($chassisList | Where-Object { $desktopChassis -contains $_ })) {
        $deviceType = "Desktop"
    } elseif ($hasBattery -or ($chassisList | Where-Object { $laptopChassis -contains $_ })) {
        $deviceType = "Laptop"
    } elseif ($chassisList | Where-Object { $serverChassis -contains $_ } -or ($os -match "Server")) {
        $deviceType = "Server"
    }

    # For Custom Desktop PC: If model is the motherboard name or generic placeholder, clean it to "PC Lắp Ráp"
    if ($deviceType -eq "Desktop") {
        if ($model -match $desktopPatterns -or $model -match '(?i)system\s*product\s*name|all\s*series|to\s*be\s*filled|default\s*string' -or ($motherboard -and $model -ieq $motherboard)) {
            if (-not $motherboard) { $motherboard = $model }
            $model = "PC Lắp Ráp"
        }
    }

    Write-Host "-> Nhan dien thiet bi: $deviceType (Pin: $hasBattery, Chassis: $($chassisList -join ','))" -ForegroundColor Cyan
    Log "Hardware collected: Host=$hostname Serial=$serialNumber Model=$model Type=$deviceType IP=$ipAddress"

    # --------------------------------------------------------------------------
    # 2. Software
    # --------------------------------------------------------------------------
    Write-Host "[2/4] Dang quet danh sach ung dung & phan mem da cai dat..." -ForegroundColor Green

    $InstalledApps = @(Invoke-CollectorSafe -Name "Software.Inventory" -DefaultValue @() -Collector { @(Get-SoftwareSafe) })

    Write-Host "-> Da phat hien $($InstalledApps.Count) phan mem/ung dung tren may tinh." -ForegroundColor Cyan
    Log "Software count=$($InstalledApps.Count)"

    # --------------------------------------------------------------------------
    # 3. License + Audit
    # --------------------------------------------------------------------------
    Write-Host "[3/4] Dang kiem tra ban quyen Windows, Office & dau hieu be khoa..." -ForegroundColor Green

    $licenseStart   = Get-Date
    $WindowsLicense = Invoke-CollectorSafe -Name "License.Windows" -DefaultValue @{ name=""; status="Unknown"; channel="Unknown"; partialKey=""; isKms=$false; isKmsCrack=$false; isGenuine=$false } -Collector { Get-WindowsLicenseSafe }
    $OfficeLicense  = Invoke-CollectorSafe -Name "License.Office" -DefaultValue @{ name="Microsoft Office"; status="NotDetected"; channel=""; partialKey=""; isKms=$false } -Collector { Get-OfficeLicenseSafe }
    $CrackDetection = Invoke-CollectorSafe -Name "Audit.CrackDetection" -DefaultValue @{ hasSuspect=$false; warnings=@() } -Collector { Get-CrackDetectionSafe }
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
        deviceType        = $deviceType
        specs             = @{
            motherboard  = $motherboard
            deviceType   = $deviceType
            hasBattery   = $hasBattery
            chassisTypes = ($chassisList -join ',')
            cpu          = $cpu
            ram          = $ramInfo
            storage      = $storageInfo
            gpu          = $gpusText
            os           = $os
            ipAddress    = $ipAddress
            macAddress   = $macAddress
            loggedUser   = $loggedUser
        }
        installedSoftware = $InstalledApps
        osLicense         = $WindowsLicense
        officeLicense     = $OfficeLicense
        crackDetection    = $CrackDetection
        scannedAt         = (Get-Date).ToString("o")
    }

    try {
        $payloadClean = Remove-NullCharacters $payload
        $jsonBody = $payloadClean | ConvertTo-Json -Depth 8 -Compress
        Log "COLLECTOR OK [Payload.Serialize]"
    } catch {
        Log "COLLECTOR FAILED [Payload.Serialize] : $($_.Exception.Message)"
        $payloadClean = Remove-NullCharacters @{ hostname=$hostname }
        $jsonBody = $payloadClean | ConvertTo-Json -Depth 8 -Compress
    }

    try {
        $payloadClean | ConvertTo-Json -Depth 8 | Set-Content -Path $JsonFile -Encoding UTF8
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
            $serverDetail = ""
            try {
                if ($_.Exception.Response) {
                    $stream = $_.Exception.Response.GetResponseStream()
                    if ($stream) {
                        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
                        $rawText = $reader.ReadToEnd()
                        if ($rawText) {
                            $parsed = $rawText | ConvertFrom-Json -ErrorAction SilentlyContinue
                            if ($parsed -and $parsed.error) {
                                $serverDetail = $parsed.error
                            } else {
                                $serverDetail = $rawText
                            }
                        }
                    }
                }
            } catch {}

            if ($serverDetail) {
                $lastError = "$($_.Exception.Message) [$serverDetail]"
            }
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

Log "===== SIMPLY IT AGENT v4.1.1 END ====="

# GPO Startup safe: don't report failure if network is temporarily unreachable
exit 0
