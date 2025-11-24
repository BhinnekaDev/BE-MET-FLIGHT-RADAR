import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  async getWeather() {
    return this.weatherService.getWeatherRealtimeAndSaveHidden();
  }

  @Get('savemanual')
  async getSaveWeather() {
    return this.weatherService.fetchAndSaveWeatherForAllAirports();
  }

  @Get('rata-rata/:interval')
  async aggregateManual(@Param('interval') interval: string) {
    const allowed = ['minute', 'hour', 'day', 'month'];

    if (!allowed.includes(interval)) {
      throw new BadRequestException('Interval tidak valid');
    }

    return this.weatherService.aggregate(interval as any);
  }
}
