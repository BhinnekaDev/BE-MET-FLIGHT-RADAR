import { Test, TestingModule } from '@nestjs/testing';
import { WeatheranalyticsService } from './weatheranalytics.service';

describe('WeatheranalyticsService', () => {
  let service: WeatheranalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeatheranalyticsService],
    }).compile();

    service = module.get<WeatheranalyticsService>(WeatheranalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
