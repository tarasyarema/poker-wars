import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../utils/api';
import type { GameState, ApiResponse } from '../types/game';

interface UseGameStateReturn {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGameState(pollInterval = 500): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/game`);
      const data: ApiResponse<GameState> = await response.json();

      if (data.success && data.data) {
        setGameState(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch game state');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGameState();

    intervalRef.current = window.setInterval(fetchGameState, pollInterval);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchGameState, pollInterval]);

  return {
    gameState,
    loading,
    error,
    refetch: fetchGameState,
  };
}
