import { Controller, Get } from '@nestjs/common';

const SERVICE_NAME = 'ourllet-api';

@Controller('health')
export class HealthController {
  @Get()
  check(): { ok: boolean; service: string } {
    return { ok: true, service: SERVICE_NAME };
  }
}
