import { Test, TestingModule } from '@nestjs/testing';
import { AircraftController } from './aircraft.controller';

describe('AircraftController', () => {
  let controller: AircraftController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AircraftController],
    }).compile();

    controller = module.get<AircraftController>(AircraftController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
