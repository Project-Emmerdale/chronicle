import { Server } from 'socket.io';
import { server } from './express.js';

export const io = new Server(server, {
  cors: {
    origin: '*',
  },
});
