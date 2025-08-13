
// This worker simulates an async AI calculation, like Stockfish WASM.
// A full implementation would require loading the actual Stockfish engine,
// which is complex without a proper build system for bundling WASM files.
// This preserves the architectural pattern of offloading heavy work from the UI thread.

self.onmessage = function (event) {
    const { type, legalMoves } = event.data;

    if (type === 'getBestMove') {
        if (legalMoves && legalMoves.length > 0) {
            // Simulate deep thinking for "Hard" AI by waiting for a bit
            const thinkingTime = 1000 + Math.random() * 1000; // 1-2 seconds
            
            setTimeout(() => {
                // For this simulation, we'll just pick a random move.
                // A real Stockfish engine would return a strategically superior move.
                const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                
                // The move format from chess.js is an object, but react-chessboard needs `from` and `to`.
                // A full UCI move string like "e2e4" is standard for engines.
                const bestMove = {
                    from: randomMove.from,
                    to: randomMove.to,
                    promotion: randomMove.promotion,
                };
                self.postMessage({ bestMove });
            }, thinkingTime);
        } else {
            self.postMessage({ bestMove: null });
        }
    }
};
