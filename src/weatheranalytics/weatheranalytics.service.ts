import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as tf from '@tensorflow/tfjs';

@Injectable()
export class WeatheranalyticsService {
  private readonly logger = new Logger(WeatheranalyticsService.name);

  private model: tf.LayersModel | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async getAggregatedWeather(airportId: number) {
    const intervals = ['minute', 'hour', 'day', 'month'];
    const result = {};

    for (const interval of intervals) {
      const { data, error } = await this.supabase
        .from('weather_aggregation')
        .select('*')
        .eq('airport_id', airportId)
        .eq('interval_type', interval)
        .order('interval_start', { ascending: true });

      if (error) {
        this.logger.error(`Error fetching ${interval} data`, error);
        result[interval] = { error: error.message };
      } else {
        result[interval] = data.map((row) => ({
          interval_start: row.interval_start,
          avg_temp: row.avg_temp,
          max_temp: row.max_temp,
          min_temp: row.min_temp,
          avg_humidity: row.avg_humidity,
          avg_pressure: row.avg_pressure,
          avg_wind_speed: row.avg_wind_speed,
          max_wind_speed: row.max_wind_speed,
          most_common_weather: row.most_common_weather,

          // tambahan format agar mudah dibaca
          label: this.formatLabel(interval, row.interval_start),
        }));
      }
    }

    return {
      ok: true,
      airportId,
      data: result,
    };
  }

  /**
   * Muat model ML untuk prediksi cuaca
   */

  async loadModel() {
    if (this.model) return this.model;

    try {
      await tf.setBackend('cpu');
      await tf.ready();

      const MODEL_URL = `${process.env.SUPABASE_URL}/storage/v1/object/public/weather-model/weather_model.json`;

      this.model = await tf.loadLayersModel(MODEL_URL);

      this.logger.log(
        'Weather Prediction Model Loaded Successfully (CPU backend)',
      );
      return this.model;
    } catch (err) {
      this.logger.error('Failed loading ML model', err);
      return null;
    }
  }

  formatLabel(interval: string, dateStr: string) {
    const date = new Date(dateStr);
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    switch (interval) {
      case 'minute':
        return `Menit ke-${date.getUTCMinutes()}`;
      case 'hour':
        return `Jam ke-${date.getUTCHours()}`;
      case 'day':
        return `${date.getUTCDate()} ${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
      case 'month':
        return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
      default:
        return dateStr;
    }
  }

  async getHistoricalHourlyWeather(airportId: number) {
    const { data, error } = await this.supabase
      .from('weather_aggregation')
      .select('*')
      .eq('airport_id', airportId)
      .eq('interval_type', 'hour')
      .order('interval_start', { ascending: true });

    if (error) throw error;
    return data;
  }

  prepareInput(data: any[]) {
    const last24 = data.slice(-24);

    const seq = last24.map((r) => [
      r.avg_temp ?? 0,
      r.avg_humidity ?? 0,
      r.avg_pressure ?? 0,
      r.avg_wind_speed ?? 0,
    ]);

    return tf.tensor3d([seq]); // shape: [1,24,4]
  }

  decodeWeatherClass(idx: number) {
    const labels = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm'];
    return labels[idx] ?? 'Unknown';
  }

  async predictTomorrow(airportId: number) {
    const history = await this.getHistoricalHourlyWeather(airportId);

    if (!history || history.length < 24) {
      return { ok: false, reason: 'Not enough data to predict' };
    }

    const inputTensor = this.prepareInput(history);

    const model = await this.loadModel();
    if (!model) return { ok: false, reason: 'Model not loaded' };

    const prediction = model.predict(inputTensor) as tf.Tensor;
    const output = prediction.arraySync()[0];

    return {
      airport_id: airportId,
      predicted_temp: output[0],
      predicted_humidity: output[1],
      predicted_pressure: output[2],
      predicted_wind_speed: output[3],
      predicted_weather: this.decodeWeatherClass(output[4]),
      created_at: new Date().toISOString(),
    };
  }
}
