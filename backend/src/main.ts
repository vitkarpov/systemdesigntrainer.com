import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from backend/.env file
dotenv.config({ path: resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// backend/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:5173'],
    credentials: true,
  });
  await app.listen(3000);
}
bootstrap();
