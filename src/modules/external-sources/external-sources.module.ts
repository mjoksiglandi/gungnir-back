import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { ExternalSourcesController } from './external-sources.controller';
import { DgacSourceProvider } from './dgac-source.provider';
import { ExternalSourcesService } from './external-sources.service';
import { NaturalHazardsSourceProvider } from './natural-hazards-source.provider';

@Module({
  imports: [DatabaseModule],
  controllers: [ExternalSourcesController],
  providers: [ExternalSourcesService, DgacSourceProvider, NaturalHazardsSourceProvider],
})
export class ExternalSourcesModule {}
