import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getLdapConfig, syncUsersFromLdap, type LdapConfig } from '@/lib/ldap';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let provider = 'all';
    let passedConfig: any = null;
    try {
      const body = await request.json();
      if (body?.provider) provider = body.provider;
      if (body?.config) passedConfig = body.config;
    } catch {}

    const offboardedUsers: Array<{ id: string; email: string; fullName: string; reason: string }> = [];
    const importedUsers: Array<{ email: string; fullName: string; provider: string }> = [];
    let scannedCount = 0;
    let ssoScanned = false;
    let ldapScanned = false;
    let ssoImportedCount = 0;
    let ldapImportedCount = 0;
    let updatedCount = 0;
    let ssoError = '';
    let ldapError = '';

    // Helper to persist setting to DB
    const upsertSetting = async (key: string, value: string, group = 'general') => {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value, group },
        create: { key, value, label: key, group, type: 'STRING' },
      });
    };

    // Helper to resolve or auto-create Location from office name
    const locationCache = new Map<string, string>();
    const resolveLocationId = async (officeName?: string): Promise<string | null> => {
      if (!officeName || !officeName.trim()) return null;
      const clean = officeName.trim();
      const key = clean.toLowerCase();
      if (locationCache.has(key)) {
        return locationCache.get(key)!;
      }
      let loc = await prisma.location.findFirst({
        where: { name: { equals: clean, mode: 'insensitive' } },
      });
      if (!loc) {
        loc = await prisma.location.create({
          data: {
            name: clean,
            notes: 'Tự động tạo từ danh bạ thư mục (Directory Sync)',
          },
        });
      }
      locationCache.set(key, loc.id);
      return loc.id;
    };

    // Resolve default system role for new accounts
    let defaultRole = await prisma.role.findFirst({ where: { name: 'Staff' } });
    if (!defaultRole) {
      defaultRole = (await prisma.role.findFirst({ where: { isSystem: true } })) || (await prisma.role.findFirst());
    }

    // -------------------------------------------------------------------------
    // 1. Microsoft 365 SSO Directory Sync & Inbound Pull
    // -------------------------------------------------------------------------
    if (provider === 'all' || provider === 'sso') {
      // Check if config was passed from form
      if (passedConfig?.clientId && passedConfig?.clientSecret) {
        await upsertSetting('sso.ms365_enabled', 'true', 'sso');
        await upsertSetting('sso.ms365_client_id', passedConfig.clientId, 'sso');
        await upsertSetting('sso.ms365_client_secret', passedConfig.clientSecret, 'sso');
        await upsertSetting('sso.ms365_tenant_id', passedConfig.tenantId || 'common', 'sso');
      }

      const clientIdSetting = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_id' } });
      const clientSecretSetting = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_secret' } });
      const tenantIdSetting = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_tenant_id' } });
      const ssoEnabledSetting = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_enabled' } });

      const clientId = passedConfig?.clientId || clientIdSetting?.value;
      const clientSecret = passedConfig?.clientSecret || clientSecretSetting?.value;
      const tenantId = passedConfig?.tenantId || tenantIdSetting?.value || 'common';
      const isSsoActive = passedConfig?.clientId || ssoEnabledSetting?.value === 'true';

      if (provider === 'sso' && (!clientId || !clientSecret)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Chưa cấu hình Application (Client) ID và Client Secret cho Microsoft 365 SSO. Vui lòng nhập thông tin trên Azure Portal trước khi đồng bộ.',
          },
          { status: 400 }
        );
      }

      if (clientId && clientSecret && isSsoActive) {
        ssoScanned = true;
        try {
          const tenant = tenantId || 'common';
          const tokenParams = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          });

          const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams.toString(),
          });

          const tokenData = await tokenRes.json();
          if (!tokenRes.ok || !tokenData.access_token) {
            ssoError = `Lỗi xác thực Microsoft Entra ID: ${tokenData.error_description || tokenData.error || 'Token request failed'}`;
          } else {
            // Fetch users with full profile attributes from Microsoft Graph
            let graphUsersRes = await fetch(
              'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,department,jobTitle,mobilePhone,businessPhones,officeLocation,companyName,city&$expand=manager($select=id,displayName,mail,userPrincipalName)&$top=999',
              {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
              }
            );

            if (!graphUsersRes.ok) {
              // Fallback if tenant does not support expand=manager
              graphUsersRes = await fetch(
                'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,department,jobTitle,mobilePhone,businessPhones,officeLocation,companyName,city&$top=999',
                {
                  headers: { Authorization: `Bearer ${tokenData.access_token}` },
                }
              );
            }

            if (!graphUsersRes.ok) {
              const graphErr = await graphUsersRes.json().catch(() => ({}));
              ssoError = `Lỗi Microsoft Graph API: ${graphErr?.error?.message || 'Quyền hạn không đủ'}. Cần thêm quyền "User.Read.All" (Application permissions) và nhấn "Grant admin consent" trên Azure App Registration.`;
            } else {
              const graphData = await graphUsersRes.json();
              const graphUsers = graphData.value || [];
              const graphMap = new Map<
                string,
                {
                  accountEnabled: boolean;
                  displayName: string;
                  department?: string;
                  jobTitle?: string;
                  phone?: string;
                  officeLocation?: string;
                  companyName?: string;
                  managerEmail?: string;
                }
              >();

              for (const gu of graphUsers) {
                const email = (gu.mail || gu.userPrincipalName || '').toLowerCase().trim();
                if (email) {
                  const phone = gu.mobilePhone || (Array.isArray(gu.businessPhones) && gu.businessPhones.length > 0 ? gu.businessPhones[0] : undefined);
                  const officeLocation = gu.officeLocation || gu.city || undefined;
                  const managerEmail = (gu.manager?.mail || gu.manager?.userPrincipalName || '').toLowerCase().trim() || undefined;
                  graphMap.set(email, {
                    accountEnabled: gu.accountEnabled !== false,
                    displayName: gu.displayName || email.split('@')[0],
                    department: gu.department || undefined,
                    jobTitle: gu.jobTitle || undefined,
                    phone: phone ? String(phone).trim() : undefined,
                    officeLocation: officeLocation ? String(officeLocation).trim() : undefined,
                    companyName: gu.companyName ? String(gu.companyName).trim() : undefined,
                    managerEmail,
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

                  const locationId = await resolveLocationId(gInfo.officeLocation);

                  if (!existingUser) {
                    await prisma.user.create({
                      data: {
                        email,
                        fullName: gInfo.displayName,
                        department: gInfo.department || 'Microsoft 365',
                        position: gInfo.jobTitle || null,
                        companyName: gInfo.companyName || null,
                        phone: gInfo.phone || null,
                        locationId,
                        roleId: defaultRole.id,
                        passwordHash: 'SSO_MS365_AUTH_NO_PASSWORD',
                        isActive: true,
                      },
                    });
                    ssoImportedCount++;
                    importedUsers.push({ email, fullName: gInfo.displayName, provider: 'Microsoft 365' });
                  } else if (existingUser.isActive) {
                    // Update profile fields if missing
                    const updates: any = {};
                    if (!existingUser.department && gInfo.department) updates.department = gInfo.department;
                    if (existingUser.fullName === email.split('@')[0] && gInfo.displayName) updates.fullName = gInfo.displayName;
                    if (!existingUser.phone && gInfo.phone) updates.phone = gInfo.phone;
                    if (!existingUser.position && gInfo.jobTitle) updates.position = gInfo.jobTitle;
                    if (!existingUser.companyName && gInfo.companyName) updates.companyName = gInfo.companyName;
                    if (!existingUser.locationId && locationId) updates.locationId = locationId;

                    if (Object.keys(updates).length > 0) {
                      await prisma.user.update({
                        where: { id: existingUser.id },
                        data: updates,
                      });
                      updatedCount++;
                    }
                  }
                }

                // Pass 2: Link direct managers for M365 users
                for (const [email, gInfo] of graphMap.entries()) {
                  if (gInfo.managerEmail) {
                    const u = await prisma.user.findUnique({ where: { email } });
                    const mgr = await prisma.user.findUnique({ where: { email: gInfo.managerEmail } });
                    if (u && mgr && u.id !== mgr.id && u.managerId !== mgr.id) {
                      await prisma.user.update({
                        where: { id: u.id },
                        data: { managerId: mgr.id },
                      });
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
        } catch (ssoErr: any) {
          console.error('SSO sync error:', ssoErr);
          ssoError = ssoErr?.message || 'Lỗi ngoại lệ khi đồng bộ Microsoft 365';
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. LDAP / Active Directory Inbound Sync
    // -------------------------------------------------------------------------
    if (provider === 'all' || provider === 'ldap') {
      if (passedConfig?.serverUrl) {
        await upsertSetting('ldap.enabled', 'true', 'ldap');
        await upsertSetting('ldap.server_url', passedConfig.serverUrl, 'ldap');
        if (passedConfig.baseDn) await upsertSetting('ldap.base_dn', passedConfig.baseDn, 'ldap');
        if (passedConfig.bindDn !== undefined) await upsertSetting('ldap.bind_dn', passedConfig.bindDn, 'ldap');
        if (passedConfig.bindPassword !== undefined) await upsertSetting('ldap.bind_password', passedConfig.bindPassword, 'ldap');
        if (passedConfig.userSearchFilter) await upsertSetting('ldap.user_search_filter', passedConfig.userSearchFilter, 'ldap');
        if (passedConfig.defaultRoleId !== undefined) await upsertSetting('ldap.default_role_id', passedConfig.defaultRoleId, 'ldap');
        if (passedConfig.autoSyncInterval) await upsertSetting('ldap.auto_sync_interval', passedConfig.autoSyncInterval, 'ldap');
        if (passedConfig.domain !== undefined) await upsertSetting('ldap.domain', passedConfig.domain, 'ldap');
      }

      let ldapConfig: LdapConfig;
      if (passedConfig?.serverUrl) {
        ldapConfig = {
          enabled: true,
          serverUrl: passedConfig.serverUrl,
          baseDn: passedConfig.baseDn || 'dc=company,dc=com',
          bindDn: passedConfig.bindDn || '',
          bindPassword: passedConfig.bindPassword || '',
          userSearchFilter: passedConfig.userSearchFilter || '(|(sAMAccountName={{username}})(mail={{username}})(userPrincipalName={{username}}))',
          autoCreateUser: passedConfig.autoCreateUser !== false,
          defaultRoleId: passedConfig.defaultRoleId || '',
          domain: passedConfig.domain || '',
        };
      } else {
        ldapConfig = await getLdapConfig();
      }

      if (provider === 'ldap' && !ldapConfig.enabled) {
        return NextResponse.json(
          {
            success: false,
            message: 'Dịch vụ LDAP chưa được BẬT hoặc chưa được cấu hình. Vui lòng bật công tắc LDAP và nhấn Lưu Cài Đặt LDAP / AD.',
          },
          { status: 400 }
        );
      }

      if (ldapConfig.enabled) {
        ldapScanned = true;
        try {
          const ldapResult = await syncUsersFromLdap(ldapConfig);
          if (!ldapResult.success) {
            ldapError = ldapResult.error || 'Lỗi truy vấn LDAP';
          } else {
            const ldapUsers = ldapResult.users;
            scannedCount += ldapUsers.length;

            if (ldapUsers.length === 0) {
              ldapError = `Đã kết nối máy chủ LDAP thành công nhưng không tìm thấy tài khoản nào trong Base DN (${ldapConfig.baseDn}). Vui lòng kiểm tra lại Base DN hoặc phân quyền của tài khoản Bind DN.`;
            }

            let targetRoleId = ldapConfig.defaultRoleId || defaultRole?.id;
            if (!targetRoleId && defaultRole) targetRoleId = defaultRole.id;

            const placeholderPasswordHash = await bcrypt.hash(`LdapSync@${Date.now()}`, 10);

            for (const lu of ldapUsers) {
              const uEmail = lu.email.toLowerCase().trim();
              const existingUser = await prisma.user.findUnique({
                where: { email: uEmail },
              });

              const locationId = await resolveLocationId(lu.officeLocation);

              if (!existingUser) {
                // Pre-provision new active user from Active Directory / LDAP
                if (!lu.isDisabled && targetRoleId) {
                  await prisma.user.create({
                    data: {
                      email: uEmail,
                      fullName: lu.fullName,
                      department: lu.department || 'Active Directory / LDAP',
                      position: lu.title || null,
                      companyName: lu.company || null,
                      phone: lu.phone || null,
                      locationId,
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
                  // Update profile fields if missing
                  const updates: any = {};
                  if (!existingUser.department && lu.department) updates.department = lu.department;
                  if (existingUser.fullName === uEmail.split('@')[0] && lu.fullName) updates.fullName = lu.fullName;
                  if (!existingUser.phone && lu.phone) updates.phone = lu.phone;
                  if (!existingUser.position && lu.title) updates.position = lu.title;
                  if (!existingUser.companyName && lu.company) updates.companyName = lu.company;
                  if (!existingUser.locationId && locationId) updates.locationId = locationId;

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

            // Pass 2: Link direct managers for LDAP users
            for (const lu of ldapUsers) {
              if (lu.managerEmail) {
                const uEmail = lu.email.toLowerCase().trim();
                const u = await prisma.user.findUnique({ where: { email: uEmail } });
                const mgr = await prisma.user.findUnique({ where: { email: lu.managerEmail.toLowerCase().trim() } });
                if (u && mgr && u.id !== mgr.id && u.managerId !== mgr.id) {
                  await prisma.user.update({
                    where: { id: u.id },
                    data: { managerId: mgr.id },
                  });
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
    } else if (ldapError || ssoError) {
      summaryMessage = [ldapError, ssoError].filter(Boolean).join(' | ');
    } else if (scannedCount > 0) {
      summaryMessage = `✅ Danh bạ đã đồng nhất: Đã quét ${scannedCount} tài khoản từ thư mục, dữ liệu đều khớp và đã sẵn sàng trong hệ thống.`;
    } else {
      summaryMessage = 'Không có tài khoản nào được xử lý. Vui lòng kiểm tra lại cấu hình kết nối.';
    }

    const isSuccess = (totalImported > 0 || offboardedUsers.length > 0 || updatedCount > 0 || (!ldapError && !ssoError));

    return NextResponse.json({
      success: isSuccess,
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
      ssoError: ssoError || null,
    }, { status: (!isSuccess && (provider === 'ldap' || provider === 'sso')) ? 400 : 200 });
  } catch (error: any) {
    console.error('Directory sync error:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi khi đồng bộ danh bạ thư mục' },
      { status: 500 }
    );
  }
}

