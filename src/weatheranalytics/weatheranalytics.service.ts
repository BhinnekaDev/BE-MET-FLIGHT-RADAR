import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';

@Injectable()
export class WeatheranalyticsService {
  private readonly logger = new Logger(WeatheranalyticsService.name);

  private model: tf.LayersModel | null = null;

  private bucket = 'weather-model';
  private modelJsonPath = 'model/model.json';
  private weightsPath = 'model/weights.bin';

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

  /**
   * Muat model ML untuk prediksi cuaca
   */
  async onModuleInit() {
    this.logger.log('Checking ANN model in Supabase Storage…');

    const exists = await this.checkModelExists();

    if (exists) {
      await this.loadModelFromSupabase();
    } else {
      this.logger.warn('Model tidak ditemukan → membuat model baru…');
      await this.trainAndSaveModel();
    }
  }

  private async checkModelExists(): Promise<boolean> {
    const { data } = await this.supabase.storage
      .from(this.bucket)
      .list('model');

    if (!data) return false;

    const names = data.map((f) => f.name);
    return names.includes('model.json') && names.includes('weights.bin');
  }

  private async loadModelFromSupabase() {
    this.logger.log('📥 Downloading model files from Supabase…');

    const { data: signed } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(this.modelJsonPath, 3600);

    if (!signed?.signedUrl) {
      throw new Error('Cannot load model.json');
    }

    const loaded = await tf.loadLayersModel(signed.signedUrl);

    this.model = loaded;

    this.logger.log('✅ ANN model loaded successfully');
  }

  async trainAndSaveModel() {
    const { data, error } = await this.supabase
      .from('weather_aggregation')
      .select('avg_temp, avg_humidity, avg_pressure, avg_wind_speed')
      .eq('interval_type', 'hour')
      .order('interval_start', { ascending: true });

    if (error) throw error;
    if (!data || data.length < 30)
      throw new Error('Data training terlalu sedikit');

    const xs = tf.tensor2d(
      data.map((d) => [
        d.avg_temp / 50,
        d.avg_humidity / 100,
        d.avg_pressure / 1100,
        d.avg_wind_speed / 50,
      ]),
    );

    const ys = tf.tensor2d(data.map((d) => [d.avg_temp / 50]));

    const model = tf.sequential();
    model.add(
      tf.layers.dense({ units: 8, activation: 'relu', inputShape: [4] }),
    );
    model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
    });

    await model.fit(xs, ys, { epochs: 50 });

    // FIX PATH → TensorFlow.js only supports this form in Vercel
    const savePath = 'file:///tmp/weather_model/';
    await model.save(savePath);

    // baca file
    const jsonBuffer = fs.readFileSync('/tmp/weather_model/model.json');
    const weightsBuffer = fs.readFileSync('/tmp/weather_model/weights.bin');

    // upload ke Supabase
    await this.supabase.storage
      .from(this.bucket)
      .upload(this.modelJsonPath, jsonBuffer, {
        contentType: 'application/json',
        upsert: true,
      });

    await this.supabase.storage
      .from(this.bucket)
      .upload(this.weightsPath, weightsBuffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    this.logger.log('📤 ANN model saved to Supabase Storage successfully');

    this.model = model;
  }

  async predictTomorrow(airportId: number) {
    if (!this.model) {
      await this.loadModelFromSupabase();
      if (!this.model) {
        return { ok: false, reason: 'Model not loaded' };
      }
    }

    const { data, error } = await this.supabase
      .from('weather_aggregation')
      .select('avg_temp, avg_humidity, avg_pressure, avg_wind_speed')
      .eq('airport_id', airportId)
      .eq('interval_type', 'hour')
      .order('interval_start', { ascending: true })
      .limit(1);

    if (error) throw error;
    if (!data || !data.length) throw new Error('Data tidak ditemukan');

    const d = data[0];

    const input = tf.tensor2d([
      [
        d.avg_temp / 50,
        d.avg_humidity / 100,
        d.avg_pressure / 1100,
        d.avg_wind_speed / 50,
      ],
    ]);

    const output = this.model.predict(input) as tf.Tensor;
    const predicted = (await output.array())[0][0] * 50;

    return {
      ok: true,
      airport_id: airportId,
      predicted_temp_tomorrow: predicted,
    };
  }
}
