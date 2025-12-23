import * as dotenv from 'dotenv';

dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable cookie parsing
  app.use(cookieParser());

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:5173'],
    credentials: true,
  });

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('System Design Interview Simulator API')
    .setDescription('API for the SD Interview Simulator application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Generate OpenAPI JSON file
  if (process.env.GENERATE_OPENAPI === 'true') {
    const outputPath = path.resolve(process.cwd(), '../ui/src/api/openapi.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    console.log(`OpenAPI spec generated at: ${outputPath}`);
    process.exit(0);
  }

  await app.listen(3000);
}
bootstrap();
