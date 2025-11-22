import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AircraftService } from './aircraft.service';

@WebSocketGateway({
  cors: true,
})
export class AircraftGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly aircraftService: AircraftService) {}

  afterInit() {
    setInterval(async () => {
      const data = await this.aircraftService.fetchAircraftData();
      this.server.emit('aircraft_update', data);
    }, 30000);
  }
}
