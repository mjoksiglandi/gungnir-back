import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SystemHealthModule } from '@/modules/system-health/system-health.module';

describe('SystemHealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemHealthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/api/health');
    const body = response.body as { status: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
  });
});
