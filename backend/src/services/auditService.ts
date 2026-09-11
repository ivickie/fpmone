import { db } from '../data/mockDb';
import { AuditLogItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { persistAuditLog } from '../db/sync';

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
      previousState,
      newState,
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
