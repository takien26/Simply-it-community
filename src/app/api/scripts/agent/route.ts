import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let serverUrl = searchParams.get('serverUrl');

  if (!serverUrl) {
    // Try DB setting first (app.server_url configured in Settings page)
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'app.server_url' } });
      if (setting?.value) serverUrl = setting.value;
    } catch {}
  }

  if (!serverUrl) {
    // Fallback: derive from request headers
    const host = request.headers.get('host') || 'localhost:3001';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    serverUrl = `${proto}://${host}`;
  }

  serverUrl = serverUrl.replace(/\/+$/, '');

  // Read the master script
  let scriptContent = '';
  for (const name of ['get_system_info.ps1', 'simply-it-collector.ps1']) {
    const candidate = path.join(process.cwd(), 'public', 'scripts', name);
    if (fs.existsSync(candidate)) {
      try { scriptContent = fs.readFileSync(candidate, 'utf8'); break; } catch {}
    }
  }

  if (scriptContent) {
    // Strip BOM
    if (scriptContent.charCodeAt(0) === 0xFEFF) scriptContent = scriptContent.slice(1);
    // Inject server URL into param default
    scriptContent = scriptContent.replace(
      /\[string\]\$ServerUrl\s*=\s*"[^"]*"/i,
      '[string]$ServerUrl = "' + serverUrl + '"'
    );
  } else {
    scriptContent = [
      '# SIMPLY IT Auto-Scan Agent',
      'param([string]$ServerUrl = "' + serverUrl + '")',
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
      '$OutputEncoding = [System.Text.Encoding]::UTF8',
      'try {',
      '    $payload = @{',
      '        hostname = $env:COMPUTERNAME',
      '        serialNumber = (Get-CimInstance win32_bios).SerialNumber',
      '        specs = @{ os = (Get-CimInstance win32_operatingsystem).Caption }',
      '    }',
      '    Invoke-RestMethod -Uri "$ServerUrl/api/v1/auto-scan/collect" -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json; charset=utf-8"',
      '} catch {}',
    ].join('\r\n');
  }

  return new NextResponse(scriptContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="get_system_info.ps1"',
      // Prevent Cloudflare/proxies from treating as HTML and encoding quotes
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}
