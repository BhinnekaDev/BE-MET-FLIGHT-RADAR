import { Controller, Get } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  // @Get('realtime')
  // async getWeatherRealTime() {
  //   return this.weatherService.getWeatherForAllAirports();
  // }

  @Get('fetch-now')
  async getSaveWeather() {
    return this.weatherService.fetchAndSaveWeatherForAllAirports();
  }

  // @Get('rata-rata/:interval')
  // async aggregateManual(@Param('interval') interval: string) {
  //   const allowed = ['minute', 'hour', 'day', 'month'];

  //   if (!allowed.includes(interval)) {
  //     throw new BadRequestException('Interval tidak valid');
  //   }

  //   return this.weatherService.aggregate(interval as any);
  // }

  @Get('aggregate/minute')
  async aggregateMinute() {
    return this.weatherService.aggregate('minute');
  }

  @Get('aggregate/hour')
  async aggregateHour() {
    return this.weatherService.aggregate('hour');
  }

  @Get('aggregate/day')
  async aggregateDay() {
    return this.weatherService.aggregate('day');
  }
}
