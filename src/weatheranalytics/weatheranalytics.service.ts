import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class WeatheranalyticsService {
  private readonly logger = new Logger(WeatheranalyticsService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async getAggregatedWeather(
    airportId: number,
    filters?: {
      interval?: 'minute' | 'hour' | 'day' | 'month';
      start_date?: string;
      end_date?: string;
      year?: number;
      month?: number;
      day?: number;
      limit?: number;
      page?: number;
    },
  ) {
    const intervals = filters?.interval
      ? [filters.interval]
      : ['minute', 'hour', 'day', 'month'];

    const result = {};

    const limit = filters?.limit ?? 200;
    const page = filters?.page ?? 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    for (const interval of intervals) {
      let query = this.supabase
        .from('weather_aggregation')
        .select(
          'interval_start, avg_temp, max_temp, min_temp, avg_humidity, avg_pressure, avg_wind_speed, max_wind_speed, most_common_weather',
          { count: 'exact' },
        )
        .eq('airport_id', airportId)
        .eq('interval_type', interval);

      // Filter timestamp range
      if (filters?.start_date)
        query = query.gte('interval_start', filters.start_date);
      if (filters?.end_date)
        query = query.lte('interval_start', filters.end_date);

      // Filter per-year (cara benar)
      if (filters?.year) {
        query = query.gte('interval_start', `${filters.year}-01-01`);
        query = query.lte('interval_start', `${filters.year}-12-31`);
      }

      // Filter per-month
      if (filters?.year && filters?.month) {
        const monthStr = String(filters.month).padStart(2, '0');
        query = query.gte('interval_start', `${filters.year}-${monthStr}-01`);
        query = query.lte('interval_start', `${filters.year}-${monthStr}-31`);
      }

      // Filter per-day
      if (filters?.year && filters?.month && filters?.day) {
        const m = String(filters.month).padStart(2, '0');
        const d = String(filters.day).padStart(2, '0');
        query = query.gte('interval_start', `${filters.year}-${m}-${d} 00:00`);
        query = query.lte('interval_start', `${filters.year}-${m}-${d} 23:59`);
      }

      query = query
        .order('interval_start', { ascending: true })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        result[interval] = { error: error.message };
      } else {
        result[interval] = {
          page,
          limit,
          total: count,
          rows: data.map((row) => ({
            ...row,
            label: this.formatLabel(interval, row.interval_start),
          })),
        };
      }
    }

    return {
      ok: true,
      airportId,
      filters,
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

  async getDailyTemperatureMining(airportId: number) {
    const { data, error } = await this.supabase
      .from('weather')
      .select('temp, weather_main, data_timestamp')
      .eq('airport_id', airportId)
      .not('temp', 'is', null)
      .not('weather_main', 'is', null)
      .order('data_timestamp', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return {
        airportId,
        status: 'db_error',
        message: error.message ?? 'Gagal fetch data cuaca',
      };
    }

    if (!data || data.length === 0) {
      return { airportId, status: 'no_data', data: [] };
    }

    const temps = data
      .map((d) => d.temp)
      .filter((t) => typeof t === 'number' && !isNaN(t));

    if (temps.length === 0) {
      return { airportId, status: 'no_valid_temperature', data: [] };
    }

    const cleanedTemps = this.removeOutliers(temps);

    if (cleanedTemps.length === 0) {
      return { airportId, status: 'all_cleaned_removed', data: [] };
    }

    const clusters = this.safeKMeans(cleanedTemps, 3);

    const weatherRanges = this.groupByWeatherMain(data);

    return {
      airportId,
      total_raw: temps.length,
      total_cleaned: cleanedTemps.length,
      clusters,
      ranges_per_weather: weatherRanges,
    };
  }

  private removeOutliers(values: number[]) {
    if (values.length < 5) return values;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const std = Math.sqrt(
      values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
    );

    if (std === 0) return values;

    const zFiltered = values.filter((v) => Math.abs((v - mean) / std) < 3);

    if (zFiltered.length === 0) return values;

    const sorted = [...zFiltered].sort((a, b) => a - b);

    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    const finalFiltered = zFiltered.filter((v) => v >= lower && v <= upper);

    return finalFiltered.length > 0 ? finalFiltered : zFiltered;
  }

  private safeKMeans(values: number[], k = 3) {
    if (values.length <= k) {
      return values.map((v, i) => ({
        cluster: i,
        center: v,
        min: v,
        max: v,
        sample_size: 1,
      }));
    }

    let centroids = [...values].sort((a, b) => a - b).slice(0, k);

    let assignments = new Array(values.length).fill(0);
    let changed = true;

    while (changed) {
      changed = false;

      for (let i = 0; i < values.length; i++) {
        const dists = centroids.map((c) => Math.abs(values[i] - c));
        const clusterIndex = dists.indexOf(Math.min(...dists));
        if (assignments[i] !== clusterIndex) {
          assignments[i] = clusterIndex;
          changed = true;
        }
      }

      for (let j = 0; j < k; j++) {
        const clusterVals = values.filter((_, idx) => assignments[idx] === j);
        if (clusterVals.length > 0) {
          centroids[j] =
            clusterVals.reduce((a, b) => a + b, 0) / clusterVals.length;
        }
      }
    }

    return centroids.map((c, idx) => {
      const clusterVals = values.filter((_, i) => assignments[i] === idx);

      if (clusterVals.length === 0) {
        return {
          cluster: idx,
          center: Number(c.toFixed(2)),
          min: c,
          max: c,
          sample_size: 0,
        };
      }

      return {
        cluster: idx,
        center: Number(c.toFixed(2)),
        min: Number(Math.min(...clusterVals).toFixed(2)),
        max: Number(Math.max(...clusterVals).toFixed(2)),
        sample_size: clusterVals.length,
      };
    });
  }

  private groupByWeatherMain(data: { temp: number; weather_main: string }[]) {
    const grouped: Record<
      string,
      { min: number; max: number; total: number; count: number }
    > = {};

    for (const row of data) {
      if (!row || typeof row.temp !== 'number' || !row.weather_main) continue;

      const key = row.weather_main;

      if (!grouped[key]) {
        grouped[key] = {
          min: row.temp,
          max: row.temp,
          total: row.temp,
          count: 1,
        };
      } else {
        grouped[key].min = Math.min(grouped[key].min, row.temp);
        grouped[key].max = Math.max(grouped[key].max, row.temp);
        grouped[key].total += row.temp;
        grouped[key].count += 1;
      }
    }

    return Object.fromEntries(
      Object.entries(grouped).map(([key, val]) => [
        key,
        {
          min: Number(val.min.toFixed(2)),
          max: Number(val.max.toFixed(2)),
          avg: Number((val.total / val.count).toFixed(2)),
          count: val.count,
        },
      ]),
    );
  }
}
