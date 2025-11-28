import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { WeatheranalyticsService } from './weatheranalytics.service';

@Controller('weather-analytics')
export class WeatheranalyticsController {
  constructor(private readonly weatherService: WeatheranalyticsService) {}

  @Get(':airportId')
  async getWeatherSummary(@Param('airportId', ParseIntPipe) airportId: number) {
    return this.weatherService.getAggregatedWeather(airportId);
  }

  @Get('predict/:airportId')
  async predict(@Param('airportId', ParseIntPipe) airportId: number) {
    return this.weatherService.predictTomorrow(airportId);
  }

  @Get('predict-range/:airportId')
  async predictRange(@Param('airportId', ParseIntPipe) airportId: number) {
    return this.weatherService.getDailyTemperatureMining(airportId);
  }
}
