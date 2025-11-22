import { join } from 'path';
import { writeFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

void (async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const document: OpenAPIObject = SwaggerModule.createDocument(app, {
    openapi: '3.1.0',
    info: { title: 'MET Flight Radar API', version: '1.0.0' },
  });

  writeFileSync(
    join(__dirname, '..', 'public/openapi.json'),
    JSON.stringify(document, null, 2),
  );
  await app.close();
})();
