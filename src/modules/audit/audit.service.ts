import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { auditLogs } from '@/infrastructure/database/schema';
import { randomUUID } from 'node:crypto';

export interface AuditRecordInput {
  action: string;
  payload?: Record<string, unknown>;
  resourceId: string;
  resourceType: string;
  userAgent?: string | null;
  userId?: string | null;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDb) {}

  async record(input: AuditRecordInput) {
    await this.db.insert(auditLogs).values({
      id: `audit-${randomUUID()}`,
      userId: input.userId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      payload: input.payload ?? {},
    });
  }
}
