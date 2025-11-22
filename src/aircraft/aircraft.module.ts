import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';

import { AircraftController } from './aircraft.controller';
import { AircraftService } from './aircraft.service';

@Module({
  imports: [SupabaseModule],
  providers: [AircraftService],
  controllers: [AircraftController],
})
export class AircraftModule {}
