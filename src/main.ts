import { join } from 'path';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();

  app.use('/docs', apiReference({ theme: 'default' }));

  app.useStaticAssets(join(__dirname, '..', 'public'));

  const port = process.env.PORT ? +process.env.PORT : 3000;
  await app.listen(port);

  console.log(`🚀 Server ready: http://localhost:${port}`);
  console.log(`📄 API Docs: http://localhost:${port}/docs`);
}

void bootstrap();
