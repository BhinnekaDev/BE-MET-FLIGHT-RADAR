/* eslint-disable */
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const jsonPath = join(__dirname, '../public/openapi.json');
    if (!existsSync(jsonPath)) {
      return res.status(404).json({ message: 'openapi.json not found' });
    }

    if (req.url === '/openapi.json') {
      const json = readFileSync(jsonPath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(json);
    }

    if (req.url?.startsWith('/docs')) {
      const docsPath = join(__dirname, '../public', req.url);
      if (existsSync(docsPath)) {
        const html = readFileSync(docsPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
      }
    }

    res.status(404).send('Not Found');
  } catch (err: any) {
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: err.message });
  }
}
