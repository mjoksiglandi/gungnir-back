import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { ExternalSourcesController } from './controllers/external-sources.controller';
import { DgacSourceProvider } from './dgac-source.provider';
import { NaturalHazardsSourceProvider } from './natural-hazards-source.provider';
import { ExternalSourcesRepository } from './repositories/external-sources.repository';
import { ExternalSourcesService } from './services/external-sources.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ExternalSourcesController],
  providers: [ExternalSourcesRepository, ExternalSourcesService, DgacSourceProvider, NaturalHazardsSourceProvider],
})
export class ExternalSourcesModule {}
