import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

@Injectable()
export class AircraftService {
  private cache: any[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 30 * 1000;

  private readonly lamin = -12;
  private readonly lamax = 7;
  private readonly lomin = 94;
  private readonly lomax = 142;

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async fetchAircraftData(): Promise<any[]> {
    const now = Date.now();

    if (this.cache && now - this.lastFetchTime < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      const url = `https://opensky-network.org/api/states/all?lamin=${this.lamin}&lomin=${this.lomin}&lamax=${this.lamax}&lomax=${this.lomax}`;

      const response = await axios.get(url);
      const states = response.data.states || [];

      this.cache = states;
      this.lastFetchTime = now;

      await this.insertToDatabase(states);

      return states;
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal fetch data pesawat: ${error.message}`,
      );
    }
  }

  private async insertToDatabase(states: any[]) {
    for (const state of states) {
      const [
        icao24,
        callsign,
        origin_country,
        longitude,
        latitude,
        altitude, // ignore
        ,
        velocity, // kecepatan
        heading, // arah
        ,
        // ignore
        timestamp,
      ] = state;

      const { error } = await this.supabase.from('aircraft').insert({
        icao24,
        callsign,
        negara_asal: origin_country,
        longitude,
        latitude,
        altitude,
        kecepatan: velocity,
        arah: heading,
        data_timestamp: new Date(timestamp * 1000),
      });

      if (error) {
        Logger.error(`Insert gagal: ${error.message}`);
      }
    }
  }
}
