import { db } from '../data/mockDb';
import { AuditLogItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { persistAuditLog } from '../db/sync';

function sanitizePayload(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizePayload);

  const sensitiveKeys = new Set([
    'password', 'passwordhash', 'token', 'secret', 'authorization',
    'refreshtoken', 'accesstoken', 'creditcard', 'cvv', 'pin'
  ]);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class AuditService {
  public static log(
    actorName: string,
    actorRole: string,
    action: string,
    targetType: string,
    targetId?: string,
    actorId?: string,
    previousState?: any,
    newState?: any,
    ipAddress?: string
  ): AuditLogItem {
    const logItem: AuditLogItem = {
      id: uuidv4(),
      actorId,
      actorName,
      actorRole,
      action,
      targetType,
      targetId,
      previousState: sanitizePayload(previousState),
      newState: sanitizePayload(newState),
      ipAddress,
      createdAt: new Date().toISOString()
    };
    db.auditLogs.unshift(logItem);
    persistAuditLog(logItem).catch(() => {});
    return logItem;
  }

  public static getLogs(limit: number = 100): AuditLogItem[] {
    return db.auditLogs.slice(0, limit);
  }
}
