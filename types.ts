
export enum GameMode {
  AI = 'AI',
  HOTSEAT = 'HOTSEAT',
  ONLINE = 'ONLINE',
}

export enum AIDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum Player {
  White = 'w',
  Black = 'b',
}

export type Theme = 'light' | 'dark';

export interface Move {
  from: string;
  to: string;
  promotion?: string;
}

export interface HistoryEntry {
  fen: string;
  move: Move;
}