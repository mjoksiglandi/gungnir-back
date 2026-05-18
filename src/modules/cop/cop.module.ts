import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { CopController } from './cop.controller';
import { CopService } from './cop.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CopController],
  providers: [CopService],
})
export class CopModule {}
