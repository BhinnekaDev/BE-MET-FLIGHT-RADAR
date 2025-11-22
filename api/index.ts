/* eslint-disable */
import { NestFactory } from '@nestjs/core';
import { extname, resolve, join } from 'path';
import { AppModule } from '../src/app.module';
import { readFileSync, existsSync, statSync } from 'fs';
import { VercelRequest, VercelResponse } from '@vercel/node';

let cachedApp: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const reqUrl = req.url || '/';

    if (reqUrl === '/openapi.json') {
      const jsonPath = resolve(__dirname, '../public/openapi.json');
      if (!existsSync(jsonPath)) {
        return res.status(404).json({ message: 'openapi.json not found' });
      }
      const json = readFileSync(jsonPath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(json);
    }

    if (reqUrl.startsWith('/docs')) {
      let docsPath = resolve(__dirname, '../public', reqUrl);
      if (existsSync(docsPath)) {
        const stats = statSync(docsPath);
        if (stats.isDirectory()) {
          docsPath = join(docsPath, 'index.html');
        }

        if (existsSync(docsPath)) {
          const ext = extname(docsPath).toLowerCase();
          let contentType = 'text/html';
          if (ext === '.css') contentType = 'text/css';
          else if (ext === '.js') contentType = 'application/javascript';
          else if (ext === '.json') contentType = 'application/json';
          else if (ext === '.png') contentType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg')
            contentType = 'image/jpeg';
          else if (ext === '.svg') contentType = 'image/svg+xml';
          else if (ext === '.ico') contentType = 'image/x-icon';

          const content = readFileSync(docsPath);
          res.setHeader('Content-Type', contentType);
          return res.status(200).send(content);
        }
      }
      return res.status(404).send('Docs Not Found');
    }

    if (!cachedApp) {
      cachedApp = await NestFactory.create(AppModule, { logger: false });
      await cachedApp.init();
    }

    const httpAdapter = cachedApp.getHttpAdapter().getInstance();
    httpAdapter(req, res);
  } catch (err: any) {
    console.error('Server error:', err);
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: err.message });
  }
}
