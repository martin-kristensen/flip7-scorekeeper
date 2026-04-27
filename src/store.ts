import { type Pool, type PoolClient } from "pg";
import { BrutalRules, Database, Flip7Award, Game, GameMode, Player, Round, ScoreInputMode } from "./types";

const defaultDatabase = (): Database => ({
  currentGame: null,
  gameHistory: []
});

const defaultWinningScore = 200;
const defaultGameMode: GameMode = "classic";
const defaultScoreInputMode: ScoreInputMode = "manual";
const defaultBrutalRules: BrutalRules = {
  allowNegativeRoundScore: false,
  flip7BonusCanTargetOpponent: false
};

const normalizeBrutalRules = (value: unknown): BrutalRules => {
  if (!value || typeof value !== "object") {
    return { ...defaultBrutalRules };
  }

  const candidate = value as Partial<Record<keyof BrutalRules, unknown>>;
  return {
    allowNegativeRoundScore: candidate.allowNegativeRoundScore === true,
    flip7BonusCanTargetOpponent: candidate.flip7BonusCanTargetOpponent === true
  };
};

const normalizeFlip7Awards = (value: unknown): Flip7Award[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const awards = value
    .map((award) => {
      if (!award || typeof award !== "object") {
        return null;
      }

      const candidate = award as Partial<Record<keyof Flip7Award, unknown>>;
      if (typeof candidate.playerId !== "string" || candidate.playerId.length === 0) {
        return null;
      }

      const type = candidate.type === "targetPenalty" ? "targetPenalty" : "selfBonus";
      const targetPlayerId =
        type === "targetPenalty" && typeof candidate.targetPlayerId === "string" && candidate.targetPlayerId.length > 0
          ? candidate.targetPlayerId
          : undefined;

      return {
        playerId: candidate.playerId,
        type,
        ...(targetPlayerId ? { targetPlayerId } : {}),
        points: 15
      };
    })
    .filter((award): award is Flip7Award => award !== null);

  return awards.length ? awards : undefined;
};

const normalizePlayer = (value: unknown, fallbackJoinedAt = ""): Player | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Player>;

  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }

  const joinedAt =
    typeof candidate.joinedAt === "string" && candidate.joinedAt.trim().length > 0
      ? candidate.joinedAt
      : fallbackJoinedAt;
  const removedAt =
    typeof candidate.removedAt === "string" && candidate.removedAt.trim().length > 0
      ? candidate.removedAt
      : null;

  return {
    id: candidate.id,
    name: candidate.name,
    isActive: typeof candidate.isActive === "boolean" ? candidate.isActive : removedAt === null,
    joinedAt,
    removedAt
  };
};

const normalizeRound = (value: unknown): Round | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Round>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.note !== "string" ||
    !Array.isArray(candidate.scores)
  ) {
    return null;
  }

  const scores = candidate.scores
    .map((score) => {
      if (!score || typeof score !== "object") {
        return null;
      }

      const scoreCandidate = score as { playerId?: unknown; points?: unknown };
      if (typeof scoreCandidate.playerId !== "string" || typeof scoreCandidate.points !== "number") {
        return null;
      }

      return {
        playerId: scoreCandidate.playerId,
        points: scoreCandidate.points
      };
    })
    .filter((score): score is { playerId: string; points: number } => score !== null);
  const cardSelections =
    candidate.cardSelections && typeof candidate.cardSelections === "object"
      ? Object.fromEntries(
          Object.entries(candidate.cardSelections)
            .filter(([playerId, selection]) => typeof playerId === "string" && playerId.length > 0 && Array.isArray(selection))
            .map(([playerId, selection]) => [
              playerId,
              selection.filter((token): token is string => typeof token === "string" && token.length > 0)
            ])
        )
      : undefined;
  const rawScoreInputMode = candidate.scoreInputMode;
  const scoreInputMode: ScoreInputMode | undefined =
    rawScoreInputMode === "cards" || rawScoreInputMode === "manual" ? rawScoreInputMode : undefined;

  return {
    id: candidate.id,
    createdAt: candidate.createdAt,
    note: candidate.note,
    scoreInputMode,
    cardSelections,
    flip7Awards: normalizeFlip7Awards(candidate.flip7Awards),
    scores
  };
};

