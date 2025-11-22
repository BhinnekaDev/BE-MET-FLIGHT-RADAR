import { join } from 'path';
import { readFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VercelRequest, VercelResponse } from '@vercel/node';
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

    cachedApp = app;
  }
  return cachedApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await bootstrap();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.getHttpAdapter().getInstance()(req, res);
}
