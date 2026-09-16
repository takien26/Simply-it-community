import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getLdapConfig, syncUsersFromLdap } from '@/lib/ldap';
import bcrypt from 'bcryptjs';

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
          const graphUsersRes = await fetch(
            'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,department,jobTitle&$top=999',
            { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
          );

          if (graphUsersRes.ok) {
            const graphData = await graphUsersRes.json();
            const graphUsers = graphData.value || [];

            for (const gu of graphUsers) {
              const email = (gu.mail || gu.userPrincipalName || '').toLowerCase().trim();
              if (!email) continue;
              const isEnabled = gu.accountEnabled !== false;

              const existingUser = await prisma.user.findUnique({ where: { email } });
              if (!existingUser && isEnabled && defaultRole) {
                await prisma.user.create({
                  data: {
                    email,
                    fullName: gu.displayName || email.split('@')[0],
                    department: gu.department || 'Microsoft 365',
                    roleId: defaultRole.id,
                    passwordHash: 'SSO_MS365_AUTH_NO_PASSWORD',
                    isActive: true,
                  },
                });
                ssoImported++;
              } else if (existingUser && !isEnabled && existingUser.isActive) {
                await prisma.user.update({
                  where: { id: existingUser.id },
                  data: { isActive: false },
                });
                offboardedCount++;
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
