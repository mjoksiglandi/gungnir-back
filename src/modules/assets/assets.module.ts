import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { AssetsService } from './assets.service';

@Module({
  imports: [DatabaseModule],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
