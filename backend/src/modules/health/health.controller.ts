import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { HealthResponseDto } from './health-response.dto';

@Controller('health')
@ApiTags('Состояние')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Проверить готовность приложения и подключение PostgreSQL' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto })
  async getHealth(): Promise<HealthResponseDto> {
    try {
      await this.prisma.checkHealth();
    } catch {
      throw new ServiceUnavailableException('PostgreSQL недоступен');
    }
    return { status: 'ok' };
  }
}
