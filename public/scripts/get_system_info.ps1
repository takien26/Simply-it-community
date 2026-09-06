# ==============================================================================
# SIMPLY IT - Enterprise Hardware Auto-Discovery Agent (.ps1)
# Collects: Hostname, SerialNumber, Brand, Model, CPU, RAM, Disk, GPU, IP, MAC, OS, User
# ==============================================================================

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'

# SIMPLY IT Server Endpoint
$serverUrl = "http://localhost:3000/api/auto-scan/collect"

try {
    # 1. Hostname & User
    $hostname = $env:COMPUTERNAME
    $username = $env:USERNAME
    $userDomain = $env:USERDOMAIN

    # 2. BIOS & Serial Number
    $bios = Get-CimInstance Win32_Bios
    $serialNumber = $bios.SerialNumber
    if (-not $serialNumber -or $serialNumber -match "To be filled|Default|None|0123456789") {
        $csProduct = Get-CimInstance Win32_ComputerSystemProduct
        $serialNumber = $csProduct.IdentifyingNumber
    }
    if (-not $serialNumber) { $serialNumber = $hostname }

    # 3. Manufacturer & Model
    $cs = Get-CimInstance Win32_ComputerSystem
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
    $ipAddress = ($activeNet.IPAddress | Where-Object { $_ -match '^d+.d+.d+.d+$' } | Select-Object -First 1)
    $macAddress = $activeNet.MACAddress

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
            loggedUser = "$userDomain$username"
        }
        scannedAt = (Get-Date).ToString("o")
    }

    $jsonBody = $payload | ConvertTo-Json -Depth 5 -Compress

    # Send HTTP POST to SIMPLY IT Server
    $response = Invoke-RestMethod -Uri $serverUrl -Method Post -Body $jsonBody -ContentType "application/json; charset=utf-8" -TimeoutSec 5
    Write-Output "✅ [SIMPLY IT] Auto-Scan: $($response.message)"
} catch {
    Write-Output "⚠️ [SIMPLY IT] Error: $($_.Exception.Message)"
}
