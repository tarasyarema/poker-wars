import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGameState } from './hooks/useGameState';
import { useLogStream } from './hooks/useLogStream';
import { useGamesList } from './hooks/useGamesList';
import { useResponsive } from './hooks/useResponsive';
import { Board } from './components/Board/Board';
import { Logs } from './components/Logs/Logs';
import { MobileDrawer } from './components/MobileDrawer';
import { WinnerModal } from './components/WinnerModal';
import { GamesListModal } from './components/GamesListModal';
import { API_URL } from './utils/api';
import type { Player } from './types/game';

function App() {
  const { gameState, loading, error, refetch } = useGameState(500);
  const { logs, connected, clearLogs } = useLogStream();
  const { games, loading: gamesLoading, error: gamesError, fetchGames } = useGamesList();
  const { sidebarOpen, toggleSidebar, closeSidebar } = useResponsive();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [lastGameStatus, setLastGameStatus] = useState<string | null>(null);

  // Show winner modal when game transitions to 'completed'
  useEffect(() => {
    const currentStatus = gameState?.game.status;
    if (currentStatus === 'completed' && lastGameStatus !== 'completed') {
      setShowWinnerModal(true);
    }
    if (currentStatus) {
      setLastGameStatus(currentStatus);
    }
  }, [gameState?.game.status, lastGameStatus]);

  const startGame = useCallback(async () => {
    setIsStarting(true);
    setStartError(null);
    clearLogs();

    try {
      const response = await fetch(`${API_URL}/api/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!data.success) {
        setStartError(data.error || 'Failed to start game');
      } else {
        await refetch();
      }
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsStarting(false);
    }
  }, [refetch, clearLogs]);

  // Find chip leader
  const getChipLeader = (): Player | null => {
    if (!gameState?.game.players) return null;
    const activePlayers = gameState.game.players.filter(p => !p.isEliminated);
    if (activePlayers.length === 0) return null;
    return activePlayers.reduce((leader, p) => (p.stack > leader.stack ? p : leader), activePlayers[0]);
  };

  const getShortModelName = (model: string) => {
    const parts = model.split('/');
    const name = parts[parts.length - 1] || model;
    // Take first part and optionally version/variant, max 12 chars
    const simplified = name.replace(/-?(instruct|non-reasoning|fast|lite|next|chat)$/i, '');
    return simplified.toUpperCase().slice(0, 12);
  };

  // Check if we should show the start game screen
  const noGameInProgress = error?.includes('No game') || error?.includes('404');

  // Find winner player if game is completed
  const winner = gameState?.game.winner !== null && gameState?.game.winner !== undefined
    ? gameState.game.players.find(p => p.index === gameState.game.winner)
    : null;

  const chipLeader = getChipLeader();

  // Derive current hand number from logs (more reliable than game state)
  const currentHandNumber = useMemo(() => {
    if (logs.length > 0) {
      return Math.max(...logs.map(l => l.handNumber));
    }
    return gameState?.currentHand?.handNumber ?? gameState?.game.currentHandNumber ?? null;
  }, [logs, gameState?.currentHand?.handNumber, gameState?.game.currentHandNumber]);

  // Loading Screen
  if (loading && !gameState) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-bg-dark">
        <div className="text-center flex flex-col items-center gap-6">
          <h1 className="font-pixel text-[32px] text-nes-pink m-0">POKER WARS</h1>
          <div className="w-[300px] h-5 bg-bg-panel pixel-border relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full w-[30%] bg-nes-cyan"
              style={{ animation: 'loading-slide 1.5s ease-in-out infinite' }}
            />
          </div>
          <p className="font-pixel text-[10px] text-nes-gray tracking-[3px] m-0 animate-pulse-slow">
            INITIALIZING TOURNAMENT...
          </p>
        </div>
        <style>{`
          @keyframes loading-slide {
            0% { left: -30%; }
            100% { left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // Start Game Screen
  if (noGameInProgress && !gameState) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-bg-dark">
        <div className="text-center flex flex-col items-center gap-6 p-8">
          <h1 className="font-pixel text-[48px] text-nes-pink m-0 tracking-[4px]">POKER WARS</h1>
          <p className="font-pixel text-[12px] text-nes-yellow m-0 tracking-[8px]">AI TOURNAMENT</p>

          <div className="flex gap-6 text-[24px] my-4">
            <span className="text-nes-blue">&#9824;</span>
            <span className="text-nes-red">&#9829;</span>
            <span className="text-nes-pink">&#9830;</span>
            <span className="text-nes-green">&#9827;</span>
          </div>

          <button
            className="font-pixel text-[16px] py-4 px-8 bg-transparent text-nes-green border-[3px] border-nes-green cursor-pointer uppercase tracking-[2px] transition-all duration-200 hover:bg-nes-green hover:text-bg-dark active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:animate-pulse-slow"
            onClick={startGame}
            disabled={isStarting}
          >
            {isStarting ? 'STARTING...' : 'START GAME'}
          </button>

          {startError && (
            <p className="font-pixel text-[10px] text-nes-red m-0 py-2 px-4 bg-bg-panel border-2 border-nes-red">
              {startError}
            </p>
          )}

          <p className="font-pixel text-[8px] text-nes-gray tracking-[1px] m-0">
            Press to begin the AI poker tournament
          </p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error && !gameState && !noGameInProgress) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-bg-dark">
        <div className="text-center flex flex-col items-center gap-4 p-8 bg-bg-panel border-[3px] border-nes-red">
          <h1 className="font-pixel text-[20px] text-nes-red m-0">CONNECTION ERROR</h1>
          <p className="font-terminal text-[18px] text-nes-white m-0">{error}</p>
          <p className="font-pixel text-[8px] text-nes-gray tracking-[1px] m-0">
            Check that the backend server is running
          </p>
        </div>
      </div>
    );
  }

  // Main Game Screen - Full-screen table with floating sidebar
  return (
    <div className="h-screen w-screen bg-bg-dark overflow-hidden relative">
      {/* Compact Header - overlaid at top */}
      <header className="fixed top-0 left-0 right-0 lg:right-80 xl:right-96 h-12 bg-bg-dark/90 backdrop-blur z-40 flex items-center justify-between px-4 border-b-[3px] border-border">
        {/* Left: Hand info (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-4">
          {gameState?.game.status === 'in_progress' && currentHandNumber != null && (
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[10px] text-nes-gray">HAND</span>
              <span className="font-pixel text-sm text-nes-pink">#{currentHandNumber}</span>
            </div>
          )}
          {gameState?.game.blinds && (
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[10px] text-nes-gray">BLINDS</span>
              <span className="font-pixel text-sm text-nes-cyan">
                {gameState.game.blinds.smallBlind}/{gameState.game.blinds.bigBlind}
              </span>
            </div>
          )}
        </div>

        {/* Mobile: Hand # only */}
        <div className="flex sm:hidden items-center">
          {gameState?.game.status === 'in_progress' && currentHandNumber != null && (
            <span className="font-pixel text-[10px] text-nes-pink">#{currentHandNumber}</span>
          )}
        </div>

        {/* Center: Logo */}
        <div className="flex items-center gap-2">
          <span className="font-pixel text-sm sm:text-lg text-nes-pink">POKER</span>
          <span className="font-pixel text-sm sm:text-lg text-nes-yellow">WARS</span>
        </div>

        {/* Right: Chip leader (hidden on mobile) + sidebar toggle */}
        <div className="flex items-center gap-2">
          {chipLeader && (
            <div className="hidden md:flex items-center gap-2">
              <span className="font-pixel text-[10px] text-nes-gray">LEADER</span>
              <span className="font-pixel text-sm text-rank-gold">
                {getShortModelName(chipLeader.model)}
              </span>
              <span className="text-rank-gold">$</span>
              <span className="font-pixel text-sm text-rank-gold">
                {chipLeader.stack.toLocaleString()}
              </span>
            </div>
          )}
          {/* Sidebar toggle button - mobile/tablet only */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden font-pixel text-[10px] px-2 py-1 border-2 border-nes-green text-nes-green hover:bg-nes-green hover:text-bg-dark transition-colors"
            aria-label="Toggle chat"
          >
            CHAT
          </button>
        </div>
      </header>

      {/* Leaderboard - floating top left (hidden on mobile/small tablets) */}
      {gameState?.game.players && gameState.game.players.length > 0 && (
        <div className="hidden md:block fixed top-14 left-4 z-30 bg-bg-panel/95 backdrop-blur border-[3px] border-border p-2 min-w-[140px]">
          <div className="font-pixel text-[8px] text-nes-gray tracking-[1px] mb-2 pb-1 border-b border-border">
            LEADERBOARD
          </div>
          <div className="flex flex-col gap-1">
            {[...gameState.game.players]
              .sort((a, b) => b.stack - a.stack)
              .map((player, idx) => {
                const isLeader = idx === 0 && !player.isEliminated;
                const isEliminated = player.isEliminated;
                const isThinking = gameState.currentHand?.playerToAct === player.index;
                // Check if player has folded (not in currentHand.players)
                const playersInHand = new Set(gameState.currentHand?.players.map(p => p.index) ?? []);
                const isFolded = gameState.currentHand && !isEliminated && !playersInHand.has(player.index);
                return (
                  <div
                    key={player.index}
                    className={`flex items-center justify-between gap-2 font-pixel text-[10px] ${
                      isEliminated ? 'opacity-40 line-through' : ''
                    } ${isFolded ? 'opacity-50 grayscale' : ''} ${isThinking ? 'bg-nes-green/20' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`w-3 text-center ${isLeader ? 'text-rank-gold' : 'text-nes-gray'}`}>
                        {idx + 1}
                      </span>
                      <span className={isLeader ? 'text-rank-gold' : 'text-nes-cyan'}>
                        {getShortModelName(player.model)}
                      </span>
                      {isThinking && (
                        <span className="text-[8px] text-nes-green animate-pulse ml-1">
                          THINKING...
                        </span>
                      )}
                      {isFolded && (
                        <span className="text-[8px] text-nes-red ml-1">
                          FOLD
                        </span>
                      )}
                    </div>
                    <span className={isLeader ? 'text-rank-gold' : 'text-nes-yellow'}>
                      {player.stack.toLocaleString()}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Full-screen poker table area */}
      <main className="w-full h-full pt-12 pb-10 pr-0 lg:pr-80 xl:pr-96">
        <Board
          currentHand={gameState?.currentHand || null}
          players={gameState?.game.players || []}
          buttonPosition={gameState?.game.buttonPosition || 0}
          chipLeaderIndex={chipLeader?.index}
        />
      </main>

      {/* Desktop sidebar - fixed right */}
      <aside className="hidden lg:flex fixed right-0 top-0 h-full w-80 xl:w-96 bg-bg-panel/95 backdrop-blur border-l-[3px] border-nes-green flex-col z-50">
        <Logs
          logs={logs}
          connected={connected}
          hands={gameState?.hands || []}
          players={gameState?.game.players || []}
          currentHandNumber={currentHandNumber}
        />
      </aside>

      {/* Mobile/Tablet drawer */}
      <MobileDrawer isOpen={sidebarOpen} onClose={closeSidebar}>
        <Logs
          logs={logs}
          connected={connected}
          hands={gameState?.hands || []}
          players={gameState?.game.players || []}
          currentHandNumber={currentHandNumber}
          isDrawer
          onClose={closeSidebar}
        />
      </MobileDrawer>

      {/* Footer bar */}
      <footer className="fixed bottom-0 left-0 right-0 lg:right-80 xl:right-96 h-10 bg-bg-dark/90 backdrop-blur z-40 flex items-center justify-between px-2 sm:px-4 border-t-[3px] border-border">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 ${
              gameState?.game.status === 'in_progress'
                ? 'bg-nes-green animate-pulse'
                : gameState?.game.status === 'completed'
                  ? 'bg-rank-gold'
                  : 'bg-nes-orange'
            }`}
          />
          <span className="font-pixel text-[8px] sm:text-[10px] text-nes-gray tracking-[1px]">
            {gameState?.game.status === 'in_progress'
              ? 'LIVE'
              : gameState?.game.status === 'completed'
                ? 'DONE'
                : 'WAIT'}
          </span>
          <span className="hidden sm:inline font-pixel text-[10px] text-nes-gray tracking-[1px]">
            {gameState?.game.status === 'in_progress'
              ? '- GAME IN PROGRESS'
              : gameState?.game.status === 'completed'
                ? '- GAME COMPLETE'
                : '...'}
          </span>
        </div>

        {/* Winner announcement or tagline (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-2">
          {winner ? (
            <>
              <span className="text-rank-gold">&#9812;</span>
              <span className="font-pixel text-[10px] text-rank-gold">
                WINNER: {getShortModelName(winner.model)}
              </span>
              <span className="text-rank-gold">&#9812;</span>
            </>
          ) : (
            <>
              <span className="text-nes-blue">&#9824;</span>
              <span className="font-pixel text-[8px] text-nes-gray">WHERE SILICON MEETS FELT</span>
              <span className="text-nes-pink">&#9830;</span>
            </>
          )}
        </div>

        {/* History button and Version */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowGamesModal(true)}
            className="font-pixel text-[8px] px-2 sm:px-3 py-1 bg-bg-dark border-[2px] border-nes-cyan text-nes-cyan hover:bg-nes-cyan hover:text-bg-dark transition-colors tracking-[1px]"
          >
            HISTORY
          </button>
          <span className="hidden sm:inline text-nes-red">&#9829;</span>
          <span className="font-pixel text-[8px] text-nes-gray">v1.0</span>
        </div>
      </footer>

      {/* Winner Modal */}
      {showWinnerModal && winner && gameState?.game.players && (
        <WinnerModal
          winner={winner}
          players={gameState.game.players}
          onDismiss={() => setShowWinnerModal(false)}
        />
      )}

      {/* Games List Modal */}
      {showGamesModal && (
        <GamesListModal
          games={games}
          loading={gamesLoading}
          error={gamesError}
          onClose={() => setShowGamesModal(false)}
          onFetch={fetchGames}
        />
      )}
    </div>
  );
}

export default App;
