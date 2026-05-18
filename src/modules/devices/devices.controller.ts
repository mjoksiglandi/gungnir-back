import { Body, Controller, Get, Param, Patch, Post, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { deviceUpsertSchema, type DeviceUpsertDto } from './dto/device.schemas';
import { DevicesService } from './devices.service';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  list() {
    return this.devicesService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.devicesService.get(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(deviceUpsertSchema))
  create(@Body() body: DeviceUpsertDto) {
    return this.devicesService.create(body);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(deviceUpsertSchema))
  update(@Param('id') id: string, @Body() body: DeviceUpsertDto) {
    return this.devicesService.update(id, body);
  }

  @Get(':id/current-state')
  currentState(@Param('id') id: string) {
    return this.devicesService.currentState(id);
  }

  @Get(':id/telemetry')
  telemetry(@Param('id') id: string) {
    return this.devicesService.telemetry(id);
  }

  @Get(':id/commands')
  commands(@Param('id') id: string) {
    return this.devicesService.commands(id);
  }
}
