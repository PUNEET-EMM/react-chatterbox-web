
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: WebSocket | null = null;
  private eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();
  private userId: string | null = null;

  connect(userId: string) {
    console.log('Connecting to WebSocket server for user:', userId);
    this.userId = userId;
    
    // Connect to our Supabase Edge Function WebSocket
    const wsUrl = 'wss://eqyznjynjylhgfualvmx.supabase.co/functions/v1/socket-server';
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected successfully');
      // Send user identification
      this.emit('connect', { userId });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        
        const handlers = this.eventHandlers.get(data.type) || [];
        handlers.forEach(handler => {
          if (data.type === 'incoming-call') {
            handler(data.call, data.offer);
          } else if (data.type === 'call-accepted') {
            handler(data);
          } else if (data.type === 'ice-candidate') {
            handler(data.candidate);
          } else {
            handler(data);
          }
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.socket = null;
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.eventHandlers.clear();
    this.userId = null;
  }

  emit(event: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = { type: event, ...data };
      this.socket.send(JSON.stringify(message));
      console.log('Emitting:', event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit:', event);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
    console.log('Listening for:', event);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      const handlers = this.eventHandlers.get(event) || [];
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.delete(event);
    }
    console.log('Removing listener for:', event);
  }
}

export const socketService = new SocketService();
