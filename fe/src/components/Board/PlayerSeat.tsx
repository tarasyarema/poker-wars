import type { Player } from '../../types/game';
import { Card } from './Card';

interface PlayerSeatProps {
  player: Player;
  isDealer: boolean;
  isPlayerToAct: boolean;
  isChipLeader: boolean;
  position: number;
  totalPositions: number;
}

export function PlayerSeat({
  player,
  isDealer,
  isPlayerToAct,
  isChipLeader,
  position,
  totalPositions,
}: PlayerSeatProps) {
  const getShortModelName = (model: string) => {
    const parts = model.split('/');
    const name = parts[parts.length - 1] || model;
    // Take first part and optionally version/variant, max 12 chars
    const simplified = name.replace(/-?(instruct|non-reasoning|fast|lite|next|chat)$/i, '');
    return simplified.toUpperCase().slice(0, 12);
  };

  // Calculate position around the table (OUTSIDE, at 45-48% radius)
  const getPositionStyle = () => {
    if (totalPositions <= 0) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const angle = (position / totalPositions) * 2 * Math.PI - Math.PI / 2;
    const radiusX = 42; // % from center - outside table
    const radiusY = 32; // % from center - reduced to keep players in view

    const x = 50 + radiusX * Math.cos(angle);
    const y = 50 + radiusY * Math.sin(angle);

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  const isFolded = !player.isActive && !player.isEliminated;
  const isAllIn = player.stack === 0 && player.isActive;

  // Determine border color based on state
  const getBorderClass = () => {
    if (isPlayerToAct) return 'border-nes-green';
    if (isChipLeader) return 'border-rank-gold';
    return 'border-border';
  };

  return (
    <div
      className={`absolute z-10 transition-all duration-300 ${
        isPlayerToAct ? 'z-20 scale-110' : ''
      } ${isFolded && !player.isEliminated ? 'opacity-60 grayscale-[50%]' : ''} ${player.isEliminated && !isAllIn ? 'opacity-80' : ''}`}
      style={getPositionStyle()}
    >
      {/* Player number badge */}
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-nes-pink border-[3px] border-bg-dark rounded-full flex items-center justify-center font-pixel text-[8px] font-bold text-bg-dark z-30">
        P{player.index}
      </div>

      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-nes-white border-[3px] border-bg-dark rounded-full flex items-center justify-center font-pixel text-[10px] font-bold text-bg-dark z-30">
          D
        </div>
      )}

      {/* Thinking indicator */}
      {isPlayerToAct && !isFolded && !player.isEliminated && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 font-pixel text-[10px] text-nes-green whitespace-nowrap z-30 animate-pulse">
          <span>THINKING...</span>
        </div>
      )}

      {/* Chip leader badge - top right golden dollar */}
      {isChipLeader && !player.isEliminated && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-rank-gold border-[3px] border-bg-dark rounded-full flex items-center justify-center font-pixel text-[12px] font-bold text-bg-dark z-30">
          $
        </div>
      )}

      {/* All-in badge */}
      {isAllIn && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-nes-red font-pixel text-[8px] text-nes-white z-30">
          ALL-IN
        </div>
      )}

      {/* Main player card */}
      <div
        className={`bg-bg-panel border-[3px] ${getBorderClass()} p-2 min-w-[110px] max-w-[130px] relative ${
          isPlayerToAct ? 'bg-bg-panel-light shadow-[0_0_25px_rgba(0,168,68,0.5)] animate-pulse-slow' : ''
        }`}
      >
        {/* Folded overlay - covers entire card */}
        {isFolded && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
            <span className="font-pixel text-[12px] text-nes-red -rotate-12 border-2 border-nes-red px-3 py-1 bg-black/90">
              FOLD
            </span>
          </div>
        )}

        {/* Eliminated overlay - covers entire card (not for all-in players) */}
        {player.isEliminated && !isAllIn && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <span className="font-pixel text-[12px] text-nes-gray -rotate-12 border-2 border-nes-gray px-3 py-1 bg-black/90">
              BROKE
            </span>
          </div>
        )}

        {/* Model name */}
        <div className={`font-pixel text-[10px] text-center mb-1 tracking-[1px] truncate ${
          isChipLeader ? 'text-rank-gold' : 'text-nes-cyan'
        }`}>
          {getShortModelName(player.model)}
        </div>

        {/* Hole cards */}
        <div className="flex gap-1 justify-center mb-1">
          {player.holeCards && player.holeCards.length === 2 && !isFolded ? (
            <>
              <Card card={player.holeCards[0]} size="small" animationDelay={0} />
              <Card card={player.holeCards[1]} size="small" animationDelay={100} />
            </>
          ) : (
            <>
              <Card faceDown size="small" />
              <Card faceDown size="small" animationDelay={100} />
            </>
          )}
        </div>

        {/* Stack display */}
        <div className="flex items-center justify-center gap-1 font-pixel">
          <span className={`text-[10px] ${isChipLeader ? 'text-rank-gold' : 'text-nes-yellow'}`}>$</span>
          <span className={`text-[12px] ${isChipLeader ? 'text-rank-gold' : 'text-nes-yellow'}`}>
            {player.stack.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Bet display - always shown */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-20">
        {/* Mini chip stack - only show when betting */}
        {player.betSize > 0 && (
          <div className="relative flex items-end justify-center h-4">
            {Array(Math.min(4, Math.max(1, Math.ceil(player.betSize / 30)))).fill(null).map((_, i) => (
              <div
                key={i}
                className="absolute w-4 h-1.5 rounded-full bg-nes-orange border-b border-orange-800"
                style={{ bottom: `${i * 3}px`, zIndex: i }}
              />
            ))}
          </div>
        )}
        {/* Bet amount - always visible */}
        <div className={`px-1.5 py-0.5 font-pixel text-[9px] ${
          player.betSize > 0
            ? 'bg-bg-dark/90 border border-nes-orange text-nes-orange'
            : 'bg-bg-dark/70 border border-nes-gray/50 text-nes-gray'
        }`}>
          {player.betSize}
        </div>
      </div>
    </div>
  );
}
