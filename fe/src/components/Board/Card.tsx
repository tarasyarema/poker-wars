import type { Card as CardType } from '../../types/game';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  size?: 'small' | 'medium' | 'large';
  animationDelay?: number;
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RANK_DISPLAY: Record<string, string> = {
  T: '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
};

const SIZE_CLASSES = {
  small: 'w-8 h-11',
  medium: 'w-14 h-[78px]',
  large: 'w-[70px] h-[98px]',
};

const RANK_SIZE_CLASSES = {
  small: 'text-[10px]',
  medium: 'text-[12px]',
  large: 'text-[14px]',
};

const SUIT_SIZE_CLASSES = {
  small: 'text-[12px]',
  medium: 'text-[16px]',
  large: 'text-[18px]',
};

const CENTER_SUIT_SIZE_CLASSES = {
  small: 'text-[18px]',
  medium: 'text-[28px]',
  large: 'text-[36px]',
};

const BACK_SYMBOL_SIZE_CLASSES = {
  small: 'text-[10px]',
  medium: 'text-[14px]',
  large: 'text-[16px]',
};

export function Card({ card, faceDown = false, size = 'medium', animationDelay = 0 }: CardProps) {
  if (!card || faceDown) {
    return (
      <div
        className={`${SIZE_CLASSES[size]} bg-nes-purple border-[3px] border-nes-dark-gray rounded-[4px] relative flex items-center justify-center animate-card-deal overflow-hidden`}
        style={{ animationDelay: `${animationDelay}ms`, imageRendering: 'pixelated' }}
      >
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-full p-1">
          <span className={`${BACK_SYMBOL_SIZE_CLASSES[size]} flex items-center justify-center text-nes-cyan/40`}>♠</span>
          <span className={`${BACK_SYMBOL_SIZE_CLASSES[size]} flex items-center justify-center text-nes-pink/40`}>♥</span>
          <span className={`${BACK_SYMBOL_SIZE_CLASSES[size]} flex items-center justify-center text-nes-pink/40`}>♦</span>
          <span className={`${BACK_SYMBOL_SIZE_CLASSES[size]} flex items-center justify-center text-nes-cyan/40`}>♣</span>
        </div>
      </div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const rankDisplay = RANK_DISPLAY[card.rank] || card.rank;
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const colorClass = isRed ? 'text-nes-red' : 'text-nes-black';

  return (
    <div
      className={`${SIZE_CLASSES[size]} ${colorClass} bg-nes-white border-[3px] border-nes-black rounded-[4px] relative flex items-center justify-center animate-card-deal`}
      style={{ animationDelay: `${animationDelay}ms`, imageRendering: 'pixelated' }}
    >
      {/* Top-left corner */}
      <div className="absolute top-[3px] left-1 flex flex-col items-center leading-none">
        <span className={`${RANK_SIZE_CLASSES[size]} font-pixel font-bold`}>{rankDisplay}</span>
        <span className={SUIT_SIZE_CLASSES[size]}>{suitSymbol}</span>
      </div>

      {/* Center suit */}
      <div className={CENTER_SUIT_SIZE_CLASSES[size]}>{suitSymbol}</div>

      {/* Bottom-right corner (rotated) */}
      <div className="absolute bottom-[3px] right-1 flex flex-col items-center leading-none rotate-180">
        <span className={`${RANK_SIZE_CLASSES[size]} font-pixel font-bold`}>{rankDisplay}</span>
        <span className={SUIT_SIZE_CLASSES[size]}>{suitSymbol}</span>
      </div>
    </div>
  );
}
