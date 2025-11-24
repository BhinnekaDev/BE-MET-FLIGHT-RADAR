import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class WeatheranalyticsService {
  private readonly logger = new Logger(WeatheranalyticsService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async getDataByInterval(
    interval: 'minute' | 'hour' | 'day' | 'month',
    airportId?: number,
  ) {
    try {
      let query = this.supabase
        .from('weather_aggregation')
        .select('*')
        .eq('interval_type', interval);

      if (airportId) {
        query = query.eq('airport_id', airportId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error(
          `Gagal mengambil data weather_aggregation: ${error.message}`,
        );
        return [];
      }

      return data;
    } catch (err) {
      this.logger.error('Error saat getDataByInterval', err);
      return [];
    }
  }

  calculateStatistics(data: any[]) {
    if (!data || data.length === 0) return null;

    const stats = {
      avgTemp: 0,
      maxTemp: Number.NEGATIVE_INFINITY,
      minTemp: Number.POSITIVE_INFINITY,
      avgHumidity: 0,
      avgPressure: 0,
      avgWindSpeed: 0,
      maxWindSpeed: Number.NEGATIVE_INFINITY,
      weatherDistribution: {} as Record<string, number>,
      count: data.length,
    };

    data.forEach((row) => {
      stats.avgTemp += parseFloat(row.avg_temp ?? 0);
      stats.maxTemp = Math.max(stats.maxTemp, parseFloat(row.max_temp ?? 0));
      stats.minTemp = Math.min(stats.minTemp, parseFloat(row.min_temp ?? 0));

      stats.avgHumidity += parseFloat(row.avg_humidity ?? 0);
      stats.avgPressure += parseFloat(row.avg_pressure ?? 0);
      stats.avgWindSpeed += parseFloat(row.avg_wind_speed ?? 0);
      stats.maxWindSpeed = Math.max(
        stats.maxWindSpeed,
        parseFloat(row.max_wind_speed ?? 0),
      );

      const weather = row.most_common_weather ?? 'Unknown';
      stats.weatherDistribution[weather] =
        (stats.weatherDistribution[weather] ?? 0) + 1;
    });

    // Rata-rata
    stats.avgTemp /= stats.count;
    stats.avgHumidity /= stats.count;
    stats.avgPressure /= stats.count;
    stats.avgWindSpeed /= stats.count;

    return stats;
  }

  async getWeatherStats(
    interval: 'minute' | 'hour' | 'day' | 'month',
    airportId?: number,
  ) {
    const data = await this.getDataByInterval(interval, airportId);
    return this.calculateStatistics(data);
  }

  async getTimeSeries(
    interval: 'minute' | 'hour' | 'day' | 'month',
    airportId?: number,
    limit = 100,
  ) {
    try {
      let query = this.supabase
        .from('weather_aggregation')
        .select(
          'interval_start, avg_temp, avg_humidity, avg_pressure, avg_wind_speed',
        )
        .eq('interval_type', interval)
        .order('interval_start', { ascending: true })
        .limit(limit);

      if (airportId) query = query.eq('airport_id', airportId);

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Gagal mengambil time-series: ${error.message}`);
        return [];
      }

      return data;
    } catch (err) {
      this.logger.error('Error saat getTimeSeries', err);
      return [];
    }
  }

  async predictNextDayWeather(airportId: number) {
    // Ambil 24 jam terakhir (per jam) untuk bandara
    const { data, error } = await this.supabase
      .from('weather_aggregation')
      .select('*')
      .eq('airport_id', airportId)
      .eq('interval_type', 'hour')
      .order('interval_start', { ascending: true })
      .limit(24);

    if (error || !data || data.length === 0) {
      this.logger.error(`Tidak ada data untuk prediksi bandara ${airportId}`);
      return null;
    }

    // Weighted average
    let weightSum = 0;
    let weightedTemp = 0;
    let weightedHumidity = 0;
    let weightedWind = 0;
    const weatherWeights: Record<string, number> = {};

    data.forEach((row, idx) => {
      const weight = Math.pow(0.5, data.length - 1 - idx); // data terbaru lebih penting
      weightSum += weight;
      weightedTemp += parseFloat(row.avg_temp ?? 0) * weight;
      weightedHumidity += parseFloat(row.avg_humidity ?? 0) * weight;
      weightedWind += parseFloat(row.avg_wind_speed ?? 0) * weight;

      const weather = row.most_common_weather ?? 'Unknown';
      weatherWeights[weather] = (weatherWeights[weather] ?? 0) + weight;
    });

    // Weighted mode untuk cuaca kategorikal
    const predictedWeather = Object.entries(weatherWeights).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    )[0];

    return {
      airportId,
      predicted_temp: weightedTemp / weightSum,
      predicted_humidity: weightedHumidity / weightSum,
      predicted_wind_speed: weightedWind / weightSum,
      predicted_weather: predictedWeather,
    };
  }
}
