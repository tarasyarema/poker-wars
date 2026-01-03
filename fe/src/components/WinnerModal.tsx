import type { Player } from '../types/game';

interface WinnerModalProps {
  winner: Player;
  players: Player[];
  onDismiss: () => void;
}

export function WinnerModal({ winner, players, onDismiss }: WinnerModalProps) {
  const getShortModelName = (model: string) => {
    const parts = model.split('/');
    const name = parts[parts.length - 1] || model;
    // Take first part and optionally version/variant, max 12 chars
    const simplified = name.replace(/-?(instruct|non-reasoning|fast|lite|next|chat)$/i, '');
    return simplified.toUpperCase().slice(0, 12);
  };

  // Sort players by stack (final standings)
  const standings = [...players].sort((a, b) => b.stack - a.stack);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Modal container */}
      <div className="bg-bg-panel border-[3px] sm:border-[4px] border-rank-gold p-0 max-w-sm sm:max-w-md w-full relative animate-[card-deal_0.5s_ease-out] max-h-[85vh] overflow-y-auto">
        {/* Gold corner decorations */}
        <div className="absolute -top-1 -left-1 w-3 h-3 sm:w-4 sm:h-4 border-t-[3px] sm:border-t-4 border-l-[3px] sm:border-l-4 border-rank-gold" />
        <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 border-t-[3px] sm:border-t-4 border-r-[3px] sm:border-r-4 border-rank-gold" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 sm:w-4 sm:h-4 border-b-[3px] sm:border-b-4 border-l-[3px] sm:border-l-4 border-rank-gold" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 border-b-[3px] sm:border-b-4 border-r-[3px] sm:border-r-4 border-rank-gold" />

        {/* Header */}
        <div className="bg-rank-gold p-3 sm:p-4 text-center">
          <div className="font-pixel text-[8px] sm:text-[10px] text-bg-dark tracking-[1px] sm:tracking-[2px] mb-1">
            TOURNAMENT COMPLETE
          </div>
          <div className="font-pixel text-[12px] sm:text-[14px] text-bg-dark">
            WINNER
          </div>
        </div>

        {/* Winner display */}
        <div className="p-4 sm:p-6 text-center border-b-[3px] border-border">
          <div className="text-[36px] sm:text-[48px] mb-2">
            <span className="text-rank-gold">&#9813;</span>
          </div>
          <div className="font-pixel text-[16px] sm:text-[20px] text-rank-gold mb-2 tracking-[1px] sm:tracking-[2px]">
            {getShortModelName(winner.model)}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-rank-gold text-[16px] sm:text-[20px]">$</span>
            <span className="font-pixel text-[14px] sm:text-[16px] text-rank-gold">
              {winner.stack.toLocaleString()}
            </span>
            <span className="font-pixel text-[8px] sm:text-[10px] text-nes-gray">CHIPS</span>
          </div>
        </div>

        {/* Final standings */}
        <div className="p-3 sm:p-4">
          <div className="font-pixel text-[7px] sm:text-[8px] text-nes-gray tracking-[1px] sm:tracking-[2px] mb-2 sm:mb-3 text-center">
            FINAL STANDINGS
          </div>
          <div className="flex flex-col gap-1.5 sm:gap-2">
            {standings.map((player, idx) => {
              const isWinner = player.index === winner.index;
              const isEliminated = player.isEliminated;
              const rankColor = idx === 0 ? 'text-rank-gold' : idx === 1 ? 'text-rank-silver' : idx === 2 ? 'text-rank-bronze' : 'text-nes-gray';

              return (
                <div
                  key={player.index}
                  className={`flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 ${
                    isWinner ? 'bg-rank-gold/10 border-[2px] border-rank-gold' : 'bg-bg-dark border-[2px] border-border'
                  } ${isEliminated ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`font-pixel text-[10px] sm:text-[12px] w-4 sm:w-5 text-center ${rankColor}`}>
                      {idx + 1}
                    </span>
                    <span className={`font-pixel text-[8px] sm:text-[10px] ${isWinner ? 'text-rank-gold' : 'text-nes-cyan'}`}>
                      {getShortModelName(player.model)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] sm:text-[12px] ${isWinner ? 'text-rank-gold' : 'text-nes-yellow'}`}>$</span>
                    <span className={`font-pixel text-[8px] sm:text-[10px] ${isWinner ? 'text-rank-gold' : 'text-nes-yellow'}`}>
                      {player.stack.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dismiss button */}
        <div className="p-3 sm:p-4 pt-0">
          <button
            onClick={onDismiss}
            className="w-full font-pixel text-[9px] sm:text-[10px] py-2.5 sm:py-3 bg-bg-dark border-[3px] border-nes-cyan text-nes-cyan hover:bg-nes-cyan hover:text-bg-dark transition-colors tracking-[1px]"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
