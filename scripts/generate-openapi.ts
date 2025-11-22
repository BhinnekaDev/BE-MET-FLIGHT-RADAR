import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';

async function generate() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const document = SwaggerModule.createDocument(app, {
    openapi: '3.1.0',
    info: {
      title: 'MET Flight Radar API',
      version: '1.0.0',
      description: 'API Documentation',
    },
  });

  const publicDir = join(__dirname, '..', 'public');
  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

  const filePath = join(publicDir, 'openapi.json');
  writeFileSync(filePath, JSON.stringify(document, null, 2));

  console.log('✅ openapi.json generated in public folder');
  await app.close();
}

void generate();
