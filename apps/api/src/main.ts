import { API_PREFIX, DEV_USER_EMAIL_HEADER } from '@aionos/shared';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { type AppConfigService } from './config/app-config.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfigService>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const builder = new DocumentBuilder()
      .setTitle('AIonOS Work Tracker API')
      .setDescription('Response and request types are defined in packages/shared.')
      .setVersion('1')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'entra')
      .addSecurityRequirements('entra');
    if (config.get('AUTH_DEV_BYPASS', { infer: true })) {
      builder
        .addApiKey({ type: 'apiKey', in: 'header', name: DEV_USER_EMAIL_HEADER }, 'dev-email')
        .addSecurityRequirements('dev-email');
    }
    const document = SwaggerModule.createDocument(app, builder.build());
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}${API_PREFIX}`, 'Bootstrap');
}

await bootstrap();
