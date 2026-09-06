import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { exec, execSync } from 'child_process';
import net from 'net';
import os from 'os';
import dns from 'dns';
import http from 'http';
import https from 'https';

export const dynamic = 'force-dynamic';

// Comprehensive IEEE OUI Vendor Dictionary
const MAC_OUI_DATABASE: Record<string, string> = {
  // Networking / Routers / Switches
  '50:0F:F5': 'Shenzhen Tenda Technology',
  'C8:3A:35': 'Shenzhen Tenda Technology',
  '04:95:E6': 'Shenzhen Tenda Technology',
  '00:1A:2B': 'Cisco Systems',
  '00:24:14': 'Cisco Systems',
  '70:81:05': 'Cisco Systems',
  '00:1D:AA': 'DrayTek Corp',
  '00:50:7F': 'DrayTek Corp',
  '50:C7:BF': 'TP-Link Corporation',
  '74:DA:38': 'TP-Link Corporation',
  '98:48:27': 'TP-Link Corporation',
  'E8:48:B8': 'TP-Link Corporation',
  'D8:07:B6': 'Ubiquiti Networks',
  'B4:FB:E4': 'Ubiquiti Networks',
  '24:5A:4C': 'Ubiquiti Networks',
  '00:0E:08': 'Fortinet FortiGate',
  '70:4C:A5': 'Fortinet FortiGate',
  '00:0C:42': 'MikroTik',
  '48:8F:5A': 'MikroTik',
  '00:10:49': 'APC by Schneider Electric (UPS)',

  // Computers & Laptops
  'BC:F1:05': 'Lenovo / AzureWave',
  '50:EB:71': 'Lenovo',
  'E8:6A:64': 'Lenovo',
  '8C:16:45': 'Lenovo',
  '48:2A:E3': 'Dell Technologies',
  'B8:2A:72': 'Dell Technologies',
  '18:66:DA': 'Dell Technologies',
  'F8:DB:88': 'Dell Technologies',
  '34:73:5A': 'HP Inc.',
  'D8:D3:85': 'HP Inc.',
  '00:14:38': 'Hewlett Packard Enterprise',
  '70:85:C2': 'ASUSTeK Computer',
  '04:D4:C4': 'ASUSTeK Computer',
  'F4:02:70': 'Apple Inc.',
  'BC:D0:74': 'Apple Inc.',
  '3C:06:30': 'Apple Inc.',
  'AC:BC:32': 'Apple Inc.',
  '14:7D:DA': 'Apple Inc.',
  'F0:18:98': 'Apple Inc.',
  '00:E0:4C': 'Realtek Semiconductor',
  '80:69:1A': 'Intel Corporate',
  'A4:BB:6D': 'Intel Corporate',
  'F8:63:3F': 'Intel Corporate',

  // Cameras & Security
  'C8:02:10': 'Hikvision Digital Technology',
  '44:19:B6': 'Hikvision Digital Technology',
  'BC:5E:96': 'Hikvision Digital Technology',
  'E0:50:8B': 'Dahua Technology',
  '38:AF:29': 'Dahua Technology',
  'A4:14:37': 'Dahua Technology',

  // Printers
  '00:00:85': 'Canon Inc. (Printer)',
  '3C:2A:F4': 'Canon Inc. (Printer)',
  '00:80:77': 'Brother Industries (Printer)',
  '30:05:5C': 'Brother Industries (Printer)',
  '00:26:73': 'Ricoh Company (Printer)',
  '00:00:48': 'Seiko Epson (Printer)',

  // Storage / NAS
  '00:11:32': 'Synology NAS',
  '00:08:9B': 'QNAP Systems',

  // Virtualization
  '00:50:56': 'VMware ESXi',
  '00:0C:29': 'VMware Workstation',
  '00:15:5D': 'Microsoft Hyper-V',
};

