import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { TelemetryController } from './telemetry.controller';
import { GuardianUplinkE2eService } from './guardian-uplink-e2e.service';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [TelemetryController],
  providers: [TelemetryService, GuardianUplinkE2eService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
