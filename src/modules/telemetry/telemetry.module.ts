import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { TelemetryController } from './controllers/telemetry.controller';
import { GuardianUplinkE2eService } from './guardian-uplink-e2e.service';
import { TelemetryRepository } from './repositories/telemetry.repository';
import { TelemetryService } from './services/telemetry.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [TelemetryController],
  providers: [TelemetryRepository, TelemetryService, GuardianUplinkE2eService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