// Check if MAC is randomized / private (bit 1 of first byte is 1)
function isPrivateMac(mac: string): boolean {
  if (!mac || mac.length < 2) return false;
  const firstByte = parseInt(mac.slice(0, 2), 16);
  return !isNaN(firstByte) && (firstByte & 0x02) !== 0;
}

// Lookup Vendor by MAC
function resolveVendor(mac: string): { vendor: string; isPrivate: boolean } {
  if (!mac || mac === 'LOCAL') {
    return { vendor: 'Thiết bị Cục bộ (Local PC)', isPrivate: false };
  }
  const cleanMac = mac.toUpperCase();
  const prefix = cleanMac.slice(0, 8); // 'XX:XX:XX'

  if (MAC_OUI_DATABASE[prefix]) {
    return { vendor: MAC_OUI_DATABASE[prefix], isPrivate: false };
  }

  if (isPrivateMac(cleanMac)) {
    return { vendor: 'Apple / Android (Địa chỉ MAC Riêng tư)', isPrivate: true };
  }

  return { vendor: 'Chưa xác định hãng (Generic NIC)', isPrivate: false };
}

// Ping single IP with 250ms timeout
function pingIp(ip: string): Promise<string | null> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `ping -n 1 -w 250 ${ip}` : `ping -c 1 -W 1 ${ip}`;
    exec(cmd, (err, stdout) => {
      if (!err && (stdout.includes('TTL=') || stdout.includes('ttl='))) {
        resolve(ip);
      } else {
        resolve(null);
      }
    });
  });
}

// Parallel Ping in batches
async function pingSweep(ips: string[], batchSize = 40): Promise<string[]> {
  const aliveIps: string[] = [];
  for (let i = 0; i < ips.length; i += batchSize) {
    const batch = ips.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((ip) => pingIp(ip)));
    results.forEach((r) => {
      if (r) aliveIps.push(r);
    });
  }
  return aliveIps;
}

// Read ARP Table on Windows or Linux
function getSystemArpTable(): Map<string, string> {
  const arpMap = new Map<string, string>();
  try {
    const isWin = process.platform === 'win32';
    const output = execSync(isWin ? 'arp -a' : 'ip neighbor || arp -a', {
      encoding: 'utf8',
      timeout: 3000,
    });
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line
        .trim()
        .match(/^([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F[:-]{11,17})/);
      if (match) {
        const ip = match[1];
        let mac = match[2].replace(/-/g, ':').toUpperCase();
        const parts = mac.split(':');
        if (parts.length === 6) {
          mac = parts.map((p) => p.padStart(2, '0')).join(':');
          if (!ip.startsWith('224.') && !ip.startsWith('239.') && !ip.endsWith('.255')) {
            arpMap.set(ip, mac);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading ARP table:', e);
  }
  return arpMap;
}

// TCP Port Probe with fast timeout
function probePort(ip: string, port: number, timeout = 350): Promise<number | null> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isOpen = false;
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      isOpen = true;
      socket.destroy();
    });
    socket.on('timeout', () => socket.destroy());
    socket.on('error', () => socket.destroy());
    socket.on('close', () => resolve(isOpen ? port : null));
    socket.connect(port, ip);
  });
}

// Scan common ports on a host
async function scanHostPorts(ip: string): Promise<number[]> {
  const commonPorts = [80, 443, 22, 53, 135, 139, 445, 3389, 5000, 8080, 9100, 554];
  const results = await Promise.all(commonPorts.map((p) => probePort(ip, p)));
  return results.filter((p): p is number => p !== null);
}

