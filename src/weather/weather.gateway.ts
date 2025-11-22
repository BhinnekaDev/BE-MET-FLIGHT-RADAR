import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WeatherGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('Weather WebSocket Gateway siap!');
  }

  broadcastWeatherUpdate(data: any) {
    this.server.emit('weather_update', data);
  }

  broadcastBulkUpdate(data: any) {
    this.server.emit('weather_bulk_update', data);
  }

  broadcastAggregation(data: any) {
    this.server.emit('weather_aggregation', data);
  }
}
