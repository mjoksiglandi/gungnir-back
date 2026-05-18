import { Controller, Get, Param, Query, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { bboxQuerySchema, type BboxQueryDto } from './dto/tracking.schemas';
import { TrackingService } from './tracking.service';

@Controller('tracks')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('current')
  current() {
    return this.trackingService.current();
  }

  @Get('history')
  history() {
    return this.trackingService.history();
  }

  @Get('bbox')
  @UsePipes(new ZodValidationPipe(bboxQuerySchema))
  bbox(@Query() query: BboxQueryDto) {
    return this.trackingService.bbox(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.trackingService.get(id);
  }
}
