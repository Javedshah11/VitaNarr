import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

interface ApiHealthResponse {
  status: 'ok';
  service: 'vitanarr-api';
}

@ApiTags('System')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({
    schema: { example: { status: 'ok', service: 'vitanarr-api' } },
  })
  getHealth(): ApiHealthResponse {
    return { status: 'ok', service: 'vitanarr-api' };
  }
}
