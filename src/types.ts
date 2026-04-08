export interface Player {
  id: string;
  name: string;
}

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
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  players: Player[];
  rounds: Round[];
}

export interface Database {
  currentGame: Game | null;
  gameHistory: Game[];
}
