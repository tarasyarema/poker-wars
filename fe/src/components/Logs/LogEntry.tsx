import type { Card, LogEvent, LogEventReasoning, LogEventHandStart, LogEventHandEnd } from '../../types/game';
import { TypewriterText } from './TypewriterText';

// Format cards for display with suit symbols
function formatCard(card: Card): { rank: string; suit: string; color: string } {
  const suitSymbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  const suitColors: Record<string, string> = {
    hearts: 'var(--color-nes-red)',
    diamonds: 'var(--color-nes-red)',
    clubs: 'var(--color-nes-white)',
    spades: 'var(--color-nes-white)',
  };
  return {
    rank: card.rank,
    suit: suitSymbols[card.suit] || card.suit,
    color: suitColors[card.suit] || 'var(--color-nes-white)',
  };
}

// Grouped reasoning event type from Logs.tsx
interface GroupedLogEvent {
  type: 'grouped_reasoning';
  events: LogEventReasoning[];
  combinedReasoning: string;
  timestamp: string;
  handNumber: number;
  playerIndex: number;
  model: string;
}

type DisplayLogEvent = LogEvent | GroupedLogEvent;

interface LogEntryProps {
  log: DisplayLogEvent;
  isLatest: boolean;
}

export function LogEntry({ log, isLatest }: LogEntryProps) {
  const getShortModelName = (model: string) => {
    const parts = model.split('/');
    const name = parts[parts.length - 1] || model;
    // Take first part and optionally version/variant, max 12 chars
    const simplified = name.replace(/-?(instruct|non-reasoning|fast|lite|next|chat)$/i, '');
    return simplified.toUpperCase().slice(0, 12);
  };

  const modelName = getShortModelName(log.model);

  const renderContent = () => {
    switch (log.type) {
      case 'start':
        return (
          <div className="mb-4 font-terminal text-[18px] py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">&#129302;</span>
              <span className="font-pixel text-[10px] text-nes-cyan">[{modelName}]</span>
              <span className="text-nes-orange animate-pulse">ANALYZING...</span>
            </div>
          </div>
        );

      case 'reasoning':
        return (
          <div className="mb-4 font-terminal text-[18px] pl-4 ml-1 border-l-[3px] border-nes-green">
            <div className="text-nes-white leading-relaxed text-[18px] break-words">
              <TypewriterText
                text={log.reasoning}
                speed={isLatest ? 15 : 0}
                skipAnimation={!isLatest}
              />
            </div>
          </div>
        );

      case 'grouped_reasoning':
        return (
          <div className="mb-4 font-terminal text-[18px] pl-4 ml-1 border-l-[3px] border-nes-green">
            <div className="text-nes-white leading-relaxed text-[18px] break-words">
              <TypewriterText
                text={log.combinedReasoning}
                speed={isLatest ? 15 : 0}
                skipAnimation={!isLatest}
              />
            </div>
          </div>
        );

      case 'tool_call':
        return (
          <div className="mb-4 font-terminal text-[18px] py-2">
            <div className="flex items-start gap-2 bg-bg-dark p-2 border-2 border-border font-terminal text-[14px]">
              <span className="text-nes-pink shrink-0">&gt;</span>
              <span className="text-nes-orange break-all">
                {log.toolCall.name}({JSON.stringify(log.toolCall.input)})
              </span>
            </div>
          </div>
        );

      case 'decision': {
        const actionColor = getActionColor(log.decision.action);
        const topBorderColor = getTopBorderColor(log.decision.action);
        return (
          <div className="mb-4 font-terminal text-[18px] py-2">
            <div className={`bg-bg-dark border-[3px] border-border p-4 relative ${topBorderColor}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-nes-pink">P{log.playerIndex}</span>
                  <span className="font-pixel text-[10px] text-nes-cyan">[{modelName}]</span>
                  {/* Show hole cards */}
                  {log.holeCards && log.holeCards.length === 2 && (
                    <span className="font-pixel text-[12px]">
                      {log.holeCards.map((card, i) => {
                        const { rank, suit, color } = formatCard(card);
                        return (
                          <span key={i} style={{ color }} className="mx-0.5">
                            {rank}{suit}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </div>
                <span className="font-pixel text-[8px] text-nes-gray">{(log.durationMs / 1000).toFixed(2)}s</span>
              </div>
              <div className="font-pixel text-[16px]" style={{ color: actionColor }}>
                {log.decision.action.toUpperCase()}
                {log.decision.amount !== undefined && (
                  <span className="text-nes-yellow ml-2">{log.decision.amount}</span>
                )}
              </div>
              {/* Show reasoning if present */}
              {log.decision.reasoning && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-nes-white leading-relaxed text-[14px] break-words whitespace-pre-wrap opacity-80">
                    {log.decision.reasoning}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'hand_start': {
        const handStartLog = log as LogEventHandStart;
        return (
          <div className="mb-4 py-3">
            <div className="bg-nes-green/20 border-[3px] border-nes-green p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">&#127183;</span>
                  <span className="font-pixel text-[12px] text-nes-green">HAND #{handStartLog.handNumber}</span>
                </div>
                <span className="font-pixel text-[10px] text-nes-gray">
                  BLINDS {handStartLog.blinds.smallBlind}/{handStartLog.blinds.bigBlind}
                </span>
              </div>
              <div className="mt-2 font-pixel text-[8px] text-nes-gray">
                {handStartLog.players.length} PLAYERS ACTIVE
              </div>
            </div>
          </div>
        );
      }

      case 'hand_end': {
        const handEndLog = log as LogEventHandEnd;
        const winnerText = handEndLog.winners.length > 0
          ? handEndLog.winners.map(w => `P${w.playerIndex}${w.handDescription ? ` (${w.handDescription})` : ''}`).join(', ')
          : 'No winner';
        return (
          <div className="mb-4 py-3">
            <div className="bg-rank-gold/20 border-[3px] border-rank-gold p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">&#9813;</span>
                  <span className="font-pixel text-[12px] text-rank-gold">HAND #{handEndLog.handNumber} COMPLETE</span>
                </div>
                <span className="font-pixel text-[10px] text-nes-yellow">
                  POT: {handEndLog.potSize}
                </span>
              </div>
              <div className="mt-2 font-pixel text-[10px] text-rank-gold">
                WINNER: {winnerText}
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return renderContent();
}

function getActionColor(action: string): string {
  switch (action) {
    case 'fold':
      return 'var(--color-nes-red)';
    case 'check':
    case 'call':
      return 'var(--color-nes-blue)';
    case 'bet':
    case 'raise':
      return 'var(--color-nes-yellow)';
    default:
      return 'var(--color-nes-white)';
  }
}

function getTopBorderColor(action: string): string {
  switch (action) {
    case 'fold':
      return 'border-t-nes-red';
    case 'check':
    case 'call':
      return 'border-t-nes-blue';
    case 'bet':
    case 'raise':
      return 'border-t-nes-yellow';
    default:
      return '';
  }
}
