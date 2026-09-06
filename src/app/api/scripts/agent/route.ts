import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let serverUrl = searchParams.get('serverUrl');

  if (!serverUrl) {
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    serverUrl = `${proto}://${host}`;
  }

  serverUrl = serverUrl.replace(/\/+$/, '');
  const rawScript = "# ==============================================================================\n# SIMPLY IT - Enterprise Hardware Auto-Discovery Agent (.ps1)\n# Collects: Hostname, SerialNumber, Brand, Model, CPU, RAM, Disk, GPU, IP, MAC, OS, User\n# ==============================================================================\n\n$ErrorActionPreference = 'SilentlyContinue'\n$ProgressPreference = 'SilentlyContinue'\n\n# SIMPLY IT Server Endpoint\n$serverUrl = \"http://localhost:3000/api/auto-scan/collect\"\n\ntry {\n    # 1. Hostname & User\n    $hostname = $env:COMPUTERNAME\n    $username = $env:USERNAME\n    $userDomain = $env:USERDOMAIN\n\n    # 2. BIOS & Serial Number\n    $bios = Get-CimInstance Win32_Bios\n    $serialNumber = $bios.SerialNumber\n    if (-not $serialNumber -or $serialNumber -match \"To be filled|Default|None|0123456789\") {\n        $csProduct = Get-CimInstance Win32_ComputerSystemProduct\n        $serialNumber = $csProduct.IdentifyingNumber\n    }\n    if (-not $serialNumber) { $serialNumber = $hostname }\n\n    # 3. Manufacturer & Model\n    $cs = Get-CimInstance Win32_ComputerSystem\n    $brand = $cs.Manufacturer\n    $model = $cs.Model\n\n    # 4. Processor (CPU)\n    $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name.Trim()\n\n    # 5. Memory (RAM)\n    $ramChips = Get-CimInstance Win32_PhysicalMemory\n    $totalRamBytes = ($ramChips | Measure-Object -Property Capacity -Sum).Sum\n    $ramGB = [math]::Round($totalRamBytes / 1GB, 0)\n    $ramSpeed = ($ramChips | Select-Object -First 1).Speed\n    $ramCount = ($ramChips | Measure-Object).Count\n    $ramInfo = \"$ramGB GB ($ramCount slots, $ramSpeed MHz)\"\n\n    # 6. Storage (SSD / HDD)\n    $disks = Get-CimInstance Win32_DiskDrive\n    $storageList = @()\n    foreach ($d in $disks) {\n        $sizeGB = [math]::Round($d.Size / 1GB, 0)\n        $storageList += \"$($d.Model) ($sizeGB GB)\"\n    }\n    $storageInfo = $storageList -join \" + \"\n\n    # 7. Graphics (GPU)\n    $gpus = (Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }) -join \" / \"\n\n    # 8. Operating System\n    $os = (Get-CimInstance Win32_OperatingSystem).Caption.Trim()\n\n    # 9. Network IP & MAC\n    $activeNet = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1\n    $ipAddress = ($activeNet.IPAddress | Where-Object { $_ -match '^d+.d+.d+.d+$' } | Select-Object -First 1)\n    $macAddress = $activeNet.MACAddress\n\n    # Build Payload\n    $payload = @{\n        hostname = $hostname\n        serialNumber = $serialNumber\n        brand = $brand\n        model = $model\n        specs = @{\n            cpu = $cpu\n            ram = $ramInfo\n            storage = $storageInfo\n            gpu = $gpus\n            os = $os\n            ipAddress = $ipAddress\n            macAddress = $macAddress\n            loggedUser = \"$userDomain$username\"\n        }\n        scannedAt = (Get-Date).ToString(\"o\")\n    }\n\n    $jsonBody = $payload | ConvertTo-Json -Depth 5 -Compress\n\n    # Send HTTP POST to SIMPLY IT Server\n    $response = Invoke-RestMethod -Uri $serverUrl -Method Post -Body $jsonBody -ContentType \"application/json; charset=utf-8\" -TimeoutSec 5\n    Write-Output \"✅ [SIMPLY IT] Auto-Scan: $($response.message)\"\n} catch {\n    Write-Output \"⚠️ [SIMPLY IT] Error: $($_.Exception.Message)\"\n}\n";
  const psScript = rawScript.replace('http://localhost:3000/api/auto-scan/collect', `${serverUrl}/api/auto-scan/collect`);

  return new NextResponse(psScript, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="get_system_info.ps1"',
    },
  });
}
