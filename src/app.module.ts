import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AircraftModule } from './aircraft/aircraft.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AircraftModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
