import { Chess } from 'chess.js';
import { AIDifficulty } from '../types';
import type { Move } from '../types';

// --- Web Worker for Hard AI ---
let stockfishWorker: Worker | null = null;

const getStockfishMove = (game: Chess): Promise<Move | null> => {
    return new Promise((resolve) => {
        if (!stockfishWorker) {
            stockfishWorker = new Worker(new URL('../stockfish.worker.js', import.meta.url), { type: 'module' });
        }

        stockfishWorker.onmessage = (event) => {
            resolve(event.data.bestMove);
        };

        stockfishWorker.onerror = (err) => {
            console.error("Stockfish Worker Error:", err);
            resolve(getRandomMove(game)); // Fallback to easy AI on error
        };

        const legalMoves = game.moves({ verbose: true });
        stockfishWorker.postMessage({ type: 'getBestMove', legalMoves });
    });
};


// --- Easy AI: Random Move ---
const getRandomMove = (game: Chess): Move | null => {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return null;
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return { from: randomMove.from, to: randomMove.to, promotion: randomMove.promotion };
};

// --- Medium AI: Minimax with Alpha-Beta Pruning ---
const pieceValue: { [key: string]: number } = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 90 };

const evaluateBoard = (game: Chess): number => {
    let totalEvaluation = 0;
    game.board().forEach(row => {
        row.forEach(square => {
            if (square) {
                const value = pieceValue[square.type] || 0;
                totalEvaluation += (square.color === 'w' ? value : -value);
            }
        });
    });
    return totalEvaluation;
};

const minimax = (game: Chess, depth: number, alpha: number, beta: number, isMaximizingPlayer: boolean): number => {
    if (depth === 0 || game.isGameOver()) {
        return evaluateBoard(game);
    }

    const moves = game.moves({ verbose: true });
    let bestValue = isMaximizingPlayer ? -Infinity : Infinity;

    for (const move of moves) {
        game.move(move);
        const boardValue = minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer);
        game.undo();

        if (isMaximizingPlayer) {
            bestValue = Math.max(bestValue, boardValue);
            alpha = Math.max(alpha, bestValue);
        } else {
            bestValue = Math.min(bestValue, boardValue);
            beta = Math.min(beta, bestValue);
        }
        if (beta <= alpha) {
            break;
        }
    }
    return bestValue;
};

const getMinimaxMove = (game: Chess): Move | null => {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return null;

    let bestMove: Move | null = null;
    const isMaximizingPlayer = game.turn() === 'w';
    let bestValue = isMaximizingPlayer ? -Infinity : Infinity;


    for (const move of moves) {
        game.move(move);
        const boardValue = minimax(game, 2, -Infinity, Infinity, !isMaximizingPlayer); // Depth 2 for decent speed
        game.undo();

        if (isMaximizingPlayer) {
            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = { from: move.from, to: move.to, promotion: move.promotion };
            }
        } else {
             if (boardValue < bestValue) {
                bestValue = boardValue;
                bestMove = { from: move.from, to: move.to, promotion: move.promotion };
            }
        }
    }
    return bestMove || getRandomMove(game); // Fallback
};

// --- Main AI Service Function ---
export const getAIMove = async (difficulty: AIDifficulty, game: Chess): Promise<Move | null> => {
    switch (difficulty) {
        case AIDifficulty.EASY:
            return getRandomMove(game);
        case AIDifficulty.MEDIUM:
            // Pass a copy of the game state to minimax to avoid side effects
            const gameCopy = new Chess(game.fen());
            return getMinimaxMove(gameCopy);
        case AIDifficulty.HARD:
            return await getStockfishMove(game);
        default:
            return getRandomMove(game);
    }
};