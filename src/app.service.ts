import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'MET Flight Radar API is running 🚀';
  }
}
