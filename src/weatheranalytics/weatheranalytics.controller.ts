import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { WeatheranalyticsService } from './weatheranalytics.service';

@Controller('weather-analytics')
export class WeatheranalyticsController {
  constructor(private readonly weatherService: WeatheranalyticsService) {}

  @Get(':airportCode')
  @ApiQuery({ name: 'airportCode', required: true, type: String })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['hour', 'day', 'month'],
  })
  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'day', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWeatherSummary(
    @Param('airportCode') airportCode: string,
    @Query('interval') interval?: 'hour' | 'day' | 'month',
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('day') day?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      interval,
      start_date,
      end_date,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      day: day ? Number(day) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    return this.weatherService.getAggregatedWeather(airportCode, filters);
  }

  @Get('predict/:airportCode')
  async predict(@Param('airportCode') airportCode: string) {
    return this.weatherService.predictTomorrow(airportCode);
  }

  @Get('predict-range/:airportCode')
  async predictRange(@Param('airportCode') airportCode: string) {
    return this.weatherService.getDailyTemperatureMining(airportCode);
  }
}
