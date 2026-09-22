import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getLdapConfig, syncUsersFromLdap } from '@/lib/ldap';
import bcrypt from 'bcryptjs';
import { normalizeEmail, normalizeCompanyName, areCompaniesEqual } from '@/lib/normalize';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    // 1. Check LDAP and SSO settings
    const ldapConfig = await getLdapConfig();
    const msClientId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_id' } });
    const msClientSecret = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_secret' } });
    const ssoConfigured = Boolean(msClientId?.value && msClientSecret?.value);

    if (!ldapConfig.enabled && !ssoConfigured) {
      return NextResponse.json({
        success: true,
        executed: false,
        message: 'Cả LDAP và Microsoft 365 SSO đều đang tắt hoặc chưa cấu hình.',
      });
    }

    // 2. Check Auto-Sync Interval (default: 60 minutes = 1 hour)
    const intervalSetting = await prisma.systemSetting.findUnique({
      where: { key: 'ldap.auto_sync_interval' },
    });
    const intervalStr = intervalSetting?.value || '60';
    if (intervalStr === '0' || intervalStr === 'off') {
      return NextResponse.json({
        success: true,
        executed: false,
        message: 'Tính năng tự động đồng bộ ngầm đang ở chế độ Tắt (Chỉ đồng bộ thủ công).',
      });
    }

    const intervalMinutes = parseInt(intervalStr, 10) || 60;

    // 3. Check last run timestamp
    const lastSyncSetting = await prisma.systemSetting.findUnique({
      where: { key: 'ldap.last_auto_sync_at' },
    });

    if (!force && lastSyncSetting?.value) {
      const lastSyncTime = new Date(lastSyncSetting.value).getTime();
      const elapsedMinutes = (Date.now() - lastSyncTime) / (60 * 1000);
      if (elapsedMinutes < intervalMinutes) {
        return NextResponse.json({
          success: true,
          executed: false,
          message: `Chưa đến thời điểm đồng bộ ngầm (Đã trôi qua ${Math.round(elapsedMinutes)}/${intervalMinutes} phút).`,
          nextRunInMinutes: Math.max(1, Math.round(intervalMinutes - elapsedMinutes)),
        });
      }
    }

    // 4. Resolve default system role
    let defaultRole = await prisma.role.findFirst({ where: { name: 'Staff' } });
    if (!defaultRole) {
      defaultRole = (await prisma.role.findFirst({ where: { isSystem: true } })) || (await prisma.role.findFirst());
    }

    let ssoImported = 0;
    let ldapImported = 0;
    let updatedCount = 0;
    let offboardedCount = 0;

    // A. Microsoft 365 SSO Sync
    if (ssoConfigured) {
      try {
        const tenantId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_tenant_id' } });
        const tenant = tenantId?.value || 'common';
        const tokenParams = new URLSearchParams({
          client_id: msClientId!.value,
          client_secret: msClientSecret!.value,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        });

        const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });

        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData.access_token) {
          let nextUrl: string | null =
            "https://graph.microsoft.com/v1.0/users?$filter=userType eq 'Member'&$select=id,displayName,mail,userPrincipalName,userType,accountEnabled,department,jobTitle&$top=999";
          const graphUsers: any[] = [];
          let pageCount = 0;

          while (nextUrl && graphUsers.length < 5000 && pageCount < 10) {
            pageCount++;
            const graphUsersRes: Response = await fetch(nextUrl, {
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            if (!graphUsersRes.ok) break;
            const graphData: any = await graphUsersRes.json();
            const batch = Array.isArray(graphData?.value) ? graphData.value : [];
            graphUsers.push(...batch);
            nextUrl = graphData['@odata.nextLink'] || null;
          }

          for (const gu of graphUsers) {
            const upn = (gu.userPrincipalName || '').trim();
            const mail = (gu.mail || '').trim();
            const email = normalizeEmail(mail || upn);
            const userType = (gu.userType || 'Member').trim();

            if (userType.toLowerCase() === 'guest' || upn.toUpperCase().includes('#EXT#') || mail.toUpperCase().includes('#EXT#')) {
              continue;
            }

            if (!email) continue;
            const isEnabled = gu.accountEnabled !== false;

            let comp = gu.companyName ? normalizeCompanyName(gu.companyName) : null;
            if (!comp) {
              const em = email.toLowerCase();
              if (em.includes('@gelex.vn')) comp = 'GELEX';
              else if (em.includes('@gelex-electric.com')) comp = 'GELEX ELECTRIC';
              else if (em.includes('@gelex-infra.vn')) comp = 'GELEX INFRA';
              else if (em.includes('@cadivi.vn')) comp = 'CADIVI';
              else if (em.includes('@thibidi')) comp = 'THIBIDI';
              else if (em.includes('@emic.com.vn')) comp = 'EMIC';
              else if (em.includes('@hem.vn')) comp = 'HEM';
              else comp = 'GELEX';
            }

            let targetUser = await prisma.user.findUnique({ where: { email } });
            if (!targetUser && gu.displayName) {
              targetUser = await prisma.user.findFirst({
                where: {
                  fullName: { equals: gu.displayName, mode: 'insensitive' },
                  companyName: comp ? { equals: comp, mode: 'insensitive' } : undefined,
                },
              });
              if (targetUser) {
                await prisma.user.update({
                  where: { id: targetUser.id },
                  data: { email },
                });
                targetUser.email = email;
              }
            }

            if (!targetUser && isEnabled && defaultRole) {
              await prisma.user.create({
                data: {
                  email,
                  fullName: gu.displayName || email.split('@')[0],
                  department: gu.department || 'Microsoft 365',
                  companyName: comp,
                  roleId: defaultRole.id,
                  passwordHash: 'SSO_MS365_AUTH_NO_PASSWORD',
                  isActive: true,
                },
              });
              ssoImported++;
            } else if (targetUser) {
              const updates: any = {};
              if (targetUser.isActive !== isEnabled) updates.isActive = isEnabled;
              if (gu.department && targetUser.department !== gu.department) updates.department = gu.department;
              if (comp && (!targetUser.companyName || !areCompaniesEqual(targetUser.companyName, comp))) {
                updates.companyName = comp;
              }
              if (gu.displayName && targetUser.fullName !== gu.displayName) updates.fullName = gu.displayName;

              if (Object.keys(updates).length > 0) {
                await prisma.user.update({
                  where: { id: targetUser.id },
                  data: updates,
                });
                if (!isEnabled && targetUser.isActive) offboardedCount++;
                else updatedCount++;
              }
            }
          }
        }
      } catch (ssoErr) {
        console.error('Cron SSO sync error:', ssoErr);
      }
    }

    // B. LDAP / Active Directory Sync
    if (ldapConfig.enabled) {
      try {
        const ldapResult = await syncUsersFromLdap(ldapConfig);
        if (ldapResult.success && ldapResult.users.length > 0) {
          let targetRoleId = ldapConfig.defaultRoleId || defaultRole?.id;
          if (!targetRoleId && defaultRole) targetRoleId = defaultRole.id;
          const placeholderPasswordHash = await bcrypt.hash(`LdapCron@${Date.now()}`, 10);

          for (const lu of ldapResult.users) {
            const uEmail = lu.email.toLowerCase().trim();
            const existingUser = await prisma.user.findUnique({ where: { email: uEmail } });

            if (!existingUser && !lu.isDisabled && targetRoleId) {
              await prisma.user.create({
                data: {
                  email: uEmail,
                  fullName: lu.fullName,
                  department: lu.department || 'Active Directory / LDAP',
                  roleId: targetRoleId,
                  passwordHash: placeholderPasswordHash,
                  isActive: true,
                },
              });
              ldapImported++;
            } else if (existingUser) {
              if (lu.isDisabled && existingUser.isActive) {
                await prisma.user.update({
                  where: { id: existingUser.id },
                  data: { isActive: false },
                });
                offboardedCount++;
              } else if (existingUser.isActive) {
                const updates: any = {};
                if (!existingUser.department && lu.department) updates.department = lu.department;
                if (existingUser.fullName === uEmail.split('@')[0] && lu.fullName) updates.fullName = lu.fullName;

                if (Object.keys(updates).length > 0) {
                  await prisma.user.update({
                    where: { id: existingUser.id },
                    data: updates,
                  });
                  updatedCount++;
                }
              }
            }
          }
        }
      } catch (ldapErr) {
        console.error('Cron LDAP sync error:', ldapErr);
      }
    }

    // 5. Update last_auto_sync_at timestamp
    const nowIso = new Date().toISOString();
    await prisma.systemSetting.upsert({
      where: { key: 'ldap.last_auto_sync_at' },
      update: { value: nowIso },
      create: {
        key: 'ldap.last_auto_sync_at',
        value: nowIso,
        group: 'ldap',
        label: 'Thời gian đồng bộ danh bạ tự động gần nhất',
      },
    });

    const totalImported = ssoImported + ldapImported;
    const summary = `Đồng bộ ngầm hoàn tất: Nạp mới ${totalImported} tài khoản (${ldapImported} từ LDAP, ${ssoImported} từ SSO), cập nhật ${updatedCount}, khóa ${offboardedCount} tài khoản.`;

    return NextResponse.json({
      success: true,
      executed: true,
      message: summary,
      importedCount: totalImported,
      ssoImported,
      ldapImported,
      updatedCount,
      offboardedCount,
      executedAt: nowIso,
    });
  } catch (error: any) {
    console.error('Directory sync cron failed:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Cron error' },
      { status: 500 }
    );
  }
}
