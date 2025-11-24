import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';

import { WeatheranalyticsController } from './weatheranalytics.controller';
import { WeatheranalyticsService } from './weatheranalytics.service';

@Module({
  imports: [SupabaseModule],
  providers: [WeatheranalyticsService],
  controllers: [WeatheranalyticsController],
})
export class WeatheranalyticsModule {}
