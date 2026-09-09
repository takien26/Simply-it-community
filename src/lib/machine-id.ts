import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';

let cachedMachineId: string | null = null;

/**
 * Trích xuất Motherboard UUID và CPU Processor ID (BỎ MAC card mạng theo yêu cầu)
 * để tạo mã định danh duy nhất cho máy chủ (Machine ID / Hardware Fingerprint).
 */
export function getMachineId(): string {
  if (cachedMachineId) {
    return cachedMachineId;
  }

  let motherboardUuid = '';
  let cpuProcessorId = '';

  const platform = process.platform;

  if (platform === 'win32') {
    // 1. Thử lấy Motherboard UUID và CPU ID qua PowerShell CIM
    try {
      const psCommand = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$u=(Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue).UUID; $c=((Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue) | Select-Object -First 1).ProcessorId; Write-Output ($u + '||' + $c)"`;
      const output = execSync(psCommand, { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      const parts = output.split('||');
      if (parts[0]) motherboardUuid = parts[0].trim();
      if (parts[1]) cpuProcessorId = parts[1].trim();
    } catch {}

    // Fallback nếu PowerShell lỗi: Dùng Registry MachineGuid & Processor Identifier
    if (!motherboardUuid) {
      try {
        const regOut = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { timeout: 2000 })
          .toString();
        const match = regOut.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9-]+)/);
        if (match) motherboardUuid = match[1].trim();
      } catch {}
    }

    if (!cpuProcessorId) {
      cpuProcessorId = process.env.PROCESSOR_IDENTIFIER || process.env.PROCESSOR_REVISION || 'WIN_CPU';
    }
  } else if (platform === 'linux') {
    // Linux: /sys/class/dmi/id/product_uuid hoặc /etc/machine-id
    try {
      if (fs.existsSync('/sys/class/dmi/id/product_uuid')) {
        motherboardUuid = fs.readFileSync('/sys/class/dmi/id/product_uuid', 'utf8').trim();
      } else if (fs.existsSync('/etc/machine-id')) {
        motherboardUuid = fs.readFileSync('/etc/machine-id', 'utf8').trim();
      } else if (fs.existsSync('/var/lib/dbus/machine-id')) {
        motherboardUuid = fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim();
      }
    } catch {}

    try {
      if (fs.existsSync('/proc/cpuinfo')) {
        const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
        const matchModel = cpuinfo.match(/model name\s+:\s+(.+)/i);
        const matchSerial = cpuinfo.match(/Serial\s+:\s+(.+)/i);
        cpuProcessorId = (matchSerial ? matchSerial[1] : (matchModel ? matchModel[1] : '')).trim();
      }
    } catch {}
  } else if (platform === 'darwin') {
    try {
      motherboardUuid = execSync('sysctl -n kern.uuid', { timeout: 2000 }).toString().trim();
    } catch {}
    try {
      cpuProcessorId = execSync('sysctl -n machdep.cpu.brand_string', { timeout: 2000 }).toString().trim();
    } catch {}
  }

  // Fallback an toàn nếu môi trường container ảo hóa chặn quyền truy cập phần cứng
  if (!motherboardUuid) {
    motherboardUuid = 'SIMPLY_HOST_' + (process.env.COMPUTERNAME || process.env.HOSTNAME || 'DEFAULT_HOST');
  }
  if (!cpuProcessorId) {
    cpuProcessorId = process.arch + '_' + (process.env.NUMBER_OF_PROCESSORS || '1');
  }

  // Gộp thông tin: CHỈ gồm UUID Bo Mạch + CPU ID (Tuyệt đối không lấy MAC card mạng)
  const rawData = `UUID:${motherboardUuid.toUpperCase().trim()}|CPU:${cpuProcessorId.toUpperCase().trim()}`;
  
  const hash = crypto.createHash('sha256').update(rawData).digest('hex').toUpperCase();

  // Định dạng chuẩn: SIMPLY-HW-XXXX-XXXX-XXXX-XXXX
  const formattedId = `SIMPLY-HW-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;

  cachedMachineId = formattedId;
  return formattedId;
}

/**
 * Kiểm tra xem Machine ID của máy chủ hiện tại có khớp với Machine ID ghi trong License không.
 * Nếu license không yêu cầu Machine ID (hoặc rỗng / '*'), luôn trả về true (tương thích ngược).
 */
export function verifyMachineId(requiredMachineId?: string): { matches: boolean; currentMachineId: string } {
  const currentMachineId = getMachineId();

  if (!requiredMachineId || requiredMachineId.trim() === '' || requiredMachineId.trim() === '*') {
    return { matches: true, currentMachineId };
  }

  const cleanRequired = requiredMachineId.trim().toUpperCase();
  return {
    matches: currentMachineId === cleanRequired,
    currentMachineId,
  };
}
