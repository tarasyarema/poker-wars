import type { Card as CardType } from '../../types/game';
import { Card } from './Card';

interface CommunityCardsProps {
  cards: CardType[];
}

export function CommunityCards({ cards }: CommunityCardsProps) {
  // Always show 5 slots
  const slots = Array(5).fill(null).map((_, i) => cards[i] || null);

  return (
    <div className="flex justify-center">
      <div className="flex gap-0.5 sm:gap-1 p-1 sm:p-1.5 px-1.5 sm:px-2.5 bg-black/40 border-2 border-border rounded-md">
        {slots.map((card, index) => (
          <div key={index} className="relative">
            {card ? (
              <Card card={card} size="medium" animationDelay={index * 150} />
            ) : (
              <div className="w-8 h-[52px] sm:w-10 sm:h-[58px] md:w-11 md:h-[62px] border-2 border-dashed border-border rounded-[3px] flex items-center justify-center bg-black/20 opacity-40">
                <span className="font-pixel text-[8px] sm:text-[10px] text-nes-gray">{index + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
