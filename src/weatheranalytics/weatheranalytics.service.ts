import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

interface WeatherRange {
  min: number;
  max: number;
  avg: number;
}

type WeatherRangeMap = Record<string, WeatherRange>;

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

    if (error) throw new Error('Supabase error: ' + error.message);
    if (!data || data.length < 24)
      throw new Error('Data tidak cukup untuk prediksi.');

    const temps = data.map((d) => Number(d.avg_temp));
    const indexes = data.map((_, i) => i + 1);

    const coeffs = this.safePolynomialRegression(indexes, temps, 2);
    const tomorrowX = indexes.length + 1;
    const predicted = this.predictPolynomial(coeffs, tomorrowX);
    const predictedTemp = Number(predicted.toFixed(3));

    const mining = await this.getDailyTemperatureMining(airportId);

    const ranges = mining.ranges_per_weather ?? {};

    const predictedWeather =
      Object.keys(ranges).length > 0
        ? this.inferWeatherFromTemperature(predictedTemp, ranges)
        : 'Unknown';

    return {
      airportId,
      predicted_temperature: predictedTemp,
      predicted_weather_main: predictedWeather,
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

  private inferWeatherFromTemperature(
    temp: number,
    ranges: WeatherRangeMap,
  ): string {
    let bestMatch: string = '';
    let smallestDiff = Infinity;

    for (const [weather, range] of Object.entries(ranges)) {
      const r = range as WeatherRange;

      // Langsung cocok jika dalam min/max
      if (temp >= r.min && temp <= r.max) {
        return weather;
      }

      // Cari yang paling dekat ke avg
      const diff = Math.abs(temp - r.avg);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        bestMatch = weather;
      }
    }

    return bestMatch;
  }

  async getDailyTemperatureMining(airportId: number) {
    const { data, error } = await this.supabase
      .from('weather')
      .select('temp, weather_main, data_timestamp')
      .eq('airport_id', airportId)
      .not('temp', 'is', null)
      .not('weather_main', 'is', null)
      .order('data_timestamp', { ascending: true });

    if (error) throw new Error('Gagal fetch data cuaca');
    if (!data || data.length === 0)
      return { airportId, status: 'no_data', data: [] };

    const temps = data.map((d) => d.temp);

    const cleanedTemps = this.removeOutliers(temps);

    const clusters = this.kMeans1D(cleanedTemps, 3);

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
      values.map((v) => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) /
        values.length,
    );

    const zFiltered = values.filter((v) => Math.abs((v - mean) / std) < 3);

    const sorted = [...zFiltered].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    const finalFiltered = zFiltered.filter((v) => v >= lower && v <= upper);

    return finalFiltered;
  }

  private kMeans1D(values: number[], k = 3) {
    if (values.length <= k) {
      return values.map((v) => ({ center: v, values: [v] }));
    }

    let centroids = values.sort((a, b) => a - b).slice(0, k);

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

    const result = centroids.map((c, idx) => {
      const clusterVals = values.filter((_, i) => assignments[i] === idx);
      return {
        cluster: idx,
        center: Number(c.toFixed(2)),
        min: Number(Math.min(...clusterVals).toFixed(2)),
        max: Number(Math.max(...clusterVals).toFixed(2)),
        sample_size: clusterVals.length,
      };
    });

    return result;
  }

  private groupByWeatherMain(data: { temp: number; weather_main: string }[]) {
    const grouped: Record<
      string,
      { min: number; max: number; total: number; count: number }
    > = {};

    for (const row of data) {
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