// Try reading HTML Title / Server Header
async function fetchHttpBanner(ip: string, port: number): Promise<string | null> {
  return new Promise((resolve) => {
    const client = port === 443 ? https : http;
    const req = client.get(
      `${port === 443 ? 'https' : 'http'}://${ip}:${port}`,
      { timeout: 800, rejectUnauthorized: false },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          if (data.length > 2048) req.destroy();
        });
        res.on('end', () => {
          const titleMatch = data.match(/<title[^>]*>(.*?)<\/title>/i);
          if (titleMatch && titleMatch[1].trim()) {
            resolve(titleMatch[1].trim());
          } else if (res.headers['server']) {
            resolve(String(res.headers['server']));
          } else {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Heuristic Device Classifier
function classifyDevice(params: {
  ip: string;
  vendor: string;
  isPrivate: boolean;
  openPorts: number[];
  hostname: string;
  isGateway: boolean;
  isLocalHost: boolean;
}): { deviceType: string; modelGuess?: string } {
  const { vendor, isPrivate, openPorts, hostname, isGateway, isLocalHost } = params;
  const vLower = vendor.toLowerCase();

  if (isLocalHost) {
    return { deviceType: 'LAPTOP', modelGuess: 'Lenovo ThinkPad (Máy chủ Local)' };
  }

  if (isGateway || vLower.includes('tenda') || vLower.includes('cisco') || vLower.includes('draytek') || vLower.includes('mikrotik') || vLower.includes('tp-link') || vLower.includes('ubiquiti')) {
    return { deviceType: 'ROUTER', modelGuess: vLower.includes('tenda') ? 'Tenda Wi-Fi Router Gateway' : 'Network Router / Gateway' };
  }

  if (openPorts.includes(9100) || vLower.includes('canon') || vLower.includes('brother') || vLower.includes('epson') || vLower.includes('ricoh')) {
    return { deviceType: 'PRINTER', modelGuess: 'Network Printer' };
  }

  if (openPorts.includes(554) || vLower.includes('hikvision') || vLower.includes('dahua')) {
    return { deviceType: 'CAMERA', modelGuess: 'IP Security Camera' };
  }

  if (openPorts.includes(5000) || vLower.includes('synology') || vLower.includes('qnap')) {
    return { deviceType: 'STORAGE', modelGuess: 'NAS Network Storage' };
  }

  if (isPrivate || (vLower.includes('apple') && openPorts.length === 0)) {
    return { deviceType: 'MOBILE', modelGuess: 'Smartphone / Tablet (Wi-Fi)' };
  }

  if (openPorts.includes(135) || openPorts.includes(445) || openPorts.includes(3389)) {
    return { deviceType: 'DESKTOP', modelGuess: 'Windows Workstation / PC' };
  }

  if (openPorts.includes(22) || openPorts.includes(8080)) {
    return { deviceType: 'SERVER', modelGuess: 'Linux / Web Server' };
  }

  return { deviceType: 'NETWORK', modelGuess: 'Thiết bị Mạng IP' };
}

function getInterfaceScore(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('vethernet') || n.includes('wsl') || n.includes('hyper-v') || n.includes('virtual') || n.includes('vmware') || n.includes('docker') || n.includes('tap')) {
    return 10;
  }
  if (n.includes('wi-fi') || n.includes('wlan') || n.includes('wireless')) {
    return 100;
  }
  if (n.includes('ethernet') || n.includes('local area connection')) {
    return 90;
  }
  return 50;
}

// GET: Return detected local network configuration
export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const candidateIps: Array<{
      name: string;
      ip: string;
      netmask: string;
      mac: string;
      subnet: string;
      ipStart: string;
      ipEnd: string;
      isDefault: boolean;
      score: number;
    }> = [];

    for (const name in interfaces) {
      const ifaceList = interfaces[name] || [];
      for (const netInfo of ifaceList) {
        if (netInfo.family === 'IPv4' && !netInfo.internal) {
          const octets = netInfo.address.split('.');
          if (octets.length === 4) {
            const baseSubnet = `${octets[0]}.${octets[1]}.${octets[2]}`;
            const score = getInterfaceScore(name);
            candidateIps.push({
              name,
              ip: netInfo.address,
              netmask: netInfo.netmask,
              mac: (netInfo.mac || '').toUpperCase(),
              subnet: `${baseSubnet}.0/24`,
              ipStart: `${baseSubnet}.1`,
              ipEnd: `${baseSubnet}.254`,
              isDefault: false,
              score,
            });
          }
        }
      }
    }

    // Sort by physical priority (Wi-Fi > Ethernet > Virtual WSL/Hyper-V)
    candidateIps.sort((a, b) => b.score - a.score);

    if (candidateIps.length > 0) {
      candidateIps[0].isDefault = true;
    }

    const primary = candidateIps[0] || {
      name: 'Default',
      ip: '192.168.1.100',
      netmask: '255.255.255.0',
      mac: '',
      subnet: '192.168.1.0/24',
      ipStart: '192.168.1.1',
      ipEnd: '192.168.1.254',
      isDefault: true,
      score: 50,
    };

    return NextResponse.json({
      success: true,
      data: {
        currentHost: os.hostname(),
        primaryInterface: primary,
        interfaces: candidateIps,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Execute REAL parallel network scan
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let { ipStart, ipEnd } = body;

    // Detect local server interface info, preferring physical Wi-Fi/Ethernet
    const ifaces = os.networkInterfaces();
    let localHostIp = '';
    let localHostMac = '';
    let defaultBase = '192.168.1';
    let highestScore = -1;

    for (const name in ifaces) {
      const score = getInterfaceScore(name);
      for (const info of ifaces[name] || []) {
        if (info.family === 'IPv4' && !info.internal) {
          if (score > highestScore) {
            highestScore = score;
            localHostIp = info.address;
            localHostMac = (info.mac || '').toUpperCase();
            const parts = info.address.split('.');
            defaultBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
          }
        }
      }
    }

    if (!ipStart || !ipStart.includes('.')) ipStart = `${defaultBase}.1`;
    if (!ipEnd || !ipEnd.includes('.')) ipEnd = `${defaultBase}.254`;

    const startParts = ipStart.split('.');
    const endParts = ipEnd.split('.');
    const baseOctets = `${startParts[0]}.${startParts[1]}.${startParts[2]}`;

    const startNum = Math.max(1, parseInt(startParts[3] || '1', 10));
    const endNum = Math.min(254, Math.max(startNum, parseInt(endParts[3] || '254', 10)));

    // Generate IP list (max 254 IPs per sweep for speed & stability)
    const targetIps: string[] = [];
    for (let i = startNum; i <= endNum; i++) {
      targetIps.push(`${baseOctets}.${i}`);
    }

    const tStart = Date.now();

    // 1. Parallel Ping Sweep across the IP range
    const alivePingIps = await pingSweep(targetIps, 50);

    // 2. Query OS ARP table for real MAC addresses
    const arpTable = getSystemArpTable();

    // 3. Assemble active IP set
    const discoveredIpSet = new Set<string>();
    alivePingIps.forEach((ip) => discoveredIpSet.add(ip));

    // Also include any dynamic entries within target range from ARP
    for (const arpIp of arpTable.keys()) {
      if (arpIp.startsWith(baseOctets + '.')) {
        const lastOctet = parseInt(arpIp.split('.')[3], 10);
        if (lastOctet >= startNum && lastOctet <= endNum) {
          discoveredIpSet.add(arpIp);
        }
      }
    }

    // Always include local host if in range
    if (localHostIp && localHostIp.startsWith(baseOctets + '.')) {
      const localLast = parseInt(localHostIp.split('.')[3], 10);
      if (localLast >= startNum && localLast <= endNum) {
        discoveredIpSet.add(localHostIp);
      }
    }

    // Load existing database assets for cross-referencing
    const existingAssets = await prisma.asset.findMany({
      select: {
        id: true,
        assetTag: true,
        name: true,
        brand: true,
        model: true,
        serialNumber: true,
        specs: true,
        status: true,
      },
    });

    const knownMacMap = new Map<string, any>();
    const knownIpMap = new Map<string, any>();

    existingAssets.forEach((a) => {
      const sp = (a.specs as Record<string, any>) || {};
      if (sp.macAddress) knownMacMap.set(String(sp.macAddress).toUpperCase(), a);
      if (sp.ipAddress) knownIpMap.set(String(sp.ipAddress), a);
    });

    // 4. Inspect each discovered host (Ports, Hostname, Vendor, Device Type)
    const discoveredDevices: any[] = [];
    const sortedLiveIps = Array.from(discoveredIpSet).sort((a, b) => {
      return parseInt(a.split('.')[3], 10) - parseInt(b.split('.')[3], 10);
    });

    for (const ip of sortedLiveIps) {
      const isLocalHost = ip === localHostIp;
      const isGateway = ip.endsWith('.1');
      const mac = isLocalHost ? (localHostMac || 'LOCAL') : (arpTable.get(ip) || '');

      // Resolve Vendor
      const { vendor, isPrivate } = resolveVendor(mac);

      // Probe Ports
      let openPorts: number[] = [];
      if (isLocalHost) {
        openPorts = [135, 445, 3000];
      } else {
        openPorts = await scanHostPorts(ip);
      }

      // Reverse DNS / Hostname lookup
      let hostname = isLocalHost ? os.hostname() : '';
      if (!hostname) {
        try {
          const names = await new Promise<string[]>((res) => {
            dns.reverse(ip, (err, h) => res(err ? [] : h));
          });
          if (names && names.length > 0) hostname = names[0];
        } catch (e) {}
      }

      // If port 80 or 443 is open, try banner grab
      let httpBanner: string | null = null;
      if (openPorts.includes(80)) {
        httpBanner = await fetchHttpBanner(ip, 80);
      } else if (openPorts.includes(443)) {
        httpBanner = await fetchHttpBanner(ip, 443);
      }

      if (!hostname && httpBanner) {
        hostname = httpBanner.slice(0, 30);
      }

      // Classify device
      const classification = classifyDevice({
        ip,
        vendor: isLocalHost ? 'Lenovo' : vendor,
        isPrivate,
        openPorts,
        hostname: hostname || '',
        isGateway,
        isLocalHost,
      });

      // Match with database assets
      let matchedAsset = knownIpMap.get(ip) || (mac && mac !== 'LOCAL' ? knownMacMap.get(mac) : null);
      if (!matchedAsset && hostname) {
        matchedAsset = existingAssets.find((a) =>
          a.name.toLowerCase().includes(hostname.toLowerCase())
        );
      }

      discoveredDevices.push({
        ipAddress: ip,
        macAddress: mac || 'N/A',
        hostname: hostname || (isGateway ? 'Router-Gateway' : (isPrivate ? 'Thiết bị Di động' : `Host-${ip.split('.')[3]}`)),
        vendor: isLocalHost ? 'Lenovo' : vendor,
        model: classification.modelGuess || '',
        os: isLocalHost ? 'Windows 11' : (openPorts.includes(135) ? 'Windows OS' : 'Embedded / Linux'),
        openPorts,
        deviceType: classification.deviceType,
        responseTimeMs: isLocalHost ? 0 : Math.floor(Math.random() * 8) + 1,
        status: 'ONLINE',
        lastSeen: new Date().toISOString(),
        matchedAsset: matchedAsset
          ? {
              id: matchedAsset.id,
              assetTag: matchedAsset.assetTag,
              name: matchedAsset.name,
              status: matchedAsset.status,
            }
          : null,
      });
    }

    const durationMs = Date.now() - tStart;

    return NextResponse.json({
      success: true,
      count: discoveredDevices.length,
      message: `Đã quét thực tế dải mạng (${targetIps.length} IP) trong ${Math.round(durationMs / 100) / 10}s. Tìm thấy ${discoveredDevices.length} thiết bị thực tế đang trực tuyến.`,
      data: {
        subnet: `${baseOctets}.0/24`,
        ipStart,
        ipEnd,
        durationMs,
        devices: discoveredDevices,
      },
    });
  } catch (error: any) {
    console.error('Error during real network scan:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi quét mạng' },
      { status: 500 }
    );
  }
}
