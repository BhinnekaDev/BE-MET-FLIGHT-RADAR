import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

@Injectable()
export class AircraftService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async getOpenSkyData(params?: {
    lamin?: number;
    lomin?: number;
    lamax?: number;
    lomax?: number;
  }) {
    const { lamin = -11, lomin = 94, lamax = 6, lomax = 141 } = params ?? {};

    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    const axiosConfig = {
      timeout: 20000,
    };

    const tryAxios = async (): Promise<any> => {
      let attempt = 0;
      const maxAttempts = 2;

      while (attempt < maxAttempts) {
        try {
          return await axios.get(url, axiosConfig);
        } catch (err) {
          attempt++;
          console.warn(`OpenSky attempt ${attempt} failed, retrying...`);

          await new Promise((res) => setTimeout(res, 1000));

          if (attempt >= maxAttempts) throw err;
        }
      }

      throw new Error('Failed to fetch OpenSky data via axios after retries');
    };

    try {
      try {
        const response = await tryAxios();
        return response.data;
      } catch (axiosErr) {
        console.warn('Axios gagal total. Mencoba fallback fetch...');
      }

      const fetchResponse = await fetch(url, { method: 'GET' });
      if (!fetchResponse.ok) {
        throw new Error(`Fetch error: ${fetchResponse.statusText}`);
      }

      return await fetchResponse.json();
    } catch (err: any) {
      console.error('OpenSky Error:', err.message);
      throw new InternalServerErrorException(
        'Gagal mengambil data dari OpenSky API',
      );
    }
  }
}
