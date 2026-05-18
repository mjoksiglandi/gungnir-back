import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { MapLayersController } from './map-layers.controller';
import { MapLayersService } from './map-layers.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MapLayersController],
  providers: [MapLayersService],
  exports: [MapLayersService],
})
export class MapLayersModule {}
