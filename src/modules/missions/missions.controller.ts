import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes } from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
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
  @UseGuards(PermissionsGuard)
  @Permissions('missions.configure')
  @UsePipes(new ZodValidationPipe(missionSchema))
  create(@Body() body: MissionDto) {
    return this.missionsService.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.missionsService.get(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('missions.configure')
  @UsePipes(new ZodValidationPipe(missionSchema))
  update(@Param('id') id: string, @Body() body: MissionDto) {
    return this.missionsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('missions.configure')
  remove(@Param('id') id: string) {
    return this.missionsService.remove(id);
  }
}
