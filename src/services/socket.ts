class SocketService {
  private socket: WebSocket | null = null;
  private eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: number | null = null;
  private connectionTimeout: number | null = null;
  private reconnectTimeout: number | null = null;
  private isManualDisconnect = false;

  connect(userId: string) {
    console.log('Connecting to WebSocket server for user:', userId);
    this.userId = userId;
    this.reconnectAttempts = 0;
    this.isManualDisconnect = false;
    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Clear any existing timeouts
    this.clearTimeouts();

    try {
      // Connect to our Supabase Edge Function WebSocket
      const wsUrl = 'wss://eqyznjynjylhgfualvmx.supabase.co/functions/v1/socket-server';
      console.log('Attempting WebSocket connection to:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);

      // Set connection timeout (reduced to 5 seconds for faster feedback)
      this.connectionTimeout = window.setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout');
          this.socket.close();
        }
      }, 5000);

      this.socket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        
        // Clear connection timeout
        this.clearTimeouts();
        
        // Send user identification immediately
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

          if (data.type === 'connected') {
            console.log('User connection confirmed:', data.userId);
            return;
          }

          if (data.type === 'pong') {
            console.log('Received pong from server');
            return;
          }

          if (data.type === 'ping') {
            console.log('Received ping from server, sending pong');
            this.emit('pong', {});
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
        console.log('WebSocket disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        this.socket = null;
        this.clearTimeouts();
        
        // Trigger disconnected event handlers
        const handlers = this.eventHandlers.get('disconnected') || [];
        handlers.forEach(handler => handler());
        
        // Attempt to reconnect if not manually disconnected and within retry limits
        if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // Exponential backoff
          this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connectWebSocket();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.clearTimeouts();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.clearTimeouts();
    }
  }

  private startPingInterval() {
    // Send ping every 25 seconds to keep connection alive
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.emit('ping', {});
      }
    }, 25000);
  }

  private clearTimeouts() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    console.log('Manually disconnecting WebSocket');
    this.isManualDisconnect = true;
    this.clearTimeouts();

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
      
      // Try to reconnect if we have a userId and haven't exceeded retry limits
      if (this.userId && this.reconnectAttempts < this.maxReconnectAttempts && !this.isManualDisconnect) {
        console.log('Attempting to reconnect due to emit failure');
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
