import { Controller, Get, Query } from '@nestjs/common';
import { AircraftService } from './aircraft.service';

@Controller('aircraft')
export class AircraftController {
  constructor(private readonly aircraftService: AircraftService) {}

  @Get('realtime')
  async getRealtimeAircraft(
    @Query('lamin') lamin?: string,
    @Query('lomin') lomin?: string,
    @Query('lamax') lamax?: string,
    @Query('lomax') lomax?: string,
  ) {
    return this.aircraftService.getOpenSkyData({
      lamin: lamin ? Number(lamin) : undefined,
      lomin: lomin ? Number(lomin) : undefined,
      lamax: lamax ? Number(lamax) : undefined,
      lomax: lomax ? Number(lomax) : undefined,
    });
  }
}
