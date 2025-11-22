import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';

import { AircraftController } from './aircraft.controller';
import { AircraftGateway } from './aircraft.gateway';
import { AircraftService } from './aircraft.service';

@Module({
  imports: [SupabaseModule],
  providers: [AircraftService, AircraftGateway],
  controllers: [AircraftController],
})
export class AircraftModule {}