const normalizeGame = (value: unknown): Game | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown> & Partial<Game>;
  const fallbackJoinedAt = typeof candidate.createdAt === "string" ? candidate.createdAt : "";
  const players = Array.isArray(candidate.players)
    ? candidate.players
        .map((player) => normalizePlayer(player, fallbackJoinedAt))
        .filter((player): player is Player => player !== null)
    : [];
  const rounds = Array.isArray(candidate.rounds)
    ? candidate.rounds.map(normalizeRound).filter((round): round is Round => round !== null)
    : [];
  const suddenDeathPlayerIds = Array.isArray(candidate.suddenDeathPlayerIds)
    ? candidate.suddenDeathPlayerIds.filter((playerId: unknown): playerId is string => typeof playerId === "string" && playerId.length > 0)
    : null;
  const suddenDeathStartedAtRoundId =
    typeof candidate.suddenDeathStartedAtRoundId === "string"
      ? candidate.suddenDeathStartedAtRoundId || null
      : null;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.updatedAt !== "string"
  ) {
    return null;
  }

  const rawGameMode = candidate.gameMode;
  const gameMode: GameMode =
    rawGameMode === "classic" || rawGameMode === "vengeance" || rawGameMode === "mixed"
      ? rawGameMode
      : defaultGameMode;

  const winningScore =
    typeof candidate.winningScore === "number" && Number.isFinite(candidate.winningScore)
      ? candidate.winningScore
      : defaultWinningScore;
  const rawScoreInputMode = candidate.defaultScoreInputMode;
  const defaultScoreInputModeValue: ScoreInputMode =
    rawScoreInputMode === "cards" || rawScoreInputMode === "manual" ? rawScoreInputMode : defaultScoreInputMode;

  return {
    id: candidate.id,
    title: candidate.title,
    gameMode,
    brutalRules: gameMode === "vengeance" ? normalizeBrutalRules(candidate.brutalRules) : { ...defaultBrutalRules },
    winningScore,
    defaultScoreInputMode: defaultScoreInputModeValue,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    completedAt: typeof candidate.completedAt === "string" ? candidate.completedAt : null,
    players,
    rounds,
    suddenDeathStartedAtRoundId,
    suddenDeathPlayerIds
  };
};

const normalizeDatabase = (value: unknown): Database => {
  if (!value || typeof value !== "object") {
    return defaultDatabase();
  }

  const candidate = value as Partial<Database>;

  return {
    currentGame: normalizeGame(candidate.currentGame),
    gameHistory: Array.isArray(candidate.gameHistory)
      ? candidate.gameHistory.map(normalizeGame).filter((game): game is Game => game !== null)
      : []
  };
};

const sessionTableName = "app_sessions";

export interface ScoreboardEntry {
  playerId: string;
  name: string;
  total: number;
}

export interface WinnerSummary extends ScoreboardEntry {
  threshold: number;
  roundId: string;
  roundNumber: number;
  roundCreatedAt: string;
}

export interface GameProgress {
  scoreboard: ScoreboardEntry[];
  winners: WinnerSummary[];
  winner: WinnerSummary | null;
  winningRoundId: string | null;
  winningRoundNumber: number | null;
  invalidRoundIds: string[];
  completedAt: string | null;
}

export class PostgresStore {
  constructor(private readonly pool: Pool) {}

  private initialization: Promise<void> | null = null;

  async read(sessionId: string): Promise<Database> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      await this.ensureSessionRow(client, sessionId);
      const result = await client.query<{ state: unknown }>(
        `SELECT state FROM ${sessionTableName} WHERE session_id = $1`,
        [sessionId]
      );

