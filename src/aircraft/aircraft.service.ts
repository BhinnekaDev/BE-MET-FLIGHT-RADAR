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

  async getOpenSkyData(params: {
    lamin?: number;
    lomin?: number;
    lamax?: number;
    lomax?: number;
  }) {
    // bounding box default wilayah Indonesia
    const { lamin = -11, lomin = 94, lamax = 6, lomax = 141 } = params;

    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

    try {
      const response = await axios.get(url, {
        timeout: 10000,
      });

      return response.data;
    } catch (err: any) {
      console.error('OpenSky Error:', err.message);
      throw new InternalServerErrorException(
        'Gagal mengambil data dari OpenSky API',
      );
    }
  }
}
