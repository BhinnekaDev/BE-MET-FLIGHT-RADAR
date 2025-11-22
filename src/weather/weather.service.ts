import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { WeatherGateway } from './weather.gateway';

@Injectable()
export class WeatherService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly weatherGateway: WeatherGateway,
  ) {}

  private async fetchWeatherFromApi(lat: number, lon: number) {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Gagal mengambil data cuaca dari API: ${error.message}`,
      );
    }
  }

  async fetchAndInsertWeather(airportId: number) {
    try {
      const { data: airport, error: airportErr } = await this.supabase
        .from('airport_locations')
        .select('*')
        .eq('id', airportId)
        .single();

      if (airportErr || !airport) {
        throw new InternalServerErrorException(
          `Gagal mengambil data airport: ${airportErr?.message}`,
        );
      }

      const weather = await this.fetchWeatherFromApi(airport.lat, airport.lon);

      const insertPayload = {
        city_name: weather.name ?? null,
        lat: weather.coord?.lat ?? airport.lat,
        lon: weather.coord?.lon ?? airport.lon,
        country_code: weather.sys?.country ?? null,
        temp: weather.main?.temp ?? null,
        feels_like: weather.main?.feels_like ?? null,
        humidity: weather.main?.humidity ?? null,
        pressure: weather.main?.pressure ?? null,
        temp_min: weather.main?.temp_min ?? null,
        temp_max: weather.main?.temp_max ?? null,
        visibility: weather.visibility ?? null,
        weather_main: weather.weather?.[0]?.main ?? null,
        weather_description: weather.weather?.[0]?.description ?? null,
        weather_icon: weather.weather?.[0]?.icon ?? null,
        wind_speed: weather.wind?.speed ?? null,
        wind_deg: weather.wind?.deg ?? null,
        wind_gust: weather.wind?.gust ?? null,
        cloud_percentage: weather.clouds?.all ?? null,
        rain_1h: weather.rain?.['1h'] ?? null,
        rain_3h: weather.rain?.['3h'] ?? null,
        snow_1h: weather.snow?.['1h'] ?? null,
        snow_3h: weather.snow?.['3h'] ?? null,
        sunrise: weather.sys?.sunrise
          ? new Date(weather.sys.sunrise * 1000).toISOString()
          : null,
        sunset: weather.sys?.sunset
          ? new Date(weather.sys.sunset * 1000).toISOString()
          : null,
        timezone_offset: weather.timezone ?? null,
        data_timestamp: weather.dt
          ? new Date(weather.dt * 1000).toISOString()
          : null,
        airport_id: airportId,
      };

      const { data, error } = await this.supabase
        .from('weather')
        .insert(insertPayload)
        .select();

      if (error) {
        throw new InternalServerErrorException(
          `Gagal insert data cuaca: ${error.message}`,
        );
      }

      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Terjadi kesalahan saat proses cuaca: ${error.message}`,
      );
    }
  }

  async fetchWeatherForAllAirports() {
    try {
      const { data: airports, error: airportErr } = await this.supabase
        .from('airport_locations')
        .select('*');

      if (airportErr) {
        throw new InternalServerErrorException(
          `Gagal mengambil daftar airport: ${airportErr.message}`,
        );
      }

      if (!airports?.length) {
        return { message: 'Tidak ada airport yang tersedia' };
      }

      const results = await Promise.all(
        airports.map((airport) =>
          this.fetchAndInsertWeather(airport.id)
            .then((r) => ({
              airport_id: airport.id,
              name: airport.name,
              status: 'success',
              result: r,
            }))
            .catch((err) => ({
              airport_id: airport.id,
              name: airport.name,
              status: 'error',
              error: err.message,
            })),
        ),
      );

      this.weatherGateway.broadcastBulkUpdate({
        total_airports: airports.length,
        results,
      });

      return { total_airports: airports.length, results };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Gagal mengambil cuaca semua airport: ${error.message}`,
      );
    }
  }

  async aggregateWeather(airportId: number) {
    try {
      const now = new Date();
      const start = new Date(now.getTime() - 60 * 60 * 1000);

      const { data: rows, error: err } = await this.supabase
        .from('weather')
        .select('*')
        .eq('airport_id', airportId)
        .gte('created_at', start.toISOString())
        .lte('created_at', now.toISOString());

      if (err) {
        throw new InternalServerErrorException(
          `Gagal membaca weather untuk agregasi: ${err.message}`,
        );
      }

      if (!rows.length) return null;

      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      const aggPayload = {
        airport_id: airportId,
        interval_type: 'hourly',
        interval_start: start.toISOString(),
        avg_temp: avg(rows.map((r) => r.temp)),
        max_temp: Math.max(...rows.map((r) => r.temp)),
        min_temp: Math.min(...rows.map((r) => r.temp)),
        avg_humidity: avg(rows.map((r) => r.humidity)),
        avg_pressure: avg(rows.map((r) => r.pressure)),
        avg_wind_speed: avg(rows.map((r) => r.wind_speed)),
        max_wind_speed: Math.max(...rows.map((r) => r.wind_speed)),
        most_common_weather: this.getMostCommon(
          rows.map((r) => r.weather_main),
        ),
      };

      const { data, error } = await this.supabase
        .from('weather_aggregation')
        .insert(aggPayload)
        .select();

      if (error) {
        throw new InternalServerErrorException(
          `Gagal insert agregasi cuaca: ${error.message}`,
        );
      }

      return data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Kesalahan agregasi: ${error.message}`,
      );
    }
  }

  private getMostCommon(list: string[]): string {
    if (!list.length) return '';
    const counts: Record<string, number> = {};
    for (const item of list) counts[item] = (counts[item] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }
}
