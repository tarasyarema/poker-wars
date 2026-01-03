import type { Pot as PotType } from '../../types/game';

interface PotProps {
  pots: PotType[];
}

// Chip component for visual representation
function ChipStack({ amount, color = 'yellow' }: { amount: number; color?: 'yellow' | 'red' | 'blue' | 'green' }) {
  // Calculate number of chips based on amount
  const chipCount = Math.min(8, Math.max(1, Math.ceil(amount / 50)));

  const colorClasses = {
    yellow: 'bg-nes-yellow border-yellow-700',
    red: 'bg-nes-red border-red-900',
    blue: 'bg-nes-blue border-blue-900',
    green: 'bg-nes-green border-green-900',
  };

  return (
    <div className="relative flex items-end justify-center" style={{ height: `${chipCount * 4 + 12}px` }}>
      {Array(chipCount).fill(null).map((_, i) => (
        <div
          key={i}
          className={`absolute w-6 h-2 rounded-full ${colorClasses[color]} border-b-2 shadow-sm`}
          style={{
            bottom: `${i * 4}px`,
            zIndex: i,
          }}
        >
          {/* Chip edge detail */}
          <div className="absolute inset-x-1 top-0.5 h-0.5 bg-white/30 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function Pot({ pots }: PotProps) {
  const totalPot = pots.reduce((sum, pot) => sum + pot.size, 0);

  if (totalPot === 0) {
    return null;
  }

  // Determine chip colors based on pot size
  const getChipColors = (amount: number): Array<'yellow' | 'red' | 'blue' | 'green'> => {
    if (amount >= 500) return ['yellow', 'red', 'blue'];
    if (amount >= 200) return ['yellow', 'red'];
    return ['yellow'];
  };

  const chipColors = getChipColors(totalPot);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Chip stacks visual */}
      <div className="flex items-end justify-center gap-1">
        {chipColors.map((color, idx) => (
          <ChipStack key={idx} amount={totalPot / chipColors.length} color={color} />
        ))}
      </div>

      {/* Pot info */}
      <div className="flex flex-col items-center gap-0.5 bg-bg-dark py-1.5 px-3 border-[3px] border-nes-yellow">
        <span className="font-pixel text-[7px] text-nes-gray tracking-[2px]">POT</span>
        <span className="font-pixel text-[14px] text-nes-yellow">{totalPot.toLocaleString()}</span>
      </div>

      {/* Side pots */}
      {pots.length > 1 && (
        <div className="flex gap-2 mt-1">
          {pots.map((pot, index) => (
            <div key={index} className="flex flex-col items-center py-1 px-2 bg-bg-panel border-2 border-border font-pixel">
              <span className="text-[7px] text-nes-gray tracking-[1px]">
                {index === 0 ? 'MAIN' : `SIDE ${index}`}
              </span>
              <span className="text-[10px] text-nes-cyan">{pot.size}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
