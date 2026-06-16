import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { TrackingController } from './controllers/tracking.controller';
import { TrackingRepository } from './repositories/tracking.repository';
import { TrackingService } from './services/tracking.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TrackingController],
  providers: [TrackingRepository, TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
