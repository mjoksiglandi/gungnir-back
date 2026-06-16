import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { DevicesController } from './controllers/devices.controller';
import { DevicesRepository } from './repositories/devices.repository';
import { DevicesService } from './services/devices.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DevicesController],
  providers: [DevicesRepository, DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
