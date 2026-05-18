import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('issues a token pair on valid login', async () => {
    const db = {
      insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) }),
      select: jest.fn(),
      update: jest.fn(),
    };

    const usersService = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'user-admin',
        email: 'admin@gungnir.local',
        passwordHash: hashSync('admin12345', 10),
      }),
      getRolesForUser: jest.fn().mockResolvedValue(['admin']),
    };

    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    const configService = {
      getOrThrow: jest.fn((key: string) => ({
        'app.JWT_ACCESS_SECRET': 'access-secret-123456',
        'app.JWT_REFRESH_SECRET': 'refresh-secret-123456',
        'app.ACCESS_TOKEN_TTL': '15m',
        'app.REFRESH_TOKEN_TTL': '30d',
      }[key])),
    };

    const service = new AuthService(db as never, usersService as never, jwtService, configService as never);
    const result = await service.login('admin@gungnir.local', 'admin12345');

    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');
    expect(usersService.getRolesForUser).toHaveBeenCalledWith('user-admin');
  });
});
