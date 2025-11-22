import { Controller, Get } from '@nestjs/common';
import { AircraftService } from './aircraft.service';

@Controller('aircraft')
export class AircraftController {
  constructor(private readonly aircraftService: AircraftService) {}

  @Get('fetch')
  async fetch() {
    return this.aircraftService.fetchAircraftData();
  }
}
