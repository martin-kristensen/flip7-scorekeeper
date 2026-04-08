import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Database, Game } from "./types";

const winningScore = 200;

const defaultDatabase = (): Database => ({
  currentGame: null,
  gameHistory: []
});

export class JsonStore {
  constructor(private readonly databasePath: string) {}

  private writeQueue: Promise<void> = Promise.resolve();

  async read(): Promise<Database> {
    await mkdir(this.getDirectory(), { recursive: true });

    try {
      const raw = await readFile(this.databasePath, "utf8");
      const parsed = JSON.parse(raw) as Database;

      return {
        currentGame: parsed.currentGame ?? null,
        gameHistory: parsed.gameHistory ?? []
      };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === "ENOENT") {
        const emptyDatabase = defaultDatabase();
        await this.write(emptyDatabase);
        return emptyDatabase;
      }

      throw error;
    }
  }

  async write(database: Database): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(this.getDirectory(), { recursive: true });
      await writeFile(this.databasePath, JSON.stringify(database, null, 2), "utf8");
    });

    return this.writeQueue;
  }

  async update(updater: (database: Database) => Database | Promise<Database>): Promise<Database> {
    const current = await this.read();
    const next = await updater(current);
    await this.write(next);
    return next;
  }

  private getDirectory() {
    return path.dirname(this.databasePath);
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

  if (!leader || leader.total < winningScore) {
    return null;
  }

  return {
    ...leader,
    threshold: winningScore
  };
};

export const isGameFinished = (game: Game) => getWinnerSummary(game) !== null;
