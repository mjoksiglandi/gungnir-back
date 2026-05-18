import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { TelemetryService } from './telemetry.service';
import { telemetryIngestSchema, type TelemetryIngestDto } from './dto/telemetry.schemas';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('ingest')
  @UsePipes(new ZodValidationPipe(telemetryIngestSchema))
  ingest(@Body() body: TelemetryIngestDto) {
    return this.telemetryService.ingest(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.telemetryService.list();
  }

  @Get(':deviceId')
  @UseGuards(JwtAuthGuard)
  byDevice(@Param('deviceId') deviceId: string) {
    return this.telemetryService.byDevice(deviceId);
  }
}
