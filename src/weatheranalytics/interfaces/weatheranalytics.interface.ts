export interface WeatherMiningResult {
  airportCode: string;
  clusters: {
    cluster: number;
    center: number;
    min: number;
    max: number;
    sample_size: number;
  }[];

  ranges_per_weather: Record<
    string,
    {
      temperature: { min: number | null; max: number | null };
      wind_speed: { min: number | null; max: number | null };
      humidity: { min: number | null; max: number | null };
    }
  > | null;

  wind_avg: number | null;
  humidity_avg: number | null;
  pressure_avg: number | null;
}
