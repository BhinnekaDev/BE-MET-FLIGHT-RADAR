import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { WeatherMiningResult } from './interfaces/weatheranalytics.interface';

@Injectable()
export class WeatheranalyticsService {
  private readonly logger = new Logger(WeatheranalyticsService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async getAggregatedWeather(
    airportCode: string,
    filters?: {
      interval?: 'hour' | 'day' | 'month';
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
      : ['hour', 'day', 'month'];

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
        .eq('airport_code', airportCode)
        .eq('interval_type', interval);

      // Filter timestamp range
      if (filters?.start_date)
        query = query.gte('interval_start', filters.start_date);
      if (filters?.end_date)
        query = query.lte('interval_start', filters.end_date);

      // Filter per-year
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
      airportCode,
      filters,
      data: result,
    };
  }

  private formatLabel(interval: string, dateStr: string) {
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

  async predictTomorrow(airportCode: string) {
    console.log('=== predictTomorrow START ===');
    console.log('Airport:', airportCode);

    try {
      console.log('Fetching aggregation data...');
      const { data, error } = await this.supabase
        .from('weather_aggregation')
        .select('avg_temp, interval_start')
        .eq('airport_code', airportCode)
        .not('avg_temp', 'is', null)
        .order('interval_start', { ascending: true });

      if (error) {
        console.error('❌ Supabase error on aggregation:', error);
        throw new Error('Supabase error (aggregation): ' + error.message);
      }

      console.log('Aggregation rows:', data.length);

      if (!data || data.length < 24) {
        console.error('❌ Aggregation insufficient rows:', data.length);
        throw new Error('Data tidak cukup untuk prediksi (agg < 24).');
      }

      const temps = data
        .map((d) => Number(d.avg_temp))
        .filter((x) => typeof x === 'number' && !isNaN(x));

      console.log('Valid temp count:', temps.length);

      if (temps.length < 24) {
        console.error('❌ Temps insufficient after filter:', temps.length);
        throw new Error('Data agregasi tidak cukup setelah filter.');
      }

      const indexes = temps.map((_, i) => i + 1);

      console.log('Running polynomial regression...');
      const coeffs = this.safePolynomialRegression(indexes, temps, 2);
      console.log('Regression coefficients:', coeffs);

      const predictedTemp = Number(
        this.predictPolynomial(coeffs, indexes.length + 1).toFixed(3),
      );

      console.log('Predicted temperature:', predictedTemp);

      console.log('Fetching mining data...');
      const mining = await this.getDailyTemperatureMining(airportCode);

      console.log('Mining result:', mining);

      if (!mining || !mining.ranges_per_weather) {
        console.warn('⚠ No mining range. Returning temp prediction only.');
        return {
          airportCode,
          predicted_temperature: predictedTemp,
          predicted_weather_main: null,
          model: 'poly_deg2',
          coefficients: coeffs,
          data_points: data.length,
        };
      }

      console.log('Mapping ranges...');
      const tempRanges = this.mapRangesFor('temperature')(
        mining.ranges_per_weather,
      );
      const windRanges = this.mapRangesFor('wind_speed')(
        mining.ranges_per_weather,
      );
      const humidityRanges = this.mapRangesFor('humidity')(
        mining.ranges_per_weather,
      );

      console.log('Temp Ranges:', tempRanges);
      console.log('Wind Ranges:', windRanges);
      console.log('Humidity Ranges:', humidityRanges);

      const predictedWind = mining.wind_avg;
      const predictedHumidity = mining.humidity_avg;

      console.log('Pred Wind / Humidity:', predictedWind, predictedHumidity);

      const byTemp = this.pickWeatherMainByTemperature(
        predictedTemp,
        tempRanges,
      );
      const byWind =
        predictedWind == null
          ? null
          : this.pickWeatherMainByWind(predictedWind, windRanges);
      const byHumidity =
        predictedHumidity == null
          ? null
          : this.pickWeatherMainByHumidity(predictedHumidity, humidityRanges);

      console.log('Votes:', { byTemp, byWind, byHumidity });

      const votes = [byTemp, byWind, byHumidity].filter((v) => v !== null);

      const predictedWeatherMain =
        votes.length === 0
          ? null
          : votes.sort(
              (a, b) =>
                votes.filter((v) => v === b).length -
                votes.filter((v) => v === a).length,
            )[0];

      console.log('Final predicted weather:', predictedWeatherMain);

      console.log('=== predictTomorrow END ===');

      return {
        airportCode,
        predicted_temperature: predictedTemp,
        predicted_weather_main: predictedWeatherMain,
        model: 'polynomial_regression_degree_2',
        coefficients: coeffs,
        data_points: data.length,
      };
    } catch (err: any) {
      console.error('🔥 ERROR in predictTomorrow:', err.message);
      console.error(err.stack);
      console.error('Full error object:', err);

      throw new Error('predictTomorrow failed: ' + err.message);
    }
  }

  private safePolynomialRegression(
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

  private mapRangesFor(field: 'temperature' | 'wind_speed' | 'humidity') {
    return (ranges: any): Record<string, { min: number; max: number }> => {
      const result: Record<string, { min: number; max: number }> = {};

      for (const [weather, data] of Object.entries(ranges)) {
        const entry = (data as any)[field];
        if (entry?.min != null && entry?.max != null) {
          result[weather] = { min: entry.min, max: entry.max };
        }
      }

      return result;
    };
  }

  private pickWeatherMainByTemperature(
    predictedTemp: number,
    ranges: Record<string, { min: number; max: number }>,
  ): string | null {
    let bestWeather: string | null = null;
    let smallestDistance = Infinity;

    for (const [weather, range] of Object.entries(ranges)) {
      const { min, max } = range;

      if (predictedTemp >= min && predictedTemp <= max) {
        return weather;
      }

      const center = (min + max) / 2;
      const dist = Math.abs(predictedTemp - center);

      if (dist < smallestDistance) {
        smallestDistance = dist;
        bestWeather = weather;
      }
    }

    return bestWeather;
  }

  private pickWeatherMainByWind(
    windSpeed: number,
    ranges: Record<string, { min: number; max: number }>,
  ): string | null {
    let bestWeather: string | null = null;
    let bestScore = Infinity;

    for (const [weather, range] of Object.entries(ranges)) {
      const center = (range.min + range.max) / 2;
      const diff = Math.abs(windSpeed - center);

      if (diff < bestScore) {
        bestScore = diff;
        bestWeather = weather;
      }
    }

    return bestWeather;
  }

  private pickWeatherMainByHumidity(
    humidity: number,
    ranges: Record<string, { min: number; max: number }>,
  ): string | null {
    let bestWeather: string | null = null;
    let bestScore = Infinity;

    for (const [weather, range] of Object.entries(ranges)) {
      const center = (range.min + range.max) / 2;
      const diff = Math.abs(humidity - center);

      if (diff < bestScore) {
        bestScore = diff;
        bestWeather = weather;
      }
    }

    return bestWeather;
  }

  async getDailyTemperatureMining(
    airportCode: string,
  ): Promise<WeatherMiningResult> {
    const { data, error } = await this.supabase
      .from('weather')
      .select(
        `
      temp,
      humidity,
      wind_speed,
      pressure,
      weather_main,
      data_timestamp
    `,
      )
      .eq('airport_code', airportCode)
      .order('data_timestamp', { ascending: true });

    if (error) {
      return {
        airportCode,
        clusters: [],
        ranges_per_weather: null,
        wind_avg: null,
        humidity_avg: null,
        pressure_avg: null,
      };
    }

    if (!data || data.length === 0) {
      return {
        airportCode,
        clusters: [],
        ranges_per_weather: null,
        wind_avg: null,
        humidity_avg: null,
        pressure_avg: null,
      };
    }

    const temps = data.map((d) => d.temp).filter((n) => typeof n === 'number');
    const cleanedTemps = this.removeOutliers(temps);
    const clusters = cleanedTemps.length
      ? this.safeKMeans(cleanedTemps, 3)
      : [];

    const windData = data
      .map((d) => d.wind_speed)
      .filter((n) => typeof n === 'number');
    const humidityData = data
      .map((d) => d.humidity)
      .filter((n) => typeof n === 'number');
    const pressureData = data
      .map((d) => d.pressure)
      .filter((n) => typeof n === 'number');

    const avgWind = windData.length
      ? windData.reduce((a, b) => a + b, 0) / windData.length
      : null;
    const avgHumidity = humidityData.length
      ? humidityData.reduce((a, b) => a + b, 0) / humidityData.length
      : null;
    const avgPressure = pressureData.length
      ? pressureData.reduce((a, b) => a + b, 0) / pressureData.length
      : null;

    const ranges = this.groupByWeatherMain(data);

    return {
      airportCode,
      clusters,
      ranges_per_weather: ranges,
      wind_avg: avgWind,
      humidity_avg: avgHumidity,
      pressure_avg: avgPressure,
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

  private safeMin(arr: number[]) {
    return arr.length > 0 ? Number(Math.min(...arr).toFixed(2)) : null;
  }

  private safeMax(arr: number[]) {
    return arr.length > 0 ? Number(Math.max(...arr).toFixed(2)) : null;
  }

  private safeAvg(arr: number[]) {
    return arr.length > 0
      ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))
      : null;
  }

  private groupByWeatherMain(
    data: {
      temp: number;
      wind_speed?: number;
      humidity?: number;
      pressure?: number;
      weather_main: string;
    }[],
  ) {
    const grouped: Record<
      string,
      {
        temp: number[];
        wind_speed: number[];
        humidity: number[];
        pressure: number[];
      }
    > = {};

    for (const row of data) {
      if (!row?.weather_main) continue;

      const key = row.weather_main;

      if (!grouped[key]) {
        grouped[key] = {
          temp: [],
          wind_speed: [],
          humidity: [],
          pressure: [],
        };
      }

      if (typeof row.temp === 'number') grouped[key].temp.push(row.temp);
      if (typeof row.wind_speed === 'number')
        grouped[key].wind_speed.push(row.wind_speed);
      if (typeof row.humidity === 'number')
        grouped[key].humidity.push(row.humidity);
      if (typeof row.pressure === 'number')
        grouped[key].pressure.push(row.pressure);
    }

    return Object.fromEntries(
      Object.entries(grouped).map(([key, val]) => [
        key,
        {
          temperature: {
            min: this.safeMin(val.temp),
            max: this.safeMax(val.temp),
            avg: this.safeAvg(val.temp),
            count: val.temp.length,
          },
          wind_speed: {
            min: this.safeMin(val.wind_speed),
            max: this.safeMax(val.wind_speed),
            avg: this.safeAvg(val.wind_speed),
            count: val.wind_speed.length,
          },
          humidity: {
            min: this.safeMin(val.humidity),
            max: this.safeMax(val.humidity),
            avg: this.safeAvg(val.humidity),
            count: val.humidity.length,
          },
          pressure: {
            min: this.safeMin(val.pressure),
            max: this.safeMax(val.pressure),
            avg: this.safeAvg(val.pressure),
            count: val.pressure.length,
          },
        },
      ]),
    );
  }
}
