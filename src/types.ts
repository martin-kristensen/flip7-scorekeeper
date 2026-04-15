export interface Player {
  id: string;
  name: string;
  isActive: boolean;
  joinedAt: string;
  removedAt: string | null;
}

export type GameMode = "classic" | "vengeance" | "mixed";

export interface RoundScore {
  playerId: string;
  points: number;
}

export interface Round {
  id: string;
  createdAt: string;
  note: string;
  scores: RoundScore[];
}

export interface Game {
  id: string;
  title: string;
  gameMode: GameMode;
  winningScore: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  players: Player[];
  rounds: Round[];
  suddenDeathStartedAtRoundId?: string | null;
  suddenDeathPlayerIds?: string[] | null;
}

export interface Database {
  currentGame: Game | null;
  gameHistory: Game[];
}
