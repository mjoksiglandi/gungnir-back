import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '@/infrastructure/database/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDb) {}

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async getRolesForUser(userId: string) {
    const rows = await this.db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return [...new Set(rows.map((row) => row.roleName))];
  }

  async getPermissionsForUser(userId: string) {
    const rows = await this.db
      .select({ permissionKey: permissions.key })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(userRoles.userId, userId));

    return [...new Set(rows.map((row) => row.permissionKey))];
  }
}
