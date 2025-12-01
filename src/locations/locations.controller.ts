import { Controller, Get, Query } from '@nestjs/common';

import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('airports')
  async getAllAirportLocations(
    @Query('name') name?: string,
    @Query('code') code?: string,
  ) {
    const filters: { name?: string; code?: string } = {};
    if (name) {
      filters.name = name;
    }
    if (code) {
      filters.code = code;
    }
    const airportLocations =
      await this.locationsService.getAllAirportLocations(filters);
    return { data: airportLocations };
  }

  @Get('bmkg-radars')
  async getAllBMKGRadarSites(
    @Query('name') name?: string,
    @Query('code') code?: string,
  ) {
    const filters: { name?: string; code?: string } = {};
    if (name) {
      filters.name = name;
    }
    if (code) {
      filters.code = code;
    }
    const radarSites =
      await this.locationsService.getAllBMKGRadarSites(filters);
    return { data: radarSites };
  }

  @Get('bengkulu')
  async getAllBengkuluLocations(
    @Query('id') id: Number,
    @Query('city_name') city_name: string,
  ) {
    const filters: { id?: number; city_name?: string } = {};
    if (id) {
      filters.id = Number(id);
    }
    if (city_name) {
      filters.city_name = city_name;
    }
    const bengkuluLocations =
      await this.locationsService.getAllBengkuluLocations(filters);
    return { data: bengkuluLocations };
  }
}
