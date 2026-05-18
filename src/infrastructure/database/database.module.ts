import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from './database.tokens';
import * as schema from './schema';

@Module({
  providers: [
    {
      provide: POSTGRES_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return postgres(configService.getOrThrow<string>('app.DATABASE_URL'), {
          max: 10,
          prepare: false,
        });
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [POSTGRES_CONNECTION],
      useFactory: (client: postgres.Sql) => drizzle(client, { schema }),
    },
  ],
  exports: [POSTGRES_CONNECTION, DRIZZLE_DB],
})
export class DatabaseModule {}
