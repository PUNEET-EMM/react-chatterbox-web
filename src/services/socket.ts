
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string) {
    // In a real implementation, you'd connect to your Socket.IO server
    // For demo purposes, we'll simulate with a mock connection
    console.log('Connecting to Socket.IO server for user:', userId);
    
    // This would be your actual Socket.IO server URL
    // this.socket = io('ws://localhost:3001', {
    //   auth: { userId }
    // });
    
    // Mock implementation for demo
    this.socket = {
      emit: (event: string, data: any) => {
        console.log('Emitting:', event, data);
      },
      on: (event: string, callback: Function) => {
        console.log('Listening for:', event);
      },
      off: (event: string, callback?: Function) => {
        console.log('Removing listener for:', event);
      },
      disconnect: () => {
        console.log('Disconnecting from Socket.IO');
      }
    } as any;

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: Function) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: Function) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
