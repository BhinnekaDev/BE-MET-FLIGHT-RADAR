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

  async getOpenSkyData() {
    const lamin = -11;
    const lomin = 94;
    const lamax = 6;
    const lomax = 141;

    const url = `https://opensky.p.rapidapi.com/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
          'x-rapidapi-host': 'opensky.p.rapidapi.com',
        },
        timeout: 15000,
      });

      return response.data;
    } catch (err: any) {
      console.error('RapidAPI Error:', err.message);
      throw new InternalServerErrorException(
        'Gagal mengambil data dari OpenSky (RapidAPI)',
      );
    }
  }
}
