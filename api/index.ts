import express from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { createServer, proxy } from 'aws-serverless-express';
import { NestExpressApplication } from '@nestjs/platform-express';

let cachedServer: any;

async function bootstrapServer() {
  const expressApp = express();

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.useStaticAssets('public');
  await app.init();
  return createServer(expressApp);
}

export default async function handler(req, res) {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return proxy(cachedServer, req, res, 'PROMISE').promise;
}
