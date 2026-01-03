import { useState, useCallback } from 'react';
import { API_URL } from '../utils/api';
import type { GameSummary, ApiResponse, GamesListResponse } from '../types/game';

interface UseGamesListReturn {
  games: GameSummary[];
  loading: boolean;
  error: string | null;
  fetchGames: () => Promise<void>;
}

export function useGamesList(): UseGamesListReturn {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/games`);
      const data: ApiResponse<GamesListResponse> = await response.json();

      if (data.success && data.data) {
        setGames(data.data.games);
      } else {
        setError(data.error || 'Failed to fetch games');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    games,
    loading,
    error,
    fetchGames,
  };
}
