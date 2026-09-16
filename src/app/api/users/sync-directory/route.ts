import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getLdapConfig, syncUsersFromLdap } from '@/lib/ldap';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let provider = 'all';
    try {
      const body = await request.json();
      if (body?.provider) provider = body.provider;
    } catch {}

    const offboardedUsers: Array<{ id: string; email: string; fullName: string; reason: string }> = [];
    const importedUsers: Array<{ email: string; fullName: string; provider: string }> = [];
    let scannedCount = 0;
    let ssoScanned = false;
    let ldapScanned = false;
    let ssoImportedCount = 0;
    let ldapImportedCount = 0;
    let updatedCount = 0;

    // Resolve default system role for new accounts
    let defaultRole = await prisma.role.findFirst({ where: { name: 'Staff' } });
    if (!defaultRole) {
      defaultRole = (await prisma.role.findFirst({ where: { isSystem: true } })) || (await prisma.role.findFirst());
    }

    // -------------------------------------------------------------------------
    // 1. Microsoft 365 SSO Directory Sync & Inbound Pull
    // -------------------------------------------------------------------------
    if (provider === 'all' || provider === 'sso') {
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
            // Fetch users with full profile attributes from Microsoft Graph
            const graphUsersRes = await fetch(
              'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,department,jobTitle&$top=999',
              {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
              }
            );

            if (graphUsersRes.ok) {
              const graphData = await graphUsersRes.json();
              const graphUsers = graphData.value || [];
              const graphMap = new Map<string, { accountEnabled: boolean; displayName: string; department?: string; jobTitle?: string }>();

              for (const gu of graphUsers) {
                const email = (gu.mail || gu.userPrincipalName || '').toLowerCase().trim();
                if (email) {
                  graphMap.set(email, {
                    accountEnabled: gu.accountEnabled !== false,
                    displayName: gu.displayName || email.split('@')[0],
                    department: gu.department || undefined,
                    jobTitle: gu.jobTitle || undefined,
                  });
                }
              }

              // A. Inbound Pre-Sync: Import active users from Microsoft 365 into DB
              if (defaultRole) {
                for (const [email, gInfo] of graphMap.entries()) {
                  if (!gInfo.accountEnabled) continue;

                  const existingUser = await prisma.user.findUnique({
                    where: { email },
                  });

                  if (!existingUser) {
                    await prisma.user.create({
                      data: {
                        email,
                        fullName: gInfo.displayName,
                        department: gInfo.department || 'Microsoft 365',
                        roleId: defaultRole.id,
                        passwordHash: 'SSO_MS365_AUTH_NO_PASSWORD',
                        isActive: true,
                      },
                    });
                    ssoImportedCount++;
                    importedUsers.push({ email, fullName: gInfo.displayName, provider: 'Microsoft 365' });
                  } else if (existingUser.isActive && (gInfo.department || gInfo.displayName)) {
                    // Update department or display name if missing
                    const updates: any = {};
                    if (!existingUser.department && gInfo.department) updates.department = gInfo.department;
                    if (existingUser.fullName === email.split('@')[0] && gInfo.displayName) updates.fullName = gInfo.displayName;

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

              // B. Offboard Check: Deactivate users who are locked/deleted on M365
              const dbUsers = await prisma.user.findMany({
                where: { isActive: true },
                select: { id: true, email: true, fullName: true, passwordHash: true },
              });

              scannedCount += dbUsers.length;

              for (const u of dbUsers) {
                const uEmail = u.email.toLowerCase().trim();
                const m365User = graphMap.get(uEmail);

                if (m365User) {
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
    }

    // -------------------------------------------------------------------------
    // 2. LDAP / Active Directory Inbound Sync
    // -------------------------------------------------------------------------
    let ldapError = '';
    if (provider === 'all' || provider === 'ldap') {
      const ldapConfig = await getLdapConfig();
      if (ldapConfig.enabled) {
        ldapScanned = true;
        try {
          const ldapResult = await syncUsersFromLdap(ldapConfig);
          if (!ldapResult.success) {
            ldapError = ldapResult.error || 'Lỗi truy vấn LDAP';
          } else {
            const ldapUsers = ldapResult.users;
            scannedCount += ldapUsers.length;

            let targetRoleId = ldapConfig.defaultRoleId || defaultRole?.id;
            if (!targetRoleId && defaultRole) targetRoleId = defaultRole.id;

            const placeholderPasswordHash = await bcrypt.hash(`LdapSync@${Date.now()}`, 10);

            for (const lu of ldapUsers) {
              const uEmail = lu.email.toLowerCase().trim();
              const existingUser = await prisma.user.findUnique({
                where: { email: uEmail },
              });

              if (!existingUser) {
                // Pre-provision new active user from Active Directory / LDAP
                if (!lu.isDisabled && targetRoleId) {
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
                  ldapImportedCount++;
                  importedUsers.push({ email: uEmail, fullName: lu.fullName, provider: 'LDAP / Active Directory' });
                }
              } else {
                // If account exists in Simply IT
                if (lu.isDisabled && existingUser.isActive) {
                  // User disabled in Active Directory -> deactivate in Simply IT
                  await prisma.user.update({
                    where: { id: existingUser.id },
                    data: { isActive: false },
                  });

                  offboardedUsers.push({
                    id: existingUser.id,
                    email: existingUser.email,
                    fullName: existingUser.fullName,
                    reason: 'Tài khoản bị vô hiệu hóa (Disabled) trên Active Directory / LDAP',
                  });

                  await createAuditLog({
                    action: 'UPDATE',
                    entityType: 'User',
                    entityId: existingUser.id,
                    userId: currentUser.userId,
                  });
                } else if (existingUser.isActive) {
                  // Update department or full name if missing
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
        } catch (ldapErr: any) {
          console.error('LDAP sync error:', ldapErr);
          ldapError = ldapErr?.message || 'Lỗi ngoại lệ khi đồng bộ LDAP';
        }
      }
    }

    const totalImported = ssoImportedCount + ldapImportedCount;
    let summaryMessage = 'Đồng bộ danh bạ hoàn tất.';
    if (totalImported > 0 || offboardedUsers.length > 0 || updatedCount > 0) {
      const parts = [];
      if (totalImported > 0) parts.push(`Nạp mới thành công ${totalImported} tài khoản (${ldapImportedCount > 0 ? `${ldapImportedCount} từ LDAP/AD` : ''}${ldapImportedCount > 0 && ssoImportedCount > 0 ? ', ' : ''}${ssoImportedCount > 0 ? `${ssoImportedCount} từ SSO` : ''})`);
      if (updatedCount > 0) parts.push(`Cập nhật thông tin ${updatedCount} tài khoản`);
      if (offboardedUsers.length > 0) parts.push(`Khóa/chuyển ${offboardedUsers.length} tài khoản nghỉ việc`);
      summaryMessage = `🎉 ${parts.join('. ')}.`;
    } else if (ldapError) {
      summaryMessage = `⚠️ Cảnh báo LDAP: ${ldapError}`;
    }

    return NextResponse.json({
      success: true,
      message: summaryMessage,
      scannedCount,
      importedCount: totalImported,
      ssoImportedCount,
      ldapImportedCount,
      updatedCount,
      offboardedCount: offboardedUsers.length,
      importedUsers,
      offboardedUsers,
      ssoScanned,
      ldapScanned,
      ldapError: ldapError || null,
    });
  } catch (error: any) {
    console.error('Directory sync error:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi khi đồng bộ danh bạ thư mục' },
      { status: 500 }
    );
  }
}

