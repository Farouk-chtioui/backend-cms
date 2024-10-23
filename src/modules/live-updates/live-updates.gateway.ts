import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class LiveUpdatesGateway {
  @WebSocketServer() server: Server;

  handleThemeChange(data: any) {
    this.server.emit('themeChange', data);
  }
}
