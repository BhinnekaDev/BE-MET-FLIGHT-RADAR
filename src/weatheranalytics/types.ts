export interface WeatherRange {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface ClusterResult {
  cluster: number;
  center: number;
  min: number;
  max: number;
  sample_size: number;
}

export interface WeatherMiningResult {
  airportId: number;
  total_raw: number;
  total_cleaned: number;
  clusters: ClusterResult[];
  ranges_per_weather: Record<string, WeatherRange>;
}
