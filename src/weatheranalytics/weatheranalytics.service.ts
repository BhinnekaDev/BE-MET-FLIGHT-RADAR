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
      .from('weather_aggregation')
      .select('avg_temp, interval_start')
      .eq('airport_id', airportId)
      .order('interval_start', { ascending: true });

    if (error) {
      throw new Error('Supabase error: ' + error.message);
    }

    if (!data || data.length < 24) {
      throw new Error('Data tidak cukup untuk prediksi.');
    }

    const temps = data.map((d) => Number(d.avg_temp));
    const indexes = data.map((_, i) => i + 1);

    const coeffs = this.safePolynomialRegression(indexes, temps, 2);
    const tomorrowX = indexes.length + 1;
    const predicted = this.predictPolynomial(coeffs, tomorrowX);

    return {
      airportId,
      predicted_temperature: Number(predicted.toFixed(3)),
      model: 'polynomial_regression_degree_2',
      coefficients: coeffs,
      data_points: data.length,
    };
  }

  public safePolynomialRegression(
    data: number[],
    target: number[],
    degree = 2,
  ): number[] {
    const X: number[][] = [];

    for (const v of data) {
      const row: number[] = [];
      for (let p = 0; p <= degree; p++) row.push(Math.pow(v, p));
      X.push(row);
    }

    const XT = this.transpose(X); // number[][]
    const XTX = this.multiply(XT, X); // number[][]
    const XTy = this.multiplyVec(XT, target); // number[]

    return this.solveGaussianSafe(XTX, XTy); // number[]
  }

  private predictPolynomial(coeffs: number[], x: number) {
    return coeffs.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0);
  }

  private solveGaussianSafe(A: number[][], b: number[]): number[] {
    const n = A.length;
    const M = A.map((row) => [...row]);
    const x = [...b];

    for (let i = 0; i < n; i++) {
      let maxRow = i;

      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
          maxRow = k;
        }
      }

      [M[i], M[maxRow]] = [M[maxRow], M[i]];
      [x[i], x[maxRow]] = [x[maxRow], x[i]];

      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];

        for (let j = i; j < n; j++) {
          M[k][j] -= factor * M[i][j];
        }
        x[k] -= factor * x[i];
      }
    }

    const result = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = x[i];
      for (let j = i + 1; j < n; j++) sum -= M[i][j] * result[j];
      result[i] = sum / M[i][i];
    }

    return result;
  }

  private transpose(A: number[][]): number[][] {
    return A[0].map((_, colIndex) => A.map((row) => row[colIndex]));
  }

  private multiply(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];

    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < B.length; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }

    return result;
  }

  private multiplyVec(A: number[][], v: number[]): number[] {
    const result: number[] = [];

    for (let i = 0; i < A.length; i++) {
      let sum = 0;
      for (let j = 0; j < v.length; j++) {
        sum += A[i][j] * v[j];
      }
      result[i] = sum;
    }

    return result;
  }
}
