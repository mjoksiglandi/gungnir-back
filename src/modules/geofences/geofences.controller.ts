import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { geofenceSchema, type GeofenceDto } from './dto/geofence.schemas';
import { GeofencesService } from './geofences.service';

@Controller('geofences')
@UseGuards(JwtAuthGuard)
export class GeofencesController {
  constructor(private readonly geofencesService: GeofencesService) {}

  @Get()
  list() {
    return this.geofencesService.list();
  }

  @Post()
  @UsePipes(new ZodValidationPipe(geofenceSchema))
  create(@Body() body: GeofenceDto) {
    return this.geofencesService.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.geofencesService.get(id);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(geofenceSchema))
  update(@Param('id') id: string, @Body() body: GeofenceDto) {
    return this.geofencesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.geofencesService.remove(id);
  }
}
