import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
