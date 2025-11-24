import { Controller } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  // @Get('realtime')
  // async getWeatherRealTime() {
  //   return this.weatherService.getWeatherForAllAirports();
  // }

  // @Get()
  // async getSaveWeather() {
  //   return this.weatherService.fetchAndSaveWeatherForAllAirports();
  // }

  // @Get('rata-rata/:interval')
  // async aggregateManual(@Param('interval') interval: string) {
  //   const allowed = ['minute', 'hour', 'day', 'month'];

  //   if (!allowed.includes(interval)) {
  //     throw new BadRequestException('Interval tidak valid');
  //   }

  //   return this.weatherService.aggregate(interval as any);
  // }
}
