import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { CopService } from './cop.service';

@Controller('v1')
export class CopController {
  constructor(private readonly copService: CopService) {}

  @Get('operations/bootstrap')
  bootstrap() {
    return this.copService.bootstrapV1();
  }

  @Get('operations/snapshot')
  snapshot() {
    return this.copService.snapshotV1();
  }

  @Get('assets')
  assets() {
    return this.copService.listAssetsV1();
  }

  @Get('assets/:id')
  async asset(@Param('id') id: string) {
    const row = await this.copService.getAssetV1(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Get('alerts')
  alerts() {
    return this.copService.listAlertsV1();
  }

  @Get('alerts/:id')
  async alert(@Param('id') id: string) {
    const row = await this.copService.getAlertV1(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Get('incidents')
  incidents() {
    return this.copService.listIncidentsV1();
  }

  @Get('incidents/:id')
  async incident(@Param('id') id: string) {
    const row = await this.copService.getIncidentV1(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Get('layers')
  layers() {
    return this.copService.listLayersV1();
  }

  @Get('layers/:id')
  async layer(@Param('id') id: string) {
    const row = await this.copService.getLayerV1(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Get('layers/:id/geojson')
  async layerGeoJson(@Param('id') id: string) {
    const row = await this.copService.getLayerGeoJsonV1(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Get('timeline')
  timeline() {
    return this.copService.listTimelineV1();
  }

  @Get('timeline/:id')
  async timelineEvent(@Param('id') id: string) {
    const row = await this.copService.getTimelineEventV1(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Get('geospatial/fire-hotspots')
  hotspots() {
    return this.copService.fireHotspotsV1();
  }
}
