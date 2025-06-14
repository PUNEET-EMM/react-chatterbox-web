class SocketService {
  private socket: WebSocket | null = null;
  private eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: number | null = null;
  private connectionTimeout: number | null = null;

  connect(userId: string) {
    console.log('Connecting to WebSocket server for user:', userId);
    this.userId = userId;
    this.reconnectAttempts = 0;
    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    // Clear any existing connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    try {
      // Connect to our Supabase Edge Function WebSocket
      const wsUrl = 'wss://eqyznjynjylhgfualvmx.supabase.co/functions/v1/socket-server';
      console.log('Attempting WebSocket connection to:', wsUrl);
      this.socket = new WebSocket(wsUrl);

      // Set connection timeout
      this.connectionTimeout = window.setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout');
          this.socket.close();
        }
      }, 10000); // 10 second timeout

      this.socket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        
        // Clear connection timeout
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        // Send user identification
        if (this.userId) {
          this.emit('connect', { userId: this.userId });
        }

        // Start ping interval to keep connection alive
        this.startPingInterval();

        // Trigger connected event handlers
        const handlers = this.eventHandlers.get('connected') || [];
        handlers.forEach(handler => handler());
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          // Handle different message types
          if (data.type === 'connection-established') {
            console.log('Connection established with socketId:', data.socketId);
            return;
          }

          if (data.type === 'pong') {
            console.log('Received pong from server');
            return;
          }
          
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

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        this.socket = null;
        
        // Clear intervals and timeouts
        this.stopPingInterval();
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        // Trigger disconnected event handlers
        const handlers = this.eventHandlers.get('disconnected') || [];
        handlers.forEach(handler => handler());
        
        // Attempt to reconnect if not manually disconnected
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connectWebSocket();
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        // Clear connection timeout on error
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  private startPingInterval() {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.emit('ping', {});
      }
    }, 30000);
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.stopPingInterval();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
    }
    this.eventHandlers.clear();
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  emit(event: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = { type: event, ...data };
      this.socket.send(JSON.stringify(message));
      console.log('Emitting:', event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit:', event);
      
      // Try to reconnect if we have a userId
      if (this.userId && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.connectWebSocket();
      }
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

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const socketService = new SocketService();
