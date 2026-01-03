import type { CurrentHand, Player } from '../../types/game';
import { CommunityCards } from './CommunityCards';
import { Pot } from './Pot';
import { PlayerSeat } from './PlayerSeat';

interface BoardProps {
  currentHand: CurrentHand | null;
  players: Player[];
  buttonPosition: number;
  chipLeaderIndex?: number;
}

export function Board({ currentHand, players, buttonPosition, chipLeaderIndex }: BoardProps) {
  // Get indices of players still in the current hand
  const playersInHand = new Set(currentHand?.players.map(p => p.index) ?? []);

  // Merge game players with current hand players for complete info
  const getPlayerInfo = (index: number): Player => {
    const handPlayer = currentHand?.players.find(p => p.index === index);
    const gamePlayer = players.find(p => p.index === index);

    // Player has folded if there's an active hand and they're not in currentHand.players
    const hasFolded = currentHand && !playersInHand.has(index);

    if (gamePlayer) {
      return {
        ...gamePlayer,
        // Player is active only if they're in the current hand
        isActive: !hasFolded,
        // Use betSize from current hand (includes blinds/bets), fallback to 0
        betSize: handPlayer?.betSize ?? 0,
        holeCards: handPlayer?.holeCards,
      };
    }

    return {
      index,
      model: 'unknown',
      stack: 0,
      betSize: 0,
      isEliminated: true,
      isActive: false,
    };
  };

  // Show all players (including eliminated ones with BROKE overlay)
  const allPlayers = players;

  return (
    <div
      className="relative w-full h-full min-h-0 overflow-visible"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(13, 92, 46, 0.3) 0%, var(--color-bg-dark) 70%)',
      }}
    >
      {/* Poker table - centered, larger for full screen */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-[50%]"
        style={{
          width: 'clamp(400px, 60vw, 900px)',
          height: 'clamp(200px, 40vh, 500px)',
          background: 'linear-gradient(180deg, #3d2817 0%, #2a1a0f 50%, #1a0f08 100%)',
        }}
      >
        {/* Yellow border accent */}
        <div
          className="absolute top-[3px] left-[3px] right-[3px] bottom-[3px] rounded-[50%] border-[3px] border-nes-yellow/30 pointer-events-none"
        />

        {/* Table felt */}
        <div
          className="w-full h-full rounded-[50%] relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, var(--color-felt-green-light) 0%, var(--color-felt-green) 30%, var(--color-felt-green-dark) 100%)',
          }}
        >
          {/* Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-pixel text-[48px] text-nes-yellow/10 pointer-events-none select-none">
            PW
          </div>
        </div>
      </div>

      {/* Center area - cards and pot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10">
        {currentHand ? (
          <>
            <CommunityCards cards={currentHand.communityCards} />
            <Pot pots={currentHand.pots} />
            <div className="flex flex-col items-center gap-0.5 py-1 px-3 bg-bg-dark border-[3px] border-nes-blue">
              <span className="font-pixel text-[7px] text-nes-gray tracking-[2px]">ROUND</span>
              <span className="font-pixel text-[10px] text-nes-blue tracking-[1px]">{currentHand.round.toUpperCase()}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            <span className="font-pixel text-[10px] text-nes-gray tracking-[2px]">WAITING FOR HAND</span>
            <div className="flex gap-2">
              <span className="text-[14px] text-nes-pink animate-pulse" style={{ animationDelay: '0s' }}>●</span>
              <span className="text-[14px] text-nes-pink animate-pulse" style={{ animationDelay: '0.3s' }}>●</span>
              <span className="text-[14px] text-nes-pink animate-pulse" style={{ animationDelay: '0.6s' }}>●</span>
            </div>
          </div>
        )}
      </div>

      {/* Player seats - positioned OUTSIDE the table */}
      {allPlayers.map((player, idx) => (
        <PlayerSeat
          key={player.index}
          player={getPlayerInfo(player.index)}
          isDealer={buttonPosition === player.index}
          isPlayerToAct={currentHand?.playerToAct === player.index}
          isChipLeader={chipLeaderIndex === player.index}
          position={idx}
          totalPositions={allPlayers.length}
        />
      ))}
    </div>
  );
}
