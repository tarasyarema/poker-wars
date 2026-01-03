import { useEffect } from 'react';
import type { GameSummary } from '../types/game';

interface GamesListModalProps {
  games: GameSummary[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onFetch: () => void;
}

export function GamesListModal({ games, loading, error, onClose, onFetch }: GamesListModalProps) {
  // Fetch games when modal opens
  useEffect(() => {
    onFetch();
  }, [onFetch]);

  const getShortModelName = (model: string) => {
    const parts = model.split('/');
    const name = parts[parts.length - 1] || model;
    const simplified = name.replace(/-?(instruct|non-reasoning|fast|lite|next|chat)$/i, '');
    return simplified.toUpperCase().slice(0, 12);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-rank-gold';
      case 'in_progress': return 'text-nes-green';
      default: return 'text-nes-gray';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Modal container */}
      <div className="bg-bg-panel border-[3px] sm:border-[4px] border-nes-cyan p-0 max-w-md sm:max-w-lg w-full relative animate-[card-deal_0.5s_ease-out] max-h-[85vh] flex flex-col">
        {/* Corner decorations */}
        <div className="absolute -top-1 -left-1 w-3 h-3 sm:w-4 sm:h-4 border-t-[3px] sm:border-t-4 border-l-[3px] sm:border-l-4 border-nes-cyan" />
        <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 border-t-[3px] sm:border-t-4 border-r-[3px] sm:border-r-4 border-nes-cyan" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 sm:w-4 sm:h-4 border-b-[3px] sm:border-b-4 border-l-[3px] sm:border-l-4 border-nes-cyan" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 border-b-[3px] sm:border-b-4 border-r-[3px] sm:border-r-4 border-nes-cyan" />

        {/* Header */}
        <div className="bg-nes-cyan p-3 sm:p-4 text-center flex-shrink-0">
          <div className="font-pixel text-[8px] sm:text-[10px] text-bg-dark tracking-[1px] sm:tracking-[2px] mb-1">
            TOURNAMENT HISTORY
          </div>
          <div className="font-pixel text-[12px] sm:text-[14px] text-bg-dark">
            ALL GAMES
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loading && (
            <div className="text-center py-6 sm:py-8">
              <span className="font-pixel text-[8px] sm:text-[10px] text-nes-gray animate-pulse">
                LOADING GAMES...
              </span>
            </div>
          )}

          {error && (
            <div className="text-center py-6 sm:py-8">
              <span className="font-pixel text-[8px] sm:text-[10px] text-nes-red">
                {error}
              </span>
            </div>
          )}

          {!loading && !error && games.length === 0 && (
            <div className="text-center py-6 sm:py-8">
              <span className="font-pixel text-[8px] sm:text-[10px] text-nes-gray">
                NO GAMES FOUND
              </span>
            </div>
          )}

          {!loading && !error && games.length > 0 && (
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {games.map((game) => (
                <div
                  key={game.runId}
                  className="bg-bg-dark border-[2px] border-border p-2 sm:p-3"
                >
                  {/* Top row: Run ID and Status */}
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className="font-pixel text-[7px] sm:text-[8px] text-nes-cyan truncate max-w-[120px] sm:max-w-[200px]">
                      {game.runId}
                    </span>
                    <span className={`font-pixel text-[7px] sm:text-[8px] tracking-[1px] ${getStatusColor(game.status)}`}>
                      {game.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>

                  {/* Middle row: Winner info */}
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {game.winner ? (
                        <>
                          <span className="text-rank-gold text-[10px] sm:text-[12px]">&#9813;</span>
                          <span className="font-pixel text-[8px] sm:text-[10px] text-rank-gold">
                            {getShortModelName(game.winner.model)}
                          </span>
                        </>
                      ) : (
                        <span className="font-pixel text-[7px] sm:text-[8px] text-nes-gray">
                          NO WINNER YET
                        </span>
                      )}
                    </div>
                    <span className="font-pixel text-[7px] sm:text-[8px] text-nes-gray">
                      {game.playerCount} PLAYERS
                    </span>
                  </div>

                  {/* Bottom row: Date and Hands */}
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[7px] sm:text-[8px] text-nes-gray">
                      {formatDate(game.startedAt)}
                    </span>
                    <span className="font-pixel text-[7px] sm:text-[8px] text-nes-yellow">
                      {game.handsPlayed} HANDS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="p-3 sm:p-4 pt-0 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full font-pixel text-[9px] sm:text-[10px] py-2.5 sm:py-3 bg-bg-dark border-[3px] border-nes-cyan text-nes-cyan hover:bg-nes-cyan hover:text-bg-dark transition-colors tracking-[1px]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
