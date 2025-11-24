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

    return new Promise((resolve, reject) => {
      const request = https.get(
        url,
        {
          timeout: 30000, // 30 detik, lebih tahan timeout
          agent: new https.Agent({ keepAlive: true }),
        },
        (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(
                new InternalServerErrorException(
                  'Gagal parsing JSON dari OpenSky.',
                ),
              );
            }
          });
        },
      );

      request.on('error', (err) => {
        console.error('HTTPS Error:', err.message);
        reject(
          new InternalServerErrorException(
            'Gagal mengambil data dari OpenSky.',
          ),
        );
      });

      request.on('timeout', () => {
        request.destroy();
        console.error('HTTPS Timeout');
        reject(
          new InternalServerErrorException(
            'Timeout saat menghubungi OpenSky API',
          ),
        );
      });
    });
  }
}
