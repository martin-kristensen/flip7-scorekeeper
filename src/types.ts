export interface Player {
  id: string;
  name: string;
  isActive: boolean;
  joinedAt: string;
  removedAt: string | null;
}

export type GameMode = "classic" | "vengeance" | "mixed";
export type ScoreInputMode = "manual" | "cards";

export interface BrutalRules {
  allowNegativeRoundScore: boolean;
  flip7BonusCanTargetOpponent: boolean;
}

export interface RoundScore {
  playerId: string;
  points: number;
}

export interface Flip7Award {
  playerId: string;
  type: "selfBonus" | "targetPenalty";
  targetPlayerId?: string;
  points: number;
}

export interface Round {
  id: string;
  createdAt: string;
  note: string;
  scoreInputMode?: ScoreInputMode;
  cardSelections?: Record<string, string[]>;
  flip7Awards?: Flip7Award[];
  scores: RoundScore[];
}

export interface Game {
  id: string;
  title: string;
  gameMode: GameMode;
  brutalRules: BrutalRules;
  winningScore: number;
  defaultScoreInputMode: ScoreInputMode;
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
