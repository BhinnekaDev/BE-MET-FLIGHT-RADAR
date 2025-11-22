import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';

import { WeatherController } from './weather.controller';
import { WeatherGateway } from './weather.gateway';
import { WeatherService } from './weather.service';

@Module({
  imports: [SupabaseModule],
  providers: [WeatherService, WeatherGateway],
  controllers: [WeatherController],
})
export class WeatherModule {}
