import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class LocationsService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  private readonly logger = new Logger(LocationsService.name);

  async getAllAirportLocations() {
    try {
      const { data, error } = await this.supabase
        .from('airport_locations')
        .select('*');

      if (error) {
        this.logger.error('Error fetching airport_locations', error);
        throw new InternalServerErrorException(
          'Gagal mengambil data airport locations',
        );
      }

      return data;
    } catch (err) {
      this.logger.error('Unexpected error in getAllAirportLocations', err);
      throw new InternalServerErrorException('Terjadi kesalahan server');
    }
  }

  async getAllBMKGRadarSites() {
    try {
      const { data, error } = await this.supabase
        .from('bmkg_radar_sites')
        .select('*');

      if (error) {
        this.logger.error('Error fetching bmkg_radar_sites', error);
        throw new InternalServerErrorException(
          'Gagal mengambil data BMKG radar sites',
        );
      }

      return data;
    } catch (err) {
      this.logger.error('Unexpected error in getAllBMKGRadarSites', err);
      throw new InternalServerErrorException('Terjadi kesalahan server');
    }
  }
}
