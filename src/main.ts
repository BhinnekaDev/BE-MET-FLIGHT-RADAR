import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { apiReference } from '@scalar/nestjs-api-reference';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.use('/docs', apiReference({ theme: 'default' }));

  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.useStaticAssets(join(__dirname, '..', 'public'));

  const port = process.env.PORT ? +process.env.PORT : 3000;
  await app.listen(port);

  console.log(`🚀 Server ready: http://localhost:${port}`);
  console.log(`📄 API Docs: http://localhost:${port}/docs`);
}

void bootstrap();
