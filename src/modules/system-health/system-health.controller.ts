import { Controller, Get } from '@nestjs/common';

@Controller()
export class SystemHealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'gungnir-back',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  metrics() {
    return {
      uptimeSeconds: process.uptime(),
      memoryRss: process.memoryUsage().rss,
      timestamp: new Date().toISOString(),
    };
  }
}
