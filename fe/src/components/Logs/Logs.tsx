import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import type { LogEvent, LogEventReasoning, HandSummary, Player } from '../../types/game';
import { LogEntry } from './LogEntry';

interface LogsProps {
  logs: LogEvent[];
  connected: boolean;
  hands: HandSummary[];
  players: Player[];
  currentHandNumber: number | null;
}

// Threshold in pixels to consider "at bottom"
const SCROLL_THRESHOLD = 50;

// Group consecutive reasoning events from the same player into single entries
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

function groupReasoningEvents(logs: LogEvent[]): DisplayLogEvent[] {
  const result: DisplayLogEvent[] = [];
  let currentReasoningGroup: LogEventReasoning[] | null = null;

  for (const log of logs) {
    if (log.type === 'reasoning') {
      if (
        currentReasoningGroup &&
        currentReasoningGroup[0].playerIndex === log.playerIndex &&
        currentReasoningGroup[0].handNumber === log.handNumber
      ) {
        // Continue the group
        currentReasoningGroup.push(log);
      } else {
        // Flush previous group if exists
        if (currentReasoningGroup) {
          result.push({
            type: 'grouped_reasoning',
            events: currentReasoningGroup,
            combinedReasoning: currentReasoningGroup.map(e => e.reasoning).join(''),
            timestamp: currentReasoningGroup[0].timestamp,
            handNumber: currentReasoningGroup[0].handNumber,
            playerIndex: currentReasoningGroup[0].playerIndex,
            model: currentReasoningGroup[0].model,
          });
        }
        // Start new group
        currentReasoningGroup = [log];
      }
    } else {
      // Flush current group if exists
      if (currentReasoningGroup) {
        result.push({
          type: 'grouped_reasoning',
          events: currentReasoningGroup,
          combinedReasoning: currentReasoningGroup.map(e => e.reasoning).join(''),
          timestamp: currentReasoningGroup[0].timestamp,
          handNumber: currentReasoningGroup[0].handNumber,
          playerIndex: currentReasoningGroup[0].playerIndex,
          model: currentReasoningGroup[0].model,
        });
        currentReasoningGroup = null;
      }
      result.push(log);
    }
  }

  // Flush final group
  if (currentReasoningGroup) {
    result.push({
      type: 'grouped_reasoning',
      events: currentReasoningGroup,
      combinedReasoning: currentReasoningGroup.map(e => e.reasoning).join(''),
      timestamp: currentReasoningGroup[0].timestamp,
      handNumber: currentReasoningGroup[0].handNumber,
      playerIndex: currentReasoningGroup[0].playerIndex,
      model: currentReasoningGroup[0].model,
    });
  }

  return result;
}

