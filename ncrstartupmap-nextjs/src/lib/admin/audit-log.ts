export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const auditLog: AuditEntry[] = [];

export function logAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const auditEntry: AuditEntry = {
    ...entry,
    id: Math.random().toString(36).substring(7),
    timestamp: new Date(),
  };
  auditLog.push(auditEntry);
  return auditEntry;
}

export function getAuditLog(userId?: string): AuditEntry[] {
  if (userId) {
    return auditLog.filter((entry) => entry.userId === userId);
  }
  return auditLog;
}

export function clearAuditLog(): void {
  auditLog.length = 0;
}
