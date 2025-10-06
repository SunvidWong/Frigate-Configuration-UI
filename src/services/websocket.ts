import { useState, useEffect } from 'react';

export type WebSocketEventType =
  | 'system_status_update'
  | 'camera_status_change'
  | 'hardware_accelerator_status'
  | 'model_download_progress'
  | 'deployment_status_update'
  | 'log_entry'
  | 'system_metrics';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  data: T;
  timestamp: string;
  id: string;
}

export type WebSocketEventHandler<T = unknown> = (data: T) => void;

export class FrigateWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers = new Map<WebSocketEventType, Set<WebSocketEventHandler>>();
  private isConnecting = false;
  private reconnectTimer: number | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_HOST || window.location.host;
    this.url = `${protocol}//${host}/ws`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket连接已建立');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket连接已关闭:', event.code, event.reason);
          this.isConnecting = false;
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('WebSocket事件处理器错误:', error);
        }
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`WebSocket重连尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}，延迟 ${delay}ms`);

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(error => {
          console.error('WebSocket重连失败:', error);
        });
      }, delay);
    } else {
      console.error('WebSocket重连次数已达上限');
    }
  }

  // 订阅事件
  on(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler as WebSocketEventHandler<unknown>);
  }

  // 取消订阅事件
  off(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler as WebSocketEventHandler<unknown>);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  // 发送消息
  send<T = unknown>(type: WebSocketEventType, data: T): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage<T> = {
        type,
        data,
        timestamp: new Date().toISOString(),
        id: this.generateId()
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // 获取连接状态
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// 创建全局WebSocket实例
export const frigateWS = new FrigateWebSocket();

// Hook for using WebSocket
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleMessage = (message: WebSocketMessage) => setLastMessage(message);

    frigateWS.on('system_status_update', handleConnect);
    frigateWS.on('system_status_update', handleDisconnect);
    frigateWS.on('system_status_update', handleMessage);

    frigateWS.connect().catch(console.error);

    return () => {
      frigateWS.off('system_status_update', handleConnect);
      frigateWS.off('system_status_update', handleDisconnect);
      frigateWS.off('system_status_update', handleMessage);
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    connect: () => frigateWS.connect(),
    disconnect: () => frigateWS.disconnect(),
    on: frigateWS.on.bind(frigateWS),
    off: frigateWS.off.bind(frigateWS),
    send: frigateWS.send.bind(frigateWS)
  };
}