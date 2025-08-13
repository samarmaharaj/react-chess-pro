
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Piece, Square } from 'react-chessboard/dist/chessboard/types';
import { Chess } from 'chess.js';
import { GameMode, AIDifficulty, Player, Theme } from './types';
import type { HistoryEntry, Move } from './types';
import { THEME_COLORS, INITIAL_FEN } from './constants';
import { getAIMove } from './services/aiService';

// --- Helper Icons ---
const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

export default function App() {
    const [game, setGame] = useState(() => new Chess());
    const [fen, setFen] = useState(game.fen());
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    
    const [gameMode, setGameMode] = useState<GameMode>(GameMode.AI);
    const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(AIDifficulty.EASY);
    const [playerColor, setPlayerColor] = useState<Player>(Player.White);
    
    const [theme, setTheme] = useState<Theme>('light');
    const [lastMove, setLastMove] = useState<Move | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');

    // State for showing legal moves
    const [moveFrom, setMoveFrom] = useState<Square | null>(null);
    const [moveOptions, setMoveOptions] = useState<{ [key: string]: React.CSSProperties }>({});
    
    // State for Online Mode
    const [onlineGameCode, setOnlineGameCode] = useState<string | null>(null);
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [onlineCodeInputValue, setOnlineCodeInputValue] = useState('');
    const [notification, setNotification] = useState<string | null>(null);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    const updateStatus = useCallback(() => {
        let newStatus = `Turn: ${game.turn() === 'w' ? 'White' : 'Black'}`;
        if (game.isCheckmate()) {
            newStatus = `CHECKMATE! ${game.turn() === 'w' ? 'Black' : 'White'} wins.`;
        } else if (game.isDraw()) {
            newStatus = 'DRAW!';
        } else if (game.isStalemate()) {
            newStatus = 'STALEMATE!';
        } else if (game.isCheck()) {
            newStatus = `CHECK! ${newStatus}`;
        }
        setStatus(newStatus);
    }, [game]);

    useEffect(() => {
        updateStatus();
    }, [fen, updateStatus]);
    
    const makeMove = useCallback((move: Move | string): boolean => {
        try {
            const result = game.move(move);
            if (result) {
                const newFen = game.fen();
                setFen(newFen);
                setLastMove({ from: result.from, to: result.to });
                setHistory(h => [...h, { fen: newFen, move: {from: result.from, to: result.to} }]);
                
                if (gameMode === GameMode.ONLINE) {
                    setOnlineGameCode(newFen);
                    navigator.clipboard.writeText(newFen).then(() => {
                        showNotification("New game code copied to clipboard!");
                    });
                }

                updateStatus();
                return true;
            }
        } catch (error) {
            // This can happen if the move is invalid. It's expected, so no console log is needed.
            return false;
        }
        return false;
    }, [game, updateStatus, gameMode]);
    
    const onSquareClick = (square: Square) => {
        const isMyTurn = gameMode === GameMode.HOTSEAT || (game.turn() === playerColor);
        if (isLoading || !isMyTurn || game.isGameOver()) {
            return;
        }

        if (square === moveFrom) {
            setMoveFrom(null);
            setMoveOptions({});
            return;
        }

        if (moveFrom) {
            const moveSuccessful = makeMove({ from: moveFrom, to: square, promotion: 'q' });
            setMoveFrom(null);
            setMoveOptions({});
            if (moveSuccessful) {
                return;
            }
        }
        
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            const legalMoves = game.moves({ square: square, verbose: true });
            if (legalMoves.length > 0) {
                const newOptions: { [key: string]: React.CSSProperties } = {};
                legalMoves.forEach(move => {
                    newOptions[move.to] = {
                        background: 'radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)',
                        borderRadius: '50%',
                    };
                });
                newOptions[square] = {
                    backgroundColor: 'rgba(255, 255, 0, 0.4)',
                };
                setMoveFrom(square);
                setMoveOptions(newOptions);
            }
        }
    };

    const handlePieceDrop = useCallback((sourceSquare: Square, targetSquare: Square, _piece: Piece): boolean => {
        const isMyTurn = gameMode === GameMode.HOTSEAT || (game.turn() === playerColor);
        if (isLoading || !isMyTurn) return false;
        
        setMoveFrom(null);
        setMoveOptions({});

        const move = {
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q',
        };

        return makeMove(move);
    }, [isLoading, gameMode, playerColor, makeMove]);

    const resetGame = useCallback(() => {
        const newGame = new Chess();
        setGame(newGame);
        setFen(newGame.fen());
        setHistory([]);
        setLastMove(null);
        setIsLoading(false);
        setPlayerColor(Player.White);
        setMoveFrom(null);
        setMoveOptions({});
        setOnlineGameCode(null);
        setShowJoinInput(false);
        setOnlineCodeInputValue('');
        updateStatus();
    }, [updateStatus]);

    const handleGameModeChange = (newMode: GameMode) => {
        resetGame();
        setGameMode(newMode);
    };
    
    const undoMove = () => {
        if (history.length === 0 || gameMode === GameMode.ONLINE) return;

        setMoveFrom(null);
        setMoveOptions({});

        game.undo();
        if (gameMode === GameMode.AI && history.length > 1) {
            game.undo();
        }
        
        const newHistory = history.slice(0, gameMode === GameMode.AI ? -2 : -1);
        setHistory(newHistory);
        setFen(game.fen());
        setLastMove(newHistory.length > 0 ? newHistory[newHistory.length - 1].move : null);
        updateStatus();
    };
    
    const triggerAIMove = useCallback(async () => {
        if (!game.isGameOver() && gameMode === GameMode.AI && game.turn() !== playerColor) {
            setIsLoading(true);
            const aiMove = await getAIMove(aiDifficulty, game);
            setIsLoading(false);
            if (aiMove) {
                makeMove(aiMove);
            }
        }
    }, [game, gameMode, playerColor, aiDifficulty, makeMove]);

    useEffect(() => {
        triggerAIMove();
    }, [fen, playerColor, triggerAIMove]);

    const boardTheme = useMemo(() => THEME_COLORS[theme], [theme]);

    const squareStyles = useMemo(() => {
        const styles: { [key: string]: React.CSSProperties } = { ...moveOptions };
        if (lastMove) {
            styles[lastMove.from] = {
                ...(styles[lastMove.from] || {}),
                backgroundColor: 'rgba(255, 255, 0, 0.4)',
            };
            styles[lastMove.to] = {
                ...(styles[lastMove.to] || {}),
                backgroundColor: 'rgba(255, 255, 0, 0.4)',
            };
        }
        return styles;
    }, [lastMove, moveOptions]);
    
    const copyFenToClipboard = () => {
        navigator.clipboard.writeText(fen);
        showNotification('FEN copied to clipboard!');
    };

    // --- Online Mode Handlers ---
    const handleCreateOnlineGame = () => {
        resetGame();
        setPlayerColor(Player.White);
        setOnlineGameCode(INITIAL_FEN);
        showNotification("New game created! Send the code to your friend.");
    };

    const handleJoinGame = () => {
        try {
            const newGame = new Chess(onlineCodeInputValue);
            setGame(newGame);
            setFen(newGame.fen());
            setHistory([]);
            setLastMove(null);
            setPlayerColor(newGame.turn() as Player);
            setOnlineGameCode(onlineCodeInputValue);
            setOnlineCodeInputValue('');
            setShowJoinInput(false);
            updateStatus();
            showNotification("Game joined! It's your turn.");
        } catch (e) {
            showNotification("Invalid Game Code.");
        }
    };

    const handleSyncGameState = () => {
        try {
            if (onlineCodeInputValue === onlineGameCode) {
                 showNotification("This is the current game state.");
                 return;
            }
            const newGame = new Chess(onlineCodeInputValue);
            setGame(newGame);
            setFen(newGame.fen());
            setHistory([]);
            setOnlineGameCode(onlineCodeInputValue);
            setOnlineCodeInputValue('');
            updateStatus();
            showNotification("Board updated! It's your turn.");
        } catch(e) {
            showNotification("Invalid code from friend.");
        }
    };

    const OnlineGamePanel = () => {
        if (!onlineGameCode) {
            return (
                <div>
                    <label className="font-semibold block mb-2">Play with a Friend</label>
                    <div className="flex flex-col gap-2">
                        <button onClick={handleCreateOnlineGame} className="w-full p-2 rounded-md transition-colors bg-blue-500 text-white hover:bg-blue-600">Create New Game</button>
                        <button onClick={() => setShowJoinInput(s => !s)} className="w-full p-2 rounded-md transition-colors bg-light-primary dark:bg-dark-primary">Join Game</button>
                    </div>
                    {showJoinInput && (
                        <div className="mt-2 flex gap-2">
                            <input type="text" placeholder="Paste Game Code" value={onlineCodeInputValue} onChange={(e) => setOnlineCodeInputValue(e.target.value)} className="w-full p-2 rounded-md bg-light-primary dark:bg-dark-primary border-none"/>
                            <button onClick={handleJoinGame} className="p-2 rounded-md bg-green-500 text-white">Join</button>
                        </div>
                    )}
                </div>
            );
        }

        const isMyTurn = game.turn() === playerColor;

        return (
            <div>
                <label className="font-semibold block mb-2">Online Match</label>
                <p className="text-sm">You are playing as {playerColor === Player.White ? 'White' : 'Black'}.</p>
                {isMyTurn ? <p className="font-bold text-green-500 my-2">It's your turn!</p> : <p className="font-bold text-yellow-500 my-2">Waiting for opponent...</p>}
                
                {!isMyTurn && (
                    <div className="mt-2">
                        <label className="text-sm">Paste friend's move code:</label>
                        <div className="flex gap-2 mt-1">
                           <input type="text" value={onlineCodeInputValue} onChange={(e) => setOnlineCodeInputValue(e.target.value)} className="w-full p-2 rounded-md bg-light-primary dark:bg-dark-primary border-none" />
                           <button onClick={handleSyncGameState} className="p-2 rounded-md bg-blue-500 text-white">Sync</button>
                        </div>
                    </div>
                )}
                
                <div className="mt-4">
                    <label className="font-semibold block text-sm">Game Code (send to friend)</label>
                    <div className="flex gap-2 mt-1">
                        <input type="text" readOnly value={onlineGameCode} className="w-full p-2 rounded-md bg-light-primary dark:bg-dark-primary border-none text-xs" />
                        <button onClick={() => { navigator.clipboard.writeText(onlineGameCode); showNotification('Game code copied!'); }} className="p-2 rounded-md bg-purple-500 text-white">Copy</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-sans relative">
             {notification && (
                <div className="absolute top-5 bg-blue-500 text-white py-2 px-4 rounded-lg shadow-lg animate-bounce z-50">
                    {notification}
                </div>
            )}
            <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-4">
                
                <div className="w-full lg:w-2/3 flex flex-col items-center">
                    <div className="w-full aspect-square max-w-[70vh]">
                      <Chessboard
                          position={fen}
                          onPieceDrop={handlePieceDrop}
                          onSquareClick={onSquareClick}
                          boardOrientation={playerColor === Player.White ? 'white' : 'black'}
                          customBoardStyle={{ borderRadius: '8px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)' }}
                          customSquareStyles={squareStyles}
                          customDarkSquareStyle={{ backgroundColor: boardTheme.squareDark }}
                          customLightSquareStyle={{ backgroundColor: boardTheme.squareLight }}
                      />
                    </div>
                    <div className="w-full mt-2 p-2 text-center bg-light-surface dark:bg-dark-surface rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold">{status}</h3>
                        {isLoading && gameMode === GameMode.AI && <p className="text-sm animate-pulse">AI is thinking...</p>}
                    </div>
                </div>

                <div className="w-full lg:w-1/3 bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-lg">
                    <h1 className="text-3xl font-bold text-center mb-4">React Chess Pro</h1>

                    <div className="space-y-4">
                        <div>
                            <label className="font-semibold block mb-2">Game Mode</label>
                            <div className="flex gap-2">
                                <button onClick={() => handleGameModeChange(GameMode.AI)} className={`w-full p-2 rounded-md transition-colors ${gameMode === GameMode.AI ? 'bg-blue-500 text-white' : 'bg-light-primary dark:bg-dark-primary'}`}>Player vs AI</button>
                                <button onClick={() => handleGameModeChange(GameMode.HOTSEAT)} className={`w-full p-2 rounded-md transition-colors ${gameMode === GameMode.HOTSEAT ? 'bg-blue-500 text-white' : 'bg-light-primary dark:bg-dark-primary'}`}>Hotseat</button>
                                <button onClick={() => handleGameModeChange(GameMode.ONLINE)} className={`w-full p-2 rounded-md transition-colors ${gameMode === GameMode.ONLINE ? 'bg-blue-500 text-white' : 'bg-light-primary dark:bg-dark-primary'}`}>Play w/ Friend</button>
                            </div>
                        </div>

                        {gameMode === GameMode.AI && (
                            <div>
                                <label className="font-semibold block mb-2">AI Difficulty</label>
                                <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value as AIDifficulty)} className="w-full p-2 rounded-md bg-light-primary dark:bg-dark-primary border-none">
                                    <option value={AIDifficulty.EASY}>Easy</option>
                                    <option value={AIDifficulty.MEDIUM}>Medium</option>
                                    <option value={AIDifficulty.HARD}>Hard (Stockfish Sim)</option>
                                </select>
                                <p className="text-sm mt-1">You are playing as {playerColor === Player.White ? 'White' : 'Black'}.</p>
                            </div>
                        )}

                        {gameMode === GameMode.ONLINE && <OnlineGamePanel />}
                        
                        <div>
                            <label className="font-semibold block mb-2">Actions</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={resetGame} className="p-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition">New Game</button>
                                <button onClick={undoMove} className="p-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled={history.length === 0 || gameMode === GameMode.ONLINE} title={gameMode === GameMode.ONLINE ? "Undo is disabled in online mode" : ""}>Undo</button>
                                <button onClick={copyFenToClipboard} className="p-2 rounded-md bg-purple-500 text-white hover:bg-purple-600 transition">Share FEN</button>
                                <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 flex justify-center items-center rounded-md bg-gray-500 text-white hover:bg-gray-600 transition">
                                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                                </button>
                            </div>
                        </div>

                        <div className="h-48 overflow-y-auto p-2 bg-light-primary dark:bg-dark-primary rounded-md">
                            <h3 className="font-semibold mb-2">Move History</h3>
                            <ol className="list-decimal list-inside text-sm space-y-1">
                                {history.map((entry, index) => (
                                    index % 2 === 0 && (
                                        <li key={index}>
                                            <span className="font-mono">{history[index]?.move.from}-{history[index]?.move.to}</span>
                                            {history[index + 1] && <span className="ml-4 font-mono">{history[index + 1]?.move.from}-{history[index + 1]?.move.to}</span>}
                                        </li>
                                    )
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
