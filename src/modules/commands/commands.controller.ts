import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { CommandsService } from './commands.service';
import { commandCreateSchema, type CommandCreateDto } from './dto/command.schemas';

@Controller('commands')
@UseGuards(JwtAuthGuard)
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(commandCreateSchema))
  create(@Body() body: CommandCreateDto, @CurrentUser() user: { sub: string }) {
    return this.commandsService.create(body, user.sub);
  }

  @Get()
  list() {
    return this.commandsService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.commandsService.get(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.commandsService.cancel(id);
  }
}
