import { type Pool, type PoolClient } from "pg";
import { Database, Game, GameMode, Player, Round } from "./types";

const defaultDatabase = (): Database => ({
  currentGame: null,
  gameHistory: []
});

const defaultWinningScore = 200;
const defaultGameMode: GameMode = "classic";

const normalizePlayer = (value: unknown): Player | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Player>;

  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name
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

  return {
    id: candidate.id,
    createdAt: candidate.createdAt,
    note: candidate.note,
    scores
  };
};

const normalizeGame = (value: unknown): Game | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Game>;
  const players = Array.isArray(candidate.players)
    ? candidate.players.map(normalizePlayer).filter((player): player is Player => player !== null)
    : [];
  const rounds = Array.isArray(candidate.rounds)
    ? candidate.rounds.map(normalizeRound).filter((round): round is Round => round !== null)
    : [];

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

  return {
    id: candidate.id,
    title: candidate.title,
    gameMode,
    winningScore,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    completedAt: typeof candidate.completedAt === "string" ? candidate.completedAt : null,
    players,
    rounds
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

export const summarizeGame = (game: Game) => {
  const totals = Object.fromEntries(game.players.map((player) => [player.id, 0]));

  for (const round of game.rounds) {
    for (const score of round.scores) {
      totals[score.playerId] = (totals[score.playerId] ?? 0) + score.points;
    }
  }

  return game.players
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      total: totals[player.id] ?? 0
    }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
};

export const getWinnerSummary = (game: Game) => {
  const scoreboard = summarizeGame(game);
  const leader = scoreboard[0];

  if (!leader || leader.total < game.winningScore) {
    return null;
  }

  return {
    ...leader,
    threshold: game.winningScore
  };
};

export const isGameFinished = (game: Game) => getWinnerSummary(game) !== null;
