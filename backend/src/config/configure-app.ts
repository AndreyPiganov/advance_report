import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ContractInputDto, PaymentInputDto, WorkInputDto } from '../common/dto/accounting-input.dto';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  const config = new DocumentBuilder()
    .setTitle('Учёт договоров и выплат')
    .setDescription('Отчёт на дату и импорт CSV в PostgreSQL. Суммы в ответах передаются строками в рублях.')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ContractInputDto, WorkInputDto, PaymentInputDto],
  });
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: '/api/docs-json' });
}
