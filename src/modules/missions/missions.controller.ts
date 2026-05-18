import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { missionSchema, type MissionDto } from './dto/mission.schemas';
import { MissionsService } from './missions.service';

@Controller('missions')
@UseGuards(JwtAuthGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  list() {
    return this.missionsService.list();
  }

  @Post()
  @UsePipes(new ZodValidationPipe(missionSchema))
  create(@Body() body: MissionDto) {
    return this.missionsService.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.missionsService.get(id);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(missionSchema))
  update(@Param('id') id: string, @Body() body: MissionDto) {
    return this.missionsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.missionsService.remove(id);
  }
}
