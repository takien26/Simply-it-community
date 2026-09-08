import { prisma } from '@/lib/db';

export interface LicenseMatch {
  softwareName: string;
  licenseId: string;
  licenseName: string;
  licenseKey?: string;
  seats: number;
  availableSeats: number;
  matchStatus: 'ASSIGNED_MATCH' | 'UNASSIGNED_MATCH';
  message: string;
}

export interface UnmanagedCommercialApp {
  name: string;
  version?: string;
  publisher?: string;
  message: string;
}

export interface ReconciliationResult {
  licenseMatches: LicenseMatch[];
  unmanagedCommercialApps: UnmanagedCommercialApp[];
  summary: {
    totalMatches: number;
    unassignedMatches: number;
    unmanagedCommercialCount: number;
  };
}

export async function reconcileSoftwareLicenses(
  installedSoftware: Array<{ name: string; version?: string; publisher?: string; installDate?: string }>,
  assetId: string | null
): Promise<ReconciliationResult> {
  const licenseMatches: LicenseMatch[] = [];
  const unmanagedCommercialApps: UnmanagedCommercialApp[] = [];

  try {
    const allActiveLicenses = await prisma.license.findMany({
      where: { status: 'ACTIVE' },
      include: {
        assignments: {
          where: { revokedAt: null },
        },
      },
    });

    const commercialPatterns = [
      /office/i,
      /photoshop/i,
      /autocad/i,
      /adobe/i,
      /illustrator/i,
      /premiere/i,
      /acrobat/i,
      /corel/i,
      /revit/i,
      /solidworks/i,
      /sketchup/i,
      /lumion/i,
      /3ds\s*max/i,
      /maya/i,
      /jetbrains/i,
      /intellij/i,
      /webstorm/i,
      /pycharm/i,
      /vmware/i,
      /winrar/i,
      /teamviewer/i,
      /anydesk/i,
      /camtasia/i,
      /foxit/i,
    ];

    const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const safeSoftware = Array.isArray(installedSoftware) ? installedSoftware : [];

    for (const sw of safeSoftware) {
      if (!sw || !sw.name) continue;
      const swName = String(sw.name).trim();
      const swClean = cleanStr(swName);
      if (!swClean) continue;

      // Find matching license
      const matchedLic = allActiveLicenses.find((lic) => {
        const licClean = cleanStr(lic.name);
        if (licClean.length < 3) return false;
        return swClean.includes(licClean) || licClean.includes(swClean);
      });

      if (matchedLic) {
        const isAssigned = assetId
          ? matchedLic.assignments.some((a) => a.assetId === assetId)
          : false;
        const availableSeats = Math.max(0, matchedLic.totalSeats - matchedLic.assignments.length);

        licenseMatches.push({
          softwareName: swName,
          licenseId: matchedLic.id,
          licenseName: matchedLic.name,
          licenseKey: matchedLic.licenseKey || undefined,
          seats: matchedLic.totalSeats,
          availableSeats,
          matchStatus: isAssigned ? 'ASSIGNED_MATCH' : 'UNASSIGNED_MATCH',
          message: isAssigned
            ? `Thiết bị đã được gán license "${matchedLic.name}" hợp lệ.`
            : `Phát hiện trùng với License trong kho: "${matchedLic.name}" (Còn ${availableSeats}/${matchedLic.totalSeats} ghế trống). Chưa gán cho thiết bị này!`,
        });
      } else {
        const isCommercial = commercialPatterns.some((p) => p.test(swName));
        if (isCommercial) {
          unmanagedCommercialApps.push({
            name: swName,
            version: sw.version,
            publisher: sw.publisher,
            message: `Phát hiện phần mềm thương mại "${swName}" chưa được đăng ký trong kho License.`,
          });
        }
      }
    }
  } catch (err) {
    console.error('Reconciliation error:', err);
  }

  return {
    licenseMatches,
    unmanagedCommercialApps,
    summary: {
      totalMatches: licenseMatches.length,
      unassignedMatches: licenseMatches.filter((m) => m.matchStatus === 'UNASSIGNED_MATCH').length,
      unmanagedCommercialCount: unmanagedCommercialApps.length,
    },
  };
}
