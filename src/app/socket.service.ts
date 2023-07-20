import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: Socket;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl);
  }

  getSocket(): Socket {
    return this.socket;
  }
}
