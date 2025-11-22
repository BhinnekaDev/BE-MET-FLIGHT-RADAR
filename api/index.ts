import { join } from 'path';
import { readFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestExpressApplication } from '@nestjs/platform-express';

let cachedApp: NestExpressApplication;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: false,
    });

    app.useStaticAssets(join(__dirname, '..', 'public'));
    app.use('/openapi.json', (req, res) => {
      const json = readFileSync(
        join(__dirname, '..', 'public/openapi.json'),
        'utf-8',
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      res.type('json').send(json);
    });

    app.use('/docs', apiReference({ url: '/openapi.json', theme: 'default' }));

    await app.init();
    cachedApp = app;
  }
  return cachedApp;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await bootstrap();
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp(req, res);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: err?.message || err });
  }
}
