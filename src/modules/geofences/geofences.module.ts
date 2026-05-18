import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { GeofencesController } from './geofences.controller';
import { GeofencesService } from './geofences.service';

@Module({
  imports: [DatabaseModule],
  controllers: [GeofencesController],
  providers: [GeofencesService],
})
export class GeofencesModule {}
