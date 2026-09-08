import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let serverUrl = searchParams.get('serverUrl');

  if (!serverUrl) {
    const host = request.headers.get('host') || 'localhost:3001';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    serverUrl = `${proto}://${host}`;
  }

  serverUrl = serverUrl.replace(/\/+$/, '');

  // Read the master script from public/scripts/get_system_info.ps1 or simply-it-collector.ps1
  let scriptContent = '';
  const scriptCandidates = [
    path.join(process.cwd(), 'public', 'scripts', 'get_system_info.ps1'),
    path.join(process.cwd(), 'public', 'scripts', 'simply-it-collector.ps1'),
  ];

  for (const candidate of scriptCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        scriptContent = fs.readFileSync(candidate, 'utf8');
        break;
      } catch {}
    }
  }

  if (scriptContent) {
    // Remove UTF-8 BOM if present so it doesn't cause issues in string interpolation
    if (scriptContent.charCodeAt(0) === 0xFEFF) {
      scriptContent = scriptContent.slice(1);
    }
    // Dynamically replace default ServerUrl
    scriptContent = scriptContent.replace(
      /\[string\]\$ServerUrl\s*=\s*"[^"]*"/i,
      `[string]\$ServerUrl = "${serverUrl}"`
    );
  } else {
    // Fallback minimal safe script
    scriptContent = `# SIMPLY IT Auto-Scan Agent
param([string]\$ServerUrl = "${serverUrl}")
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
\$OutputEncoding = [System.Text.Encoding]::UTF8
try {
    \$payload = @{
        hostname = \$env:COMPUTERNAME
        serialNumber = (Get-CimInstance win32_bios).SerialNumber
        specs = @{ os = (Get-CimInstance win32_operatingsystem).Caption }
    }
    Invoke-RestMethod -Uri "\$ServerUrl/api/v1/auto-scan/collect" -Method Post -Body (\$payload | ConvertTo-Json) -ContentType "application/json; charset=utf-8"
} catch {}
`;
  }

  return new NextResponse(scriptContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="get_system_info.ps1"',
    },
  });
}
