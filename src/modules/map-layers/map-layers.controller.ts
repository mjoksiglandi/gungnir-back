import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { MapLayersService } from './map-layers.service';

@Controller('map-layers')
@UseGuards(JwtAuthGuard)
export class MapLayersController {
  constructor(private readonly mapLayersService: MapLayersService) {}

  @Get()
  list() {
    return this.mapLayersService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.mapLayersService.get(id);
  }

  @Get(':id/features')
  features(@Param('id') id: string) {
    return this.mapLayersService.features(id);
  }

  @Get(':id/geojson')
  geojson(@Param('id') id: string) {
    return this.mapLayersService.geojson(id);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.mapLayersService.patch(id, body);
  }
}
