import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { MqttModule } from '@/infrastructure/mqtt/mqtt.module';
import { CommandsController } from './controllers/commands.controller';
import { CommandsRepository } from './repositories/commands.repository';
import { CommandsService } from './services/commands.service';

@Module({
  imports: [DatabaseModule, MqttModule],
  controllers: [CommandsController],
  providers: [CommandsRepository, CommandsService],
  exports: [CommandsService],
})
export class CommandsModule {}
