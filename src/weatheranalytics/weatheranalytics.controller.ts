import { Controller, Get, Param, Query } from '@nestjs/common';
import { WeatheranalyticsService } from './weatheranalytics.service';

@Controller('weather-analytics')
export class WeatheranalyticsController {
  constructor(private readonly weatherService: WeatheranalyticsService) {}

  @Get('basic-stats')
  async getStats(
    @Query('interval') interval: 'minute' | 'hour' | 'day' | 'month',
    @Query('airportId') airportId?: string,
  ) {
    const airportIdNum = airportId ? parseInt(airportId, 10) : undefined;
    const stats = await this.weatherService.getWeatherStats(
      interval,
      airportIdNum,
    );
    return { interval, airportId: airportIdNum, stats };
  }

  @Get('timeseries')
  async getTimeSeries(
    @Query('interval') interval: 'minute' | 'hour' | 'day' | 'month',
    @Query('airportId') airportId?: string,
    @Query('limit') limit?: string,
  ) {
    const airportIdNum = airportId ? parseInt(airportId, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const series = await this.weatherService.getTimeSeries(
      interval,
      airportIdNum,
      limitNum,
    );
    return { interval, airportId: airportIdNum, data: series };
  }

  @Get('predict-next-day:airportId')
  async getNextDayPrediction(@Param('airportId') airportId: string) {
    const airportIdNum = parseInt(airportId, 10);
    const prediction =
      await this.weatherService.predictNextDayWeather(airportIdNum);
    return prediction;
  }
}
