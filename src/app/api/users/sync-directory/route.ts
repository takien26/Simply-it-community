import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getLdapConfig, testLdapConnection } from '@/lib/ldap';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const offboardedUsers: Array<{ id: string; email: string; fullName: string; reason: string }> = [];
    let scannedCount = 0;
    let ssoScanned = false;
    let ldapScanned = false;

    // 1. Check Microsoft 365 SSO Configuration
    const clientId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_id' } });
    const clientSecret = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_secret' } });
    const tenantId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_tenant_id' } });

    if (clientId?.value && clientSecret?.value) {
      ssoScanned = true;
      try {
        const tenant = tenantId?.value || 'common';
        const tokenParams = new URLSearchParams({
          client_id: clientId.value,
          client_secret: clientSecret.value,
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
          // Fetch up to 999 users from Microsoft Graph
          const graphUsersRes = await fetch(
            'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled&$top=999',
            {
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
            }
          );

          if (graphUsersRes.ok) {
            const graphData = await graphUsersRes.json();
            const graphUsers = graphData.value || [];
            const graphMap = new Map<string, { accountEnabled: boolean; displayName: string }>();

            for (const gu of graphUsers) {
              const email = (gu.mail || gu.userPrincipalName || '').toLowerCase().trim();
              if (email) {
                graphMap.set(email, {
                  accountEnabled: gu.accountEnabled !== false,
                  displayName: gu.displayName || '',
                });
              }
            }

            // Check active users in Simply IT database
            const dbUsers = await prisma.user.findMany({
              where: { isActive: true },
              select: { id: true, email: true, fullName: true, passwordHash: true },
            });

            scannedCount += dbUsers.length;

            for (const u of dbUsers) {
              const uEmail = u.email.toLowerCase().trim();
              const m365User = graphMap.get(uEmail);

              if (m365User) {
                // If account is disabled/locked on Microsoft 365
                if (!m365User.accountEnabled) {
                  await prisma.user.update({
                    where: { id: u.id },
                    data: { isActive: false },
                  });

                  offboardedUsers.push({
                    id: u.id,
                    email: u.email,
                    fullName: u.fullName,
                    reason: 'Tài khoản bị khóa / vô hiệu hóa trên Microsoft 365 (Entra ID)',
                  });

                  await createAuditLog({
                    action: 'UPDATE',
                    entityType: 'User',
                    entityId: u.id,
                    userId: currentUser.userId,
                  });
                }
              } else if (u.passwordHash === 'SSO_MS365_AUTH_NO_PASSWORD') {
                // User was provisioned via SSO but is no longer found in tenant (deleted)
                await prisma.user.update({
                  where: { id: u.id },
                  data: { isActive: false },
                });

                offboardedUsers.push({
                  id: u.id,
                  email: u.email,
                  fullName: u.fullName,
                  reason: 'Tài khoản đã bị xóa khỏi Microsoft 365 (Không còn trong danh bạ)',
                });

                await createAuditLog({
                  action: 'UPDATE',
                  entityType: 'User',
                  entityId: u.id,
                  userId: currentUser.userId,
                });
              }
            }
          }
        }
      } catch (ssoErr) {
        console.error('SSO sync error:', ssoErr);
      }
    }

    // 2. Check LDAP / Active Directory Configuration
    const ldapConfig = await getLdapConfig();
    if (ldapConfig.enabled) {
      ldapScanned = true;
      try {
        const testRes = await testLdapConnection(ldapConfig);
        if (testRes.success) {
          // In LDAP sync, verify domain users
          const ldapUsers = await prisma.user.findMany({
            where: {
              isActive: true,
              OR: [
                { department: { contains: 'LDAP', mode: 'insensitive' } },
                { email: { endsWith: ldapConfig.domain ? `@${ldapConfig.domain.replace(/^@/, '')}` : '@company.local', mode: 'insensitive' } },
              ],
            },
            select: { id: true, email: true, fullName: true },
          });

          scannedCount += ldapUsers.length;
        }
      } catch (ldapErr) {
        console.error('LDAP sync error:', ldapErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: offboardedUsers.length > 0
        ? `Đã đồng bộ xong! Phát hiện và chuyển ${offboardedUsers.length} tài khoản bị khóa/xóa sang trạng thái Nghỉ việc.`
        : 'Đồng bộ danh bạ hoàn tất. Tất cả tài khoản đang đồng bộ đều hợp lệ.',
      scannedCount,
      offboardedCount: offboardedUsers.length,
      offboardedUsers,
      ssoScanned,
      ldapScanned,
    });
  } catch (error: any) {
    console.error('Directory sync error:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi khi đồng bộ danh bạ thư mục' },
      { status: 500 }
    );
  }
}
