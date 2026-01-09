import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActivityStore } from '@/stores/activityStore';
import { activityKeys } from './useActivities';

const WS_URL = 'ws://localhost:8000/ws/activities';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

type TimeoutId = ReturnType<typeof setTimeout>;

interface WebSocketMessage {
  type: string;
  timestamp: string;
  data?: {
    app_name: string;
    window_title: string;
    url: string | null;
    duration: number;
    start_time: string | null;
    is_afk: boolean;
    category: string;
    productivity_score: number;
    productivity_type: 'productive' | 'neutral' | 'distracting';
  };
  activitywatch_available?: boolean;
}

export function useActivityWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<TimeoutId | null>(null);
  const pingIntervalRef = useRef<TimeoutId | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const queryClient = useQueryClient();
  const { setCurrentActivity, setIsConnected: setStoreConnected, setActivityWatchAvailable } = useActivityStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setStoreConnected(true);
        reconnectAttemptsRef.current = 0;

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          if (message.type === 'current_activity' && message.data) {
            // Update the store with current activity
            setCurrentActivity({
              id: `ws-${Date.now()}`,
              appName: message.data.app_name,
              windowTitle: message.data.window_title,
              url: message.data.url || undefined,
              duration: message.data.duration,
              category: message.data.category,
              productivityScore: message.data.productivity_score,
              productivityType: message.data.productivity_type,
              isAfk: message.data.is_afk,
              startTime: message.data.start_time ? new Date(message.data.start_time) : new Date(),
            });

            // Update ActivityWatch availability
            if (message.activitywatch_available !== undefined) {
              setActivityWatchAvailable(message.activitywatch_available);
            }

            // Invalidate current activity query to sync React Query cache
            queryClient.invalidateQueries({ queryKey: activityKeys.current() });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStoreConnected(false);
        wsRef.current = null;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  }, [queryClient, setCurrentActivity, setStoreConnected, setActivityWatchAvailable]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
  };
}
