import { AuditLogModel } from '../models';

export interface AuditEntry {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  await AuditLogModel.create(entry);
}
