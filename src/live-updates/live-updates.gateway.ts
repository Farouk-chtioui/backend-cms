import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
})
export class LiveUpdatesGateway {
  @WebSocketServer() server: Server;

  handleThemeChange(data: any) {
    this.server.emit('themeChange', data);
  }
}
