import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../utils/api';
import type { LogEvent } from '../types/game';

interface UseLogStreamReturn {
  logs: LogEvent[];
  connected: boolean;
  error: string | null;
  clearLogs: () => void;
}

const MAX_LOGS = 100;

export function useLogStream(): UseLogStreamReturn {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${API_URL}/api/logs/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const logEvent: LogEvent = JSON.parse(event.data);
        setLogs((prev) => {
          const updated = [...prev, logEvent];
          // Keep only the last MAX_LOGS entries
          return updated.slice(-MAX_LOGS);
        });
      } catch {
        console.error('Failed to parse log event:', event.data);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      setError('Connection lost');
      eventSource.close();

      // Attempt to reconnect after 2 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 2000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    connected,
    error,
    clearLogs,
  };
}
