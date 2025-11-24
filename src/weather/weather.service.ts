import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

@Injectable()
export class WeatherService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  private readonly logger = new Logger(WeatherService.name);
  private pauseUntil: number | null = null;
  private apiKey = process.env.OPENWEATHER_API_KEY;

  async getWeatherForAllAirports() {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'API Key OpenWeather tidak ditemukan.',
      );
    }

    const { data: airports, error } = await this.supabase
      .from('airport_locations')
      .select('id, name, code, lat, lon');

    if (error) {
      throw new InternalServerErrorException(
        'Gagal mengambil data airport_locations.',
      );
    }

    const results = await Promise.all(
      airports.map(async (ap: any) => {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${ap.lat}&lon=${ap.lon}&appid=${this.apiKey}&units=metric`;

        try {
          const res = await axios.get(url, { timeout: 15000 });

          return {
            id: ap.id,
            name: ap.name,
            code: ap.code,
            lat: ap.lat,
            lon: ap.lon,
            weather: res.data,
          };
        } catch (err: any) {
          return {
            id: ap.id,
            name: ap.name,
            code: ap.code,
            lat: ap.lat,
            lon: ap.lon,
            weather: null,
            weather_error: err.message || 'Gagal mengambil data cuaca',
          };
        }
      }),
    );

    return {
      total_airports: airports.length,
      data: results,
    };
  }

  async fetchAndSaveWeatherForAllAirports() {
    const now = Date.now();
    if (this.pauseUntil && now < this.pauseUntil) {
      return {
        total_airports: 0,
        result: [],
        error: `Fetch dihentikan sementara karena limit OpenWeather, bisa lanjut setelah ${new Date(this.pauseUntil).toISOString()}`,
      };
    }

    if (!this.apiKey) {
      return {
        total_airports: 0,
        result: [],
        error: 'OPENWEATHER_KEY tidak ditemukan.',
      };
    }

    const { data: airports, error: airportError } = await this.supabase
      .from('airport_locations')
      .select('id, name, code, lat, lon');

    if (airportError || !airports) {
      return {
        total_airports: 0,
        result: [],
        error: 'Gagal mengambil daftar bandara.',
      };
    }

    const results: Array<{
      airport: string;
      status: 'saved' | 'failed';
      error?: string;
    }> = [];

    for (const ap of airports) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${ap.lat}&lon=${ap.lon}&appid=${this.apiKey}&units=metric`;

      try {
        const res = await axios.get(url, { timeout: 15000 });
        const w = res.data;

        const weatherRecord = {
          city_name: w.name,
          lat: w.coord?.lat ?? null,
          lon: w.coord?.lon ?? null,
          country_code: w.sys?.country ?? null,
          temp: w.main?.temp ?? null,
          feels_like: w.main?.feels_like ?? null,
          humidity: w.main?.humidity ?? null,
          pressure: w.main?.pressure ?? null,
          temp_min: w.main?.temp_min ?? null,
          temp_max: w.main?.temp_max ?? null,
          visibility: w.visibility ?? null,
          weather_main: w.weather?.[0]?.main ?? null,
          weather_description: w.weather?.[0]?.description ?? null,
          weather_icon: w.weather?.[0]?.icon ?? null,
          wind_speed: w.wind?.speed ?? null,
          wind_deg: w.wind?.deg ?? null,
          wind_gust: w.wind?.gust ?? null,
          cloud_percentage: w.clouds?.all ?? null,
          rain_1h: w.rain?.['1h'] ?? null,
          rain_3h: w.rain?.['3h'] ?? null,
          snow_1h: w.snow?.['1h'] ?? null,
          snow_3h: w.snow?.['3h'] ?? null,
          sunrise: w.sys?.sunrise
            ? new Date(w.sys.sunrise * 1000).toISOString()
            : null,
          sunset: w.sys?.sunset
            ? new Date(w.sys.sunset * 1000).toISOString()
            : null,
          timezone_offset: w.timezone ?? null,
          data_timestamp: w.dt ? new Date(w.dt * 1000).toISOString() : null,
          airport_id: ap.id,
        };

        const { error: insertError } = await this.supabase
          .from('weather')
          .insert(weatherRecord);

        if (insertError) {
          results.push({
            airport: ap.code,
            status: 'failed',
            error: insertError.message,
          });
        } else {
          results.push({ airport: ap.code, status: 'saved' });
        }
      } catch (err: any) {
        if (err.response?.status === 429) {
          this.pauseUntil = Date.now() + 60 * 60 * 1000;
          results.push({
            airport: ap.code,
            status: 'failed',
            error:
              'Rate limit OpenWeather tercapai. Fetch dihentikan sementara.',
          });
          break;
        } else {
          results.push({
            airport: ap.code,
            status: 'failed',
            error: err.message ?? 'Unknown error',
          });
        }
      }
    }

    return {
      total_airports: airports.length,
      result: results,
    };
  }

  @Cron('*/30 * * * * *') // setiap 30 detik
  async handleCron() {
    this.logger.log('Memulai fetch weather otomatis...');
    const result = await this.fetchAndSaveWeatherForAllAirports();
    this.logger.log(`Fetch selesai: ${JSON.stringify(result)}`);
  }

  /**
   *
   * untuk aggregation weather data
   */

  private getIntervalConfig(interval: string) {
    const now = new Date();

    switch (interval) {
      case 'minute':
        return {
          from: new Date(now.getTime() - 60 * 1000).toISOString(),
          trunc: 'minute',
        };
      case 'hour':
        return {
          from: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
          trunc: 'hour',
        };
      case 'day':
        return {
          from: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          trunc: 'day',
        };
      case 'month':
        return {
          from: new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          trunc: 'month',
        };
      default:
        throw new Error('Unknown interval');
    }
  }

  async aggregate(interval: 'minute' | 'hour' | 'day' | 'month') {
    const { from, trunc } = this.getIntervalConfig(interval);

    const { data, error } = await this.supabase.rpc('aggregate_weather', {
      p_from: from,
      p_trunc: trunc,
    });

    if (error) {
      this.logger.error('Aggregation error', error);
      throw error;
    } else {
      this.logger.log('Aggregate selesai dan data tersimpan.');
    }

    return data;
  }

  @Cron('*/1 * * * *') // setiap menit
  async aggregateMinute() {
    try {
      this.logger.log('Memulai aggregate per menit...');
      await this.aggregate('minute');
      this.logger.log('Aggregate per menit selesai.');
    } catch (err) {
      this.logger.error('Error saat aggregate per menit', err);
      console.error(err);
    }
  }

  @Cron('0 */1 * * *') // setiap jam
  async aggregateHour() {
    try {
      this.logger.log('Memulai aggregate per jam...');
      await this.aggregate('hour');
      this.logger.log('Aggregate per jam selesai.');
    } catch (err) {
      this.logger.error('Error saat aggregate per jam', err);
      console.error(err);
    }
  }

  @Cron('0 0 */1 * *') // setiap hari
  async aggregateDay() {
    try {
      this.logger.log('Memulai aggregate per hari...');
      await this.aggregate('day');
      this.logger.log('Aggregate per hari selesai.');
    } catch (err) {
      this.logger.error('Error saat aggregate per hari', err);
      console.error(err);
    }
  }

  @Cron('0 0 1 */1 *') // setiap bulan
  async aggregateMonth() {
    try {
      this.logger.log('Memulai aggregate per bulan...');
      await this.aggregate('month');
      this.logger.log('Aggregate per bulan selesai.');
    } catch (err) {
      this.logger.error('Error saat aggregate per bulan', err);
      console.error(err);
    }
  }

  /**
   * delete
   */
  // private getMonthRangeForDeletion() {
  //   const now = new Date();

  //   const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1);
  //   const startOfOldestMonth = new Date(fiveMonthsAgo.getFullYear(), fiveMonthsAgo.getMonth(), 1);
  //   const startOfNextMonth = new Date(fiveMonthsAgo.getFullYear(), fiveMonthsAgo.getMonth() + 1, 1);

  //   return { startOfOldestMonth, startOfNextMonth };
  // }

  // async deleteOldWeatherData() {
  //   const { startOfOldestMonth, startOfNextMonth } = this.getMonthRangeForDeletion();

  //   const { error: weatherError } = await this.supabase
  //     .from('weather')
  //     .delete()
  //     .gte('created_at', startOfOldestMonth.toISOString())
  //     .lt('created_at', startOfNextMonth.toISOString());

  //   if (weatherError) {
  //     this.logger.error('Error hapus weather:', weatherError);
  //   } else {
  //     this.logger.log(
  //       `Data weather dari ${startOfOldestMonth.toISOString()} sampai ${startOfNextMonth.toISOString()} berhasil dihapus`,
  //     );
  //   }

  //   const { error: aggError } = await this.supabase
  //     .from('weather_aggregation')
  //     .delete()
  //     .gte('interval_start', startOfOldestMonth.toISOString())
  //     .lt('interval_start', startOfNextMonth.toISOString());

  //   if (aggError) {
  //     this.logger.error('Error hapus weather_aggregation:', aggError);
  //   } else {
  //     this.logger.log(
  //       `Data weather_aggregation dari ${startOfOldestMonth.toISOString()} sampai ${startOfNextMonth.toISOString()} berhasil dihapus`,
  //     );
  //   }
  // }

  // // Cron job: dijalankan tiap tanggal 1 jam 00:00
  // @Cron('0 0 1 * *')
  // async handleMonthlyCleanup() {
  //   this.logger.log('Memulai penghapusan data lama (bulan pertama dari 5 bulan terakhir)...');
  //   await this.deleteOldWeatherData();
  //   this.logger.log('Penghapusan data lama selesai.');
  // }
}
