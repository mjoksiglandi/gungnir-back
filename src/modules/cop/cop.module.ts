import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { CopController } from './controllers/cop.controller';
import { CopRepository } from './repositories/cop.repository';
import { CopService } from './services/cop.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CopController],
  providers: [CopRepository, CopService],
})
export class CopModule {}
