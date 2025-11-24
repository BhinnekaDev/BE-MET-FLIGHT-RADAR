import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as https from 'https';

@Injectable()
export class AircraftService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async getOpenSkyData() {
    const lamin = -11;
    const lomin = 94;
    const lamax = 6;
    const lomax = 141;

    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    const username = process.env.OPENSKY_USER;
    const password = process.env.OPENSKY_PASS;

    // Basic Auth
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          timeout: 20000,
          headers: {
            Authorization: `Basic ${auth}`,
          },
          agent: new https.Agent({ keepAlive: true }),
        },
        (res) => {
          let rawData = '';

          res.on('data', (chunk) => {
            rawData += chunk;
          });

          res.on('end', () => {
            try {
              const parsed = JSON.parse(rawData);
              resolve(parsed);
            } catch (err) {
              console.error('Parse Error:', err);
              reject(
                new InternalServerErrorException(
                  'Gagal parsing JSON dari OpenSky.',
                ),
              );
            }
          });
        },
      );

      req.on('error', (err) => {
        console.error('OpenSky HTTPS Error:', err.message);
        reject(
          new InternalServerErrorException('Gagal menghubungi OpenSky (auth).'),
        );
      });

      req.on('timeout', () => {
        req.destroy();
        console.error('OpenSky Timeout');
        reject(
          new InternalServerErrorException(
            'Timeout saat menghubungi OpenSky (auth).',
          ),
        );
      });
    });
  }
}
