import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ExternalSourcesService } from './external-sources.service';

@Controller('external-sources')
@UseGuards(JwtAuthGuard)
export class ExternalSourcesController {
  constructor(private readonly externalSourcesService: ExternalSourcesService) {}

  @Get()
  list() {
    return this.externalSourcesService.list();
  }

  @Post(':id/sync')
  sync(@Param('id') id: string) {
    return this.externalSourcesService.sync(id);
  }
}