export function Logs({ logs, connected, hands, players, currentHandNumber: propHandNumber }: LogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [selectedHand, setSelectedHand] = useState<number | 'live'>('live');

  // Get unique hand numbers from logs (excluding current hand which is shown as "live")
  const handNumbers = useMemo(() => {
    const nums = new Set(logs.map(l => l.handNumber));
    return Array.from(nums).sort((a, b) => b - a); // Descending
  }, [logs]);

  // Derive current hand number from logs (most recent/highest) as it's more reliable than game state
  const currentHandNumber = useMemo(() => {
    if (handNumbers.length > 0) {
      return handNumbers[0]; // Highest hand number from logs
    }
    return propHandNumber;
  }, [handNumbers, propHandNumber]);

  // Filter logs by selected hand
  const filteredLogs = useMemo(() => {
    if (selectedHand === 'live') {
      // Show current hand logs
      return currentHandNumber != null ? logs.filter(l => l.handNumber === currentHandNumber) : logs;
    }
    return logs.filter(l => l.handNumber === selectedHand);
  }, [logs, selectedHand, currentHandNumber]);

  // Group consecutive reasoning events
  const displayLogs = useMemo(() => groupReasoningEvents(filteredLogs), [filteredLogs]);

  // Get hand outcome for selected hand
  const selectedHandOutcome = useMemo(() => {
    const handNum = selectedHand === 'live' ? currentHandNumber : selectedHand;
    if (!handNum) return null;
    return hands.find(h => h.handNumber === handNum) || null;
  }, [hands, selectedHand, currentHandNumber]);

  // Helper to get short model name
  const getShortModelName = (model: string) => {
    const parts = model.split('/');
    const name = parts[parts.length - 1] || model;
    const simplified = name.replace(/-?(instruct|non-reasoning|fast|lite|next|chat)$/i, '');
    return simplified.toUpperCase().slice(0, 12);
  };

  // Check if scrolled to bottom
  const checkIfAtBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }, []);

  // Handle scroll events to detect when user scrolls up/down
  const handleScroll = useCallback(() => {
    setIsAtBottom(checkIfAtBottom());
  }, [checkIfAtBottom]);

  // Auto-scroll to bottom when new logs arrive (only if already at bottom)
  useEffect(() => {
    if (scrollRef.current && isAtBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isAtBottom]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b-[3px] border-nes-green flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[8px] text-nes-gray tracking-[1px]">CHAT</span>
          <select
            value={selectedHand}
            onChange={(e) => setSelectedHand(e.target.value === 'live' ? 'live' : Number(e.target.value))}
            className="font-pixel text-[8px] bg-bg-dark text-nes-cyan border border-border px-2 py-1 cursor-pointer tracking-[1px]"
          >
            <option value="live">HAND #{currentHandNumber ?? '—'} (LIVE)</option>
            {handNumbers
              .filter(n => n !== currentHandNumber)
              .map(n => (
                <option key={n} value={n}>HAND #{n}</option>
              ))
            }
          </select>
        </div>
        <div className="flex items-center gap-1.5 font-pixel text-[8px]">
          <span className={`w-2 h-2 ${connected ? 'bg-nes-green animate-pulse' : 'bg-nes-red'}`} />
          <span className={`tracking-[1px] ${connected ? 'text-nes-green' : 'text-nes-gray'}`}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 relative z-10" ref={scrollRef} onScroll={handleScroll}>
        {displayLogs.length === 0 && !selectedHandOutcome ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 relative">
            <div className="text-[32px] text-nes-green animate-pulse">&#9654;</div>
            <div className="font-pixel text-[10px] text-nes-green tracking-[2px] text-center">
              AWAITING AI TRANSMISSION...
            </div>
          </div>
        ) : (
          <>
            {displayLogs.map((log, index) => (
              <LogEntry
                key={`${log.timestamp}-${index}`}
                log={log}
                isLatest={index === displayLogs.length - 1 && selectedHand === 'live'}
              />
            ))}
            {/* Hand outcome */}
            {selectedHandOutcome && (
              <div className="mb-4 font-terminal text-[18px] py-3 border-t-[3px] border-b-[3px] border-rank-gold bg-bg-dark">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-rank-gold text-[20px]">&#9812;</span>
                  <span className="font-pixel text-[10px] text-nes-gray tracking-[1px]">HAND #{selectedHandOutcome.handNumber} COMPLETE</span>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[10px] text-nes-gray">WINNER{selectedHandOutcome.winners.length > 1 ? 'S' : ''}:</span>
                    {selectedHandOutcome.winners.map((winnerIdx, i) => {
                      const winner = players.find(p => p.index === winnerIdx);
                      return (
                        <span key={winnerIdx} className="font-pixel text-[12px] text-rank-gold">
                          {winner ? getShortModelName(winner.model) : `P${winnerIdx}`}
                          {i < selectedHandOutcome.winners.length - 1 ? ', ' : ''}
                        </span>
                      );
                    })}
                  </div>
                  {selectedHandOutcome.potSize > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-pixel text-[10px] text-nes-gray">WON:</span>
                      <span className="font-pixel text-[14px] text-nes-yellow">${selectedHandOutcome.potSize.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Scroll to bottom indicator */}
      {!isAtBottom && (
        <button
          onClick={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-nes-green text-black font-pixel text-[8px] px-3 py-1.5 z-20 cursor-pointer hover:bg-white transition-colors tracking-[1px]"
        >
          ↓ SCROLL TO BOTTOM
        </button>
      )}

      {/* Footer */}
      <div className="p-2 px-4 border-t-[3px] border-nes-green relative z-10">
        <div className="flex justify-between">
          <span className="font-pixel text-[8px] text-nes-gray tracking-[1px]">
            {selectedHand === 'live' ? 'LIVE' : `HAND #${selectedHand}`}
          </span>
          <span className="font-pixel text-[8px] text-nes-gray tracking-[1px]">{filteredLogs.length} EVENTS</span>
        </div>
      </div>
    </div>
  );
}
