import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { desc, eq } from 'drizzle-orm';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { alerts } from '@/infrastructure/database/schema';

@Injectable()
export class AlertsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  list() {
    return this.db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async get(id: string) {
    const [alert] = await this.db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
    if (!alert) throw new NotFoundException(`Alert '${id}' was not found.`);
    return alert;
  }

  async acknowledge(id: string) {
    await this.get(id);
    await this.db.update(alerts).set({ status: 'acknowledged', acknowledgedAt: new Date() }).where(eq(alerts.id, id));
    this.eventEmitter.emit(DOMAIN_EVENTS.alertUpdated, { alertId: id, status: 'acknowledged' });
    return this.get(id);
  }

  async resolve(id: string) {
    await this.get(id);
    await this.db.update(alerts).set({ status: 'resolved', resolvedAt: new Date() }).where(eq(alerts.id, id));
    this.eventEmitter.emit(DOMAIN_EVENTS.alertUpdated, { alertId: id, status: 'resolved' });
    return this.get(id);
  }
}
