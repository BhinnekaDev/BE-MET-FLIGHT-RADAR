import 'dotenv/config';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { apiReference } from '@scalar/nestjs-api-reference';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const document: OpenAPIObject = SwaggerModule.createDocument(app, {
    openapi: '3.1.0',
    info: {
      title: 'MET Flight Radar API',
      version: '1.0.0',
      description: 'API Documentation',
    },
  });

  const filePath = join(__dirname, '..', 'public', 'openapi.json');
  writeFileSync(filePath, JSON.stringify(document, null, 2));

  app.use(
    '/docs',
    apiReference({
      url: '/openapi.json',
      theme: 'default',
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'public'));

  const port = process.env.PORT ? +process.env.PORT : 3000;
  await app.listen(port);
  console.log(`🚀 Server ready at http://localhost:${port}`);
  console.log(`📄 Docs available at http://localhost:${port}/docs`);
}

void bootstrap();
