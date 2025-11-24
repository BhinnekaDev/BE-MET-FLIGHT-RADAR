import {
  Inject,
  Injectable,
  InternalServerErrorException,
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
          results.push({
            airport: ap.code,
            status: 'saved',
          });
        }
      } catch (err: any) {
        results.push({
          airport: ap.code,
          status: 'failed',
          error: err.message ?? 'Unknown error',
        });
      }
    }

    return {
      total_airports: airports.length,
      result: results,
    };
  }

  // memanggil getWeatherForAllAirports tapi tidak melempar error jika gagal menyimpan
  async getWeatherRealtimeAndSaveHidden() {
    let silentErrors: Array<{ airport: string; error: string }> = [];

    await this.fetchAndSaveWeatherForAllAirports()
      .then((res) => {
        const result: Array<{
          airport: string;
          status: 'saved' | 'failed';
          error?: string;
        }> = res.result;
        silentErrors = result
          .filter((r) => r.status === 'failed')
          .map((r) => ({
            airport: r.airport,
            error: r.error ?? 'Unknown error',
          }));
      })
      .catch((err) => {
        silentErrors.push({
          airport: 'all',
          error: err.message || 'Unknown error',
        });
      });

    const realtimeData = await this.getWeatherForAllAirports();

    return {
      ...realtimeData,
      silent_errors: silentErrors,
    };
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
      console.error('Aggregation error:', error);
      throw error;
    }

    return data;
  }

  @Cron('*/1 * * * *') // setiap menit
  async aggregateMinute() {
    await this.aggregate('minute');
  }
  @Cron('0 */1 * * *') // setiap jam
  async aggregateHour() {
    await this.aggregate('hour');
  }

  @Cron('0 0 */1 * *') // setiap hari
  async aggregateDay() {
    await this.aggregate('day');
  }

  @Cron('0 0 1 */1 *') // setiap bulan
  async aggregateMonth() {
    await this.aggregate('month');
  }
}
