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

  async getAllAirportLocations(filters?: { name?: string; code?: string }) {
    try {
      let query = this.supabase.from('airport_locations').select('*');

      if (filters?.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }

      if (filters?.code) {
        query = query.ilike('code', `%${filters.code}%`);
      }

      const { data, error } = await query;

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

  async getAllBMKGRadarSites(filters?: { name?: string; code?: string }) {
    try {
      let query = this.supabase.from('bmkg_radar_sites').select('*');

      if (filters?.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }
      if (filters?.code) {
        query = query.ilike('code', `%${filters.code}%`);
      }
      const { data, error } = await query;
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

  async getAllBengkuluLocations(filters?: {
    id?: number;
    city_name?: string;
    code?: string;
  }) {
    try {
      let query = this.supabase.from('bengkulu_locations').select('*');

      if (filters?.id) {
        query = query.eq('id', filters.id);
      }
      if (filters?.city_name) {
        query = query.ilike('city_name', `%${filters.city_name}%`);
      }
      const { data, error } = await query;

      if (error) {
        this.logger.error('Error fetching bengkulu_locations', error);
        throw new InternalServerErrorException(
          'Gagal mengambil data bengkulu locations',
        );
      }
      return data;
    } catch (err) {
      this.logger.error('Unexpected error in getAllBengkuluLocations', err);
      throw new InternalServerErrorException('Terjadi kesalahan server');
    }
  }
}
