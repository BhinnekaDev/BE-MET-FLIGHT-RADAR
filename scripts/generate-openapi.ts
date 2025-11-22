import { join } from 'path';
import { writeFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

async function generateOpenApi() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });

  const document: OpenAPIObject = SwaggerModule.createDocument(app, {
    openapi: '3.1.0',
    info: { title: 'MET Flight Radar API', version: '1.0.0' },
  });

  const outputPath = join(__dirname, '..', 'public', 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI document generated at ${outputPath}`);

  await app.close();
}

void generateOpenApi().catch((err) => {
  console.error('❌ Failed to generate OpenAPI document:', err);
  process.exit(1);
});
