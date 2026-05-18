import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { ExternalSourcesController } from './external-sources.controller';
import { ExternalSourcesService } from './external-sources.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ExternalSourcesController],
  providers: [ExternalSourcesService],
})
export class ExternalSourcesModule {}
