import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'external-source-sync' },
      { name: 'alert-processing' },
      { name: 'command-dispatch' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
