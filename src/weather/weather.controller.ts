import { Controller, InternalServerErrorException, Post } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Post('fetch-all')
  async fetchAll() {
    try {
      return await this.weatherService.fetchWeatherForAllAirports();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
