import { useEffect, useState } from 'react';
import type { Player } from '../types/game';

interface HandResultOverlayProps {
  handNumber: number;
  winners: number[];
  potSize: number;
  players: Player[];
  nextHandNumber: number | null;
  onDismiss: () => void;
}

export function HandResultOverlay({
  handNumber,
  winners,
  potSize,
  players,
  nextHandNumber,
  onDismiss,
}: HandResultOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  const getShortModelName = (model: string) => {
    const parts = model.split('/');
    const name = parts[parts.length - 1] || model;
    const simplified = name.replace(/-?(instruct|non-reasoning|fast|lite|next|chat)$/i, '');
    return simplified.toUpperCase().slice(0, 12);
  };

  // Animate in
  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(showTimer);
  }, []);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade out animation
    }, 3000);
    return () => clearTimeout(dismissTimer);
  }, [onDismiss]);

  const winnerPlayers = winners
    .map(idx => players.find(p => p.index === idx))
    .filter(Boolean) as Player[];

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onDismiss}
    >
      {/* Dimmed background */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Content */}
      <div
        className={`relative flex flex-col items-center gap-6 p-8 transition-transform duration-300 ${
          isVisible ? 'scale-100' : 'scale-90'
        }`}
      >
        {/* Hand complete banner */}
        <div className="flex items-center gap-4">
          <div className="h-[3px] w-16 bg-rank-gold" />
          <span className="font-pixel text-[12px] text-nes-gray tracking-[4px]">
            HAND #{handNumber} COMPLETE
          </span>
          <div className="h-[3px] w-16 bg-rank-gold" />
        </div>

        {/* Pot won */}
        {potSize > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-pixel text-[10px] text-nes-gray tracking-[2px]">POT</span>
            <span className="font-pixel text-[24px] text-nes-yellow">${potSize.toLocaleString()}</span>
          </div>
        )}

        {/* Winner announcement */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-[48px]">👑</span>
          <span className="font-pixel text-[10px] text-nes-gray tracking-[2px]">
            {winners.length > 1 ? 'WINNERS' : 'WINNER'}
          </span>
          <div className="flex flex-wrap justify-center gap-4">
            {winnerPlayers.map(player => (
              <div
                key={player.index}
                className="flex flex-col items-center gap-2 p-4 bg-bg-panel border-[3px] border-rank-gold"
              >
                <span className="font-pixel text-[8px] text-nes-pink">P{player.index}</span>
                <span className="font-pixel text-[16px] text-rank-gold">
                  {getShortModelName(player.model)}
                </span>
                <span className="font-pixel text-[12px] text-nes-yellow">
                  ${player.stack.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Next hand indicator */}
        {nextHandNumber && (
          <div className="flex items-center gap-3 mt-4 animate-pulse">
            <span className="font-pixel text-[10px] text-nes-cyan tracking-[2px]">
              NEXT: HAND #{nextHandNumber}
            </span>
            <span className="text-nes-cyan">→</span>
          </div>
        )}

        {/* Dismiss hint */}
        <span className="font-pixel text-[8px] text-nes-gray/50 tracking-[1px] mt-2">
          CLICK TO DISMISS
        </span>
      </div>
    </div>
  );
}
