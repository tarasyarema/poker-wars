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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Modal container */}
      <div className="bg-bg-panel border-[4px] border-rank-gold p-0 max-w-md w-full mx-4 relative animate-[card-deal_0.5s_ease-out]">
        {/* Gold corner decorations */}
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-rank-gold" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-rank-gold" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-rank-gold" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-rank-gold" />

        {/* Header */}
        <div className="bg-rank-gold p-4 text-center">
          <div className="font-pixel text-[10px] text-bg-dark tracking-[2px] mb-1">
            TOURNAMENT COMPLETE
          </div>
          <div className="font-pixel text-[14px] text-bg-dark">
            WINNER
          </div>
        </div>

        {/* Winner display */}
        <div className="p-6 text-center border-b-[3px] border-border">
          <div className="text-[48px] mb-2">
            <span className="text-rank-gold">&#9813;</span>
          </div>
          <div className="font-pixel text-[20px] text-rank-gold mb-2 tracking-[2px]">
            {getShortModelName(winner.model)}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-rank-gold text-[20px]">$</span>
            <span className="font-pixel text-[16px] text-rank-gold">
              {winner.stack.toLocaleString()}
            </span>
            <span className="font-pixel text-[10px] text-nes-gray">CHIPS</span>
          </div>
        </div>

        {/* Final standings */}
        <div className="p-4">
          <div className="font-pixel text-[8px] text-nes-gray tracking-[2px] mb-3 text-center">
            FINAL STANDINGS
          </div>
          <div className="flex flex-col gap-2">
            {standings.map((player, idx) => {
              const isWinner = player.index === winner.index;
              const isEliminated = player.isEliminated;
              const rankColor = idx === 0 ? 'text-rank-gold' : idx === 1 ? 'text-rank-silver' : idx === 2 ? 'text-rank-bronze' : 'text-nes-gray';

              return (
                <div
                  key={player.index}
                  className={`flex items-center justify-between px-3 py-2 ${
                    isWinner ? 'bg-rank-gold/10 border-[2px] border-rank-gold' : 'bg-bg-dark border-[2px] border-border'
                  } ${isEliminated ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-pixel text-[12px] w-5 text-center ${rankColor}`}>
                      {idx + 1}
                    </span>
                    <span className={`font-pixel text-[10px] ${isWinner ? 'text-rank-gold' : 'text-nes-cyan'}`}>
                      {getShortModelName(player.model)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[12px] ${isWinner ? 'text-rank-gold' : 'text-nes-yellow'}`}>$</span>
                    <span className={`font-pixel text-[10px] ${isWinner ? 'text-rank-gold' : 'text-nes-yellow'}`}>
                      {player.stack.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dismiss button */}
        <div className="p-4 pt-0">
          <button
            onClick={onDismiss}
            className="w-full font-pixel text-[10px] py-3 bg-bg-dark border-[3px] border-nes-cyan text-nes-cyan hover:bg-nes-cyan hover:text-bg-dark transition-colors tracking-[1px]"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
