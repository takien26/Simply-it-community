import { prisma } from './db';
import { AuditAction } from '@prisma/client';
import { getCurrentUser } from './auth';

interface AuditLogParams {
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  userId?: string;
  ipAddress?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  const { action, entityType, entityId, changes, userId, ipAddress } = params;

  let logUserId = userId;
  if (!logUserId) {
    const currentUser = await getCurrentUser();
    logUserId = currentUser?.userId;
  }

  if (!logUserId) {
    console.warn('Audit log: No user ID available');
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: logUserId,
        action,
        entityType,
        entityId,
        changes: changes ? (changes as object) : undefined,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Helper to compute changes between old and new objects
 */
export function computeChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fields?: string[]
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const fieldsToCheck = fields || Object.keys(newObj);

  for (const field of fieldsToCheck) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
