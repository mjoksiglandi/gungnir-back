import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { compareSync } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { UsersService } from '@/modules/users/users.service';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { refreshTokens } from '@/infrastructure/database/schema';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get accessSecret() {
    return this.configService.getOrThrow<string>('app.JWT_ACCESS_SECRET');
  }

  private get refreshSecret() {
    return this.configService.getOrThrow<string>('app.JWT_REFRESH_SECRET');
  }

  private get accessTtl() {
    return this.configService.getOrThrow<string>('app.ACCESS_TOKEN_TTL');
  }

  private get refreshTtl() {
    return this.configService.getOrThrow<string>('app.REFRESH_TOKEN_TTL');
  }

  private ttlToSeconds(value: string) {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      return 60 * 15;
    }

    const amount = Number.parseInt(match[1], 10);
    const unit = match[2];
    const multiplier = unit === 's'
      ? 1
      : unit === 'm'
        ? 60
        : unit === 'h'
          ? 3600
          : 86400;

    return amount * multiplier;
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !compareSync(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const roles = await this.usersService.getRolesForUser(user.id);
    const permissions = await this.usersService.getPermissionsForUser(user.id);
    return this.issueTokenPair(user.id, user.email, roles, permissions);
  }

  async refresh(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync<{ sub: string; email: string; jti: string; roles: string[] }>(refreshToken, {
      secret: this.refreshSecret,
    });

    const [tokenRow] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.jti, payload.jti)).limit(1);

    if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked.');
    }

    const roles = await this.usersService.getRolesForUser(payload.sub);
    const permissions = await this.usersService.getPermissionsForUser(payload.sub);
    return this.issueTokenPair(payload.sub, payload.email, roles, permissions);
  }

  async logout(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync<{ jti: string }>(refreshToken, {
      secret: this.refreshSecret,
    });

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.jti, payload.jti));
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const roles = [...new Set(await this.usersService.getRolesForUser(user.id))];
    const permissions = [
      ...new Set(await this.usersService.getPermissionsForUser(user.id)),
    ];
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      roles,
      permissions,
    };
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    roles: string[],
    permissions: string[],
  ) {
    const jti = randomUUID();
    const uniqueRoles = [...new Set(roles)];
    const uniquePermissions = [...new Set(permissions)];

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, roles: uniqueRoles, permissions: uniquePermissions },
      { secret: this.accessSecret, expiresIn: this.ttlToSeconds(this.accessTtl) },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        roles: uniqueRoles,
        permissions: uniquePermissions,
        jti,
      },
      { secret: this.refreshSecret, expiresIn: this.ttlToSeconds(this.refreshTtl) },
    );

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await this.db.insert(refreshTokens).values({
      id: `refresh-${randomUUID()}`,
      userId,
      jti,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtl,
      tokenType: 'Bearer',
    };
  }
}
