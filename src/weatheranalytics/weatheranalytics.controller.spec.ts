import { Test, TestingModule } from '@nestjs/testing';
import { WeatheranalyticsController } from './weatheranalytics.controller';

describe('WeatheranalyticsController', () => {
  let controller: WeatheranalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeatheranalyticsController],
    }).compile();

    controller = module.get<WeatheranalyticsController>(WeatheranalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