      return normalizeDatabase(result.rows[0]?.state);
    } finally {
      client.release();
    }
  }

  async update(
    sessionId: string,
    updater: (database: Database) => Database | Promise<Database>
  ): Promise<Database> {
    await this.ensureInitialized();

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await this.ensureSessionRow(client, sessionId);

      const result = await client.query<{ state: unknown }>(
        `SELECT state FROM ${sessionTableName} WHERE session_id = $1 FOR UPDATE`,
        [sessionId]
      );

      const current = normalizeDatabase(result.rows[0]?.state);
      const next = normalizeDatabase(await updater(current));

      await client.query(
        `UPDATE ${sessionTableName}
         SET state = $2::jsonb,
             updated_at = NOW()
         WHERE session_id = $1`,
        [sessionId, JSON.stringify(next)]
      );

      await client.query("COMMIT");
      return next;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureInitialized() {
    if (!this.initialization) {
      this.initialization = this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${sessionTableName} (
          session_id text PRIMARY KEY,
          state jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `).then(() => undefined);
    }

    await this.initialization;
  }

  private async ensureSessionRow(client: PoolClient, sessionId: string) {
    await client.query(
      `INSERT INTO ${sessionTableName} (session_id, state)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (session_id) DO NOTHING`,
      [sessionId, JSON.stringify(defaultDatabase())]
    );
  }
}

const buildScoreboard = (players: Player[], totals: Record<string, number>): ScoreboardEntry[] =>
  players
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      total: totals[player.id] ?? 0
    }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));

const isPlayerActiveAt = (player: Player, timestamp: string): boolean => {
  const targetTime = Date.parse(timestamp);
  if (!Number.isFinite(targetTime)) {
    return player.isActive;
  }

  const joinedAt = Date.parse(player.joinedAt);
  if (Number.isFinite(joinedAt) && targetTime < joinedAt) {
    return false;
  }

  const removedAt = player.removedAt ? Date.parse(player.removedAt) : NaN;
  if (Number.isFinite(removedAt) && targetTime >= removedAt) {
    return false;
  }

  return true;
};

export const getGameProgress = (game: Game): GameProgress => {
  const totals = Object.fromEntries(game.players.map((player) => [player.id, 0]));
  let winners: WinnerSummary[] = [];
  let winner: WinnerSummary | null = null;
  let winningRoundId: string | null = null;
  let winningRoundNumber: number | null = null;
  let completedAt: string | null = null;
  const suddenDeathRoundId = game.suddenDeathStartedAtRoundId || null;
  const suddenDeathPlayers = new Set(
    Array.isArray(game.suddenDeathPlayerIds) ? game.suddenDeathPlayerIds.filter((id) => typeof id === "string") : []
  );
  let suddenDeathMode = !suddenDeathRoundId;

  for (let index = 0; index < game.rounds.length; index += 1) {
    const round = game.rounds[index];
    const activePlayerIds = new Set(
      game.players.filter((player) => isPlayerActiveAt(player, round.createdAt)).map((player) => player.id)
    );

    for (const score of round.scores) {
      if (!activePlayerIds.has(score.playerId)) {
        continue;
      }

      totals[score.playerId] = (totals[score.playerId] ?? 0) + score.points;
    }

    if (suddenDeathRoundId) {
      if (round.id === suddenDeathRoundId) {
        suddenDeathMode = true;
        continue;
      }

      if (!suddenDeathMode) {
        continue;
      }

      const suddenDeathEligiblePlayers = game.players.filter(
        (player) => activePlayerIds.has(player.id) && suddenDeathPlayers.has(player.id)
      );
      const suddenDeathScoreboard = buildScoreboard(suddenDeathEligiblePlayers, totals);
      const leader = suddenDeathScoreboard[0];

      if (leader) {
        const tiedLeaders = suddenDeathScoreboard.filter((entry) => entry.total === leader.total);
        if (tiedLeaders.length === 1) {
          winners = tiedLeaders.map((entry) => ({
            ...entry,
            threshold: game.winningScore,
            roundId: round.id,
            roundNumber: index + 1,
            roundCreatedAt: round.createdAt
          }));
          winner = winners[0] || null;
          winningRoundId = round.id;
          winningRoundNumber = index + 1;
          completedAt = round.createdAt;
          break;
        }
      }

      continue;
    }

    const scoreboard = buildScoreboard(game.players, totals);
    const leader = scoreboard[0];

    if (leader && leader.total >= game.winningScore) {
      winners = scoreboard
        .filter((entry) => entry.total === leader.total)
        .map((entry) => ({
          ...entry,
          threshold: game.winningScore,
          roundId: round.id,
          roundNumber: index + 1,
          roundCreatedAt: round.createdAt
        }));
      winner = winners[0] || null;
      winningRoundId = round.id;
      winningRoundNumber = index + 1;
      completedAt = round.createdAt;
      break;
    }
  }

  return {
    scoreboard: buildScoreboard(game.players, totals),
    winners,
    winner,
    winningRoundId,
    winningRoundNumber,
    invalidRoundIds:
      winningRoundNumber !== null ? game.rounds.slice(winningRoundNumber).map((round) => round.id) : [],
    completedAt
  };
};

export const summarizeGame = (game: Game) => getGameProgress(game).scoreboard;

export const getWinnerSummary = (game: Game) => getGameProgress(game).winner;

export const isGameFinished = (game: Game) => getWinnerSummary(game) !== null;
