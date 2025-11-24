import { Controller, Get } from '@nestjs/common';

import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('airports')
  async getAllAirportLocations() {
    const locations = await this.locationsService.getAllAirportLocations();
    return { data: locations };
  }

  @Get('bmkg-radars')
  async getAllBMKGRadarSites() {
    const radarSites = await this.locationsService.getAllBMKGRadarSites();
    return { data: radarSites };
  }
}
