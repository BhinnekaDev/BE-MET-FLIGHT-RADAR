import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ClusterResult, WeatherMiningResult, WeatherRange } from './types';

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

  async predictTomorrow(airportId: number): Promise<{
    airportId: number;
    predicted_temperature: number;
    predicted_weather_main: string;
    matched_range: WeatherRange | null;
    model: string;
    coefficients: number[];
    data_points: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('weather_aggregation')
        .select('avg_temp, interval_start')
        .eq('airport_id', airportId)
        .order('interval_start', { ascending: true });

      if (error) {
        this.logger.error('Supabase query error:', error);
        throw new Error('Gagal mengambil data suhu.');
      }

      if (!data || data.length < 24) {
        throw new Error('Data tidak cukup untuk prediksi.');
      }

      const temps = data.map((d) => Number(d.avg_temp));
      const indexes = data.map((_, i) => i + 1);

      // regression guarded
      let coeffs: number[];
      try {
        coeffs = this.safePolynomialRegression(indexes, temps, 2);
      } catch (regErr) {
        this.logger.error('Regression failed:', regErr);
        throw new Error(
          'Tidak dapat melakukan regresi polynomial (matrix singular).',
        );
      }

      const tomorrowX = indexes.length + 1;
      const predictedTemp = Number(
        this.predictPolynomial(coeffs, tomorrowX).toFixed(3),
      );

      // mining
      let mining: WeatherMiningResult;
      try {
        mining = (await this.getDailyTemperatureMining(
          airportId,
        )) as WeatherMiningResult;
      } catch (miningErr) {
        this.logger.error('Mining error:', miningErr);
        throw new Error('Gagal mengambil data mining.');
      }

      const ranges = mining?.ranges_per_weather ?? {};
      const match = this.matchPredictedWeather(predictedTemp, ranges);

      return {
        airportId,
        predicted_temperature: predictedTemp,
        predicted_weather_main: match.weather,
        matched_range: match.detail,
        model: 'polynomial_regression_degree_2',
        coefficients: coeffs,
        data_points: data.length,
      };
    } catch (err) {
      this.logger.error('Prediction error:', err);
      throw new InternalServerErrorException(err.message);
    }
  }

  private predictPolynomial(coeffs: number[], x: number) {
    return coeffs.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0);
  }

  private safePolynomialRegression(x: number[], y: number[], degree: number) {
    const X = x.map((xi) =>
      Array.from({ length: degree + 1 }, (_, k) => Math.pow(xi, k)),
    );

    const XT = this.transpose(X);
    const XTX = this.multiply(XT, X);
    const XTy = this.multiplyVec(XT, y);

    return this.solveGaussianSafe(XTX, XTy);
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
      for (let j = i + 1; j < n; j++) {
        sum -= M[i][j] * result[j];
      }
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
    return A.map((row) => row.reduce((sum, val, i) => sum + val * v[i], 0));
  }

  private matchPredictedWeather(
    predictedTemp: number,
    ranges: Record<string, WeatherRange>,
  ) {
    type Candidate = {
      weather: string;
      rangeWidth: number;
      detail: WeatherRange;
    };

    const candidates: Candidate[] = [];

    for (const [weather, r] of Object.entries(ranges)) {
      if (predictedTemp >= r.min && predictedTemp <= r.max) {
        candidates.push({
          weather,
          rangeWidth: r.max - r.min,
          detail: r,
        });
      }
    }

    if (candidates.length === 0) {
      return {
        weather: 'Unknown',
        detail: null as WeatherRange | null,
      };
    }

    candidates.sort((a, b) => a.rangeWidth - b.rangeWidth);

    return {
      weather: candidates[0].weather,
      detail: candidates[0].detail,
    };
  }

  async getDailyTemperatureMining(airportId: number): Promise<
    | WeatherMiningResult
    | {
        airportId: number;
        status: string;
        data: any[];
        ranges_per_weather: Record<string, WeatherRange>;
        clusters: ClusterResult[];
      }
  > {
    try {
      const { data, error } = await this.supabase
        .from('weather')
        .select('temp, weather_main, data_timestamp')
        .eq('airport_id', airportId)
        .not('temp', 'is', null)
        .not('weather_main', 'is', null)
        .order('data_timestamp', { ascending: true });

      if (error) {
        this.logger.error('Supabase error:', error);
        throw new Error('Gagal fetch data cuaca');
      }

      if (!data || data.length === 0) {
        return {
          airportId,
          status: 'no_data',
          data: [],
          ranges_per_weather: {} as Record<string, WeatherRange>,
          clusters: [] as ClusterResult[],
        };
      }

      const temps = data.map((d) => d.temp);

      let cleanedTemps: number[] = [];
      try {
        cleanedTemps = this.removeOutliersSafe(temps);
      } catch (e) {
        this.logger.error('removeOutliersSafe error:', e);
        cleanedTemps = temps;
      }

      let clusters: ClusterResult[] = [];
      try {
        clusters = this.kMeans1DSafe(cleanedTemps, 3);
      } catch (e) {
        this.logger.error('kMeans error:', e);
      }

      let ranges: Record<string, WeatherRange> = {};
      try {
        ranges = this.groupByWeatherMainSafe(data);
      } catch (e) {
        this.logger.error('groupByWeatherMainSafe error:', e);
      }

      return {
        airportId,
        total_raw: temps.length,
        total_cleaned: cleanedTemps.length,
        clusters,
        ranges_per_weather: ranges,
      };
    } catch (err) {
      this.logger.error('getDailyTemperatureMining fatal error:', err);
      throw new Error('Gagal mengambil data mining.');
    }
  }

  private removeOutliersSafe(values: number[]) {
    if (values.length < 5) return values;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    if (std === 0) {
      return values; // <-- semua suhu sama → tidak bisa dihitung outlier
    }

    const zFiltered = values.filter((v) => Math.abs((v - mean) / std) < 3);

    if (zFiltered.length < 3) return zFiltered;

    const sorted = [...zFiltered].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    if (iqr === 0) return zFiltered; // <-- data sangat mirip

    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    return zFiltered.filter((v) => v >= lower && v <= upper);
  }

  private kMeans1DSafe(values: number[], k = 3) {
    if (values.length === 0) return [];

    if (values.length <= k) {
      return values.map((v) => ({
        cluster: 0,
        center: v,
        min: v,
        max: v,
        sample_size: 1,
      }));
    }

    let centroids = values.slice(0, k);
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

    return centroids.map((center, idx) => {
      const clusterVals = values.filter((_, i) => assignments[i] === idx);

      if (clusterVals.length === 0) {
        return {
          cluster: idx,
          center,
          min: center,
          max: center,
          sample_size: 0,
        };
      }

      return {
        cluster: idx,
        center: Number(center.toFixed(2)),
        min: Number(Math.min(...clusterVals).toFixed(2)),
        max: Number(Math.max(...clusterVals).toFixed(2)),
        sample_size: clusterVals.length,
      };
    });
  }

  private groupByWeatherMainSafe(
    data: { temp: number; weather_main: string }[],
  ) {
    const grouped: Record<
      string,
      { min: number; max: number; total: number; count: number }
    > = {};

    for (const row of data) {
      if (!row.weather_main) continue;
      if (typeof row.temp !== 'number') continue;

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
