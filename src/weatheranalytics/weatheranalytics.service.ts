import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class WeatheranalyticsService {
  private readonly logger = new Logger(WeatheranalyticsService.name);

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

  async predictTomorrow(airportId: number) {
    const { data, error } = await this.supabase
      .from('weather')
      .select('temperature, timestamp')
      .eq('airport_id', airportId)
      .order('timestamp', { ascending: true });

    if (error) throw new Error('Gagal mengambil data cuaca');
    if (!data || data.length < 24)
      throw new Error('Data cuaca tidak cukup untuk prediksi');

    const temps: number[] = [];
    const indexes: number[] = [];

    for (let i = 0; i < data.length; i++) {
      temps.push(data[i].temperature);
      indexes.push(i + 1);
    }

    const coeffs = this.polynomialRegression(indexes, temps, 2);

    const tomorrowIndex = indexes.length + 1;
    const predictedTemp = this.predictPolynomial(coeffs, tomorrowIndex);

    return {
      airportId,
      predicted_temperature: predictedTemp,
      days_used: indexes.length,
      model_coefficients: coeffs,
    };
  }

  private polynomialRegression(data: number[], target: number[], degree = 2) {
    const X: number[][] = [];

    for (const value of data) {
      const row: number[] = [];

      for (let p = 0; p <= degree; p++) {
        row.push(Math.pow(value, p));
      }

      X.push(row);
    }

    const XT = this.transpose(X);
    const XTX = this.multiply(XT, X);
    const XTy = this.multiplyVec(XT, target);

    return this.solveGaussian(XTX, XTy);
  }

  private predictPolynomial(coeffs: number[], x: number) {
    return coeffs.reduce((sum, c, idx) => sum + c * Math.pow(x, idx), 0);
  }

  private transpose(m: number[][]) {
    return m[0].map((_, i) => m.map((row) => row[i]));
  }

  private multiply(A: number[][], B: number[][]) {
    return A.map((row) =>
      B[0].map((_, j) => row.reduce((sum, _, k) => sum + row[k] * B[k][j], 0)),
    );
  }

  private multiplyVec(A: number[][], v: number[]) {
    return A.map((row) => row.reduce((sum, _, k) => sum + row[k] * v[k], 0));
  }

  private solveGaussian(A: number[][], b: number[]) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
          maxRow = k;
        }
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]];

      const pivot = M[i][i];
      for (let j = i; j < n + 1; j++) M[i][j] /= pivot;

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = M[k][i];
          for (let j = i; j < n + 1; j++) {
            M[k][j] -= factor * M[i][j];
          }
        }
      }
    }

    return M.map((row) => row[n]);
  }
}
