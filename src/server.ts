import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import { Pool } from "pg";
import {
  getGameProgress,
  isGameFinished,
  PostgresStore
} from "./store";
import { Game, GameMode, Player, Round, RoundScore } from "./types";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const appRoot = path.resolve(__dirname, "..");
const publicDirectory = path.join(appRoot, "public");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set DATABASE_URL to a Postgres connection string before starting the app.");
}

const pool = new Pool({ connectionString: databaseUrl });
const store = new PostgresStore(pool);
const sessionCookieName = "flip7_session_id";
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 1000 * 60 * 60 * 24 * 365
};

type SessionRequest = express.Request & {
  sessionId: string;
};

const parseCookies = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, cookie) => {
    const separator = cookie.indexOf("=");

    if (separator < 0) {
      return cookies;
    }

    const key = decodeURIComponent(cookie.slice(0, separator).trim());
    const value = decodeURIComponent(cookie.slice(separator + 1).trim());
    cookies[key] = value;
    return cookies;
  }, {});
};

app.use(express.json());
app.use((request, response, next) => {
  const cookies = parseCookies(request.headers.cookie);
  const existingSessionId = cookies[sessionCookieName];
  const sessionId = existingSessionId || crypto.randomUUID();

  if (!existingSessionId) {
    response.cookie(sessionCookieName, sessionId, sessionCookieOptions);
  }

  (request as SessionRequest).sessionId = sessionId;
  next();
});
app.use(express.static(publicDirectory));

const createId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const getSessionId = (request: express.Request) => (request as SessionRequest).sessionId;
const isGameMode = (value: unknown): value is GameMode =>
  value === "classic" || value === "vengeance" || value === "mixed";
const normalizeWinningScore = (value: unknown, fallback = 200) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const createPlayerRecord = (name: string, timestamp = now()): Player => ({
  id: createId(),
  name,
  isActive: true,
  joinedAt: timestamp,
  removedAt: null
});
const isPlayerActiveAt = (player: Player, timestamp: string) => {
  if (!player.isActive) {
    return false;
  }

  const targetTime = Date.parse(timestamp);
  if (!Number.isFinite(targetTime)) {
    return true;
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
const getActivePlayers = (game: Game) => game.players.filter((player) => player.isActive);
const getPlayersActiveAt = (game: Game, timestamp: string) =>
  game.players.filter((player) => isPlayerActiveAt(player, timestamp));

const readDatabase = (request: express.Request) => store.read(getSessionId(request));

const updateDatabase = (
  request: express.Request,
  updater: Parameters<PostgresStore["update"]>[1]
) => store.update(getSessionId(request), updater);

const createGame = (
  title: string,
  playerNames: string[],
  options?: { gameMode?: unknown; winningScore?: unknown }
): Game => {
  const timestamp = now();
  const players: Player[] = Array.from(new Set(playerNames.map((name) => name.trim()).filter(Boolean))).map(
    (name) => createPlayerRecord(name, timestamp)
  );

  if (players.length < 2) {
    throw new Error("Add at least two players to start a game.");
  }

  return {
    id: createId(),
    title: title.trim() || "Flip 7 Game",
    gameMode: isGameMode(options?.gameMode) ? options.gameMode : "classic",
    winningScore: normalizeWinningScore(options?.winningScore, 200),
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    players,
    rounds: []
  };
};

const archiveCurrentGame = (gameHistory: Game[], currentGame: Game | null) =>
  currentGame ? [currentGame, ...gameHistory] : gameHistory;

const validateRoundScores = (players: Player[], incomingScores: unknown[]) => {
  const validPlayers = new Set(players.map((player) => player.id));
  const scores: RoundScore[] = incomingScores.map((score) => ({
    playerId: String((score as { playerId?: unknown }).playerId),
    points: Number((score as { points?: unknown }).points ?? 0)
  }));

  if (scores.length !== players.length) {
    throw new Error("Each player needs a score for the round.");
  }

  for (const score of scores) {
    if (!validPlayers.has(score.playerId)) {
      throw new Error("A round included an unknown player.");
    }

    if (!Number.isFinite(score.points)) {
      throw new Error("Scores must be valid numbers.");
    }
  }

  const seenPlayers = new Set(scores.map((score) => score.playerId));
  if (seenPlayers.size !== players.length) {
    throw new Error("Each player should appear only once per round.");
  }

  return scores;
};

const finalizeGameState = (game: Game) => {
  const progress = getGameProgress(game);
  return {
    ...game,
    completedAt: progress.completedAt
  };
};

const toGameResponse = (game: Game | null) => {
  if (!game) {
    return null;
  }

  const progress = getGameProgress(game);
  const winner = progress.winner;

  return {
    ...game,
    completedAt: game.completedAt || progress.completedAt,
    scoreboard: progress.scoreboard,
    isFinished: winner !== null,
    winner,
    invalidRoundIds: progress.invalidRoundIds,
    winningRoundId: progress.winningRoundId,
    winningRoundNumber: progress.winningRoundNumber
  };
};

const decorateGames = (games: Game[]) => games.map((game) => toGameResponse(game));

app.get("/api/game", async (_request, response) => {
  const database = await readDatabase(_request);
  response.json({ game: toGameResponse(database.currentGame), history: decorateGames(database.gameHistory) });
});

app.post("/api/game", async (request, response) => {
  const title = String(request.body?.title ?? "");
  const playerNames = Array.isArray(request.body?.players) ? request.body.players.map(String) : [];
  const gameMode = request.body?.gameMode;
  const winningScore = request.body?.winningScore;

  try {
    const game = createGame(title, playerNames, { gameMode, winningScore });
    const database = await updateDatabase(request, (current) => ({
      currentGame: game,
      gameHistory: archiveCurrentGame(current.gameHistory, current.currentGame)
    }));

    response.status(201).json({
      game: toGameResponse(database.currentGame),
      history: decorateGames(database.gameHistory)
    });
  } catch (error) {
    response.status(400).json({ error: (error as Error).message });
  }
});

app.post("/api/players", async (request, response) => {
  const name = String(request.body?.name ?? "").trim();

  if (!name) {
    response.status(400).json({ error: "Player name is required." });
    return;
  }

  const database = await updateDatabase(request, (current) => {
    if (!current.currentGame) {
      throw new Error("Start a game before adding players.");
    }

    if (isGameFinished(current.currentGame)) {
      throw new Error("This game is finished. Start a new game to keep scoring.");
    }

    const duplicate = current.currentGame.players.some(
      (player) => player.isActive && player.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      throw new Error("That player already exists.");
    }

    const timestamp = now();
    const players = [...current.currentGame.players];
    const existingInactiveIndex = players.findIndex(
      (player) => !player.isActive && player.name.toLowerCase() === name.toLowerCase()
    );

    if (existingInactiveIndex >= 0) {
      const player = players[existingInactiveIndex];
      players[existingInactiveIndex] = {
        ...player,
        isActive: true,
        removedAt: null,
        joinedAt: player.joinedAt || timestamp
      };
    } else {
      players.push(createPlayerRecord(name, timestamp));
    }

    const updatedGame: Game = {
      ...current.currentGame,
      updatedAt: timestamp,
      players
    };

    return { ...current, currentGame: updatedGame };
  }).catch((error: Error) => {
    response.status(400).json({ error: error.message });
    return null;
  });

  if (!database) {
    return;
  }

  response.status(201).json({ game: toGameResponse(database.currentGame) });
});

app.delete("/api/players/:id", async (request, response) => {
  const playerId = String(request.params.id ?? "");

  const database = await updateDatabase(request, (current) => {
    if (!current.currentGame) {
      throw new Error("Start a game before removing players.");
    }

    const player = current.currentGame.players.find((entry) => entry.id === playerId);

    if (!player || !player.isActive) {
      throw new Error("Player not found.");
    }

    const activePlayers = current.currentGame.players.filter(
      (entry) => entry.isActive && entry.id !== playerId
    );

    if (activePlayers.length < 2) {
      throw new Error("A game needs at least two players.");
    }

    const updatedGame: Game = {
      ...current.currentGame,
      updatedAt: now(),
      players: current.currentGame.players.map((entry) =>
        entry.id === playerId
          ? {
              ...entry,
              isActive: false,
              removedAt: now()
            }
          : entry
      )
    };

    return { ...current, currentGame: updatedGame };
  }).catch((error: Error) => {
    response.status(400).json({ error: error.message });
    return null;
  });

  if (!database) {
    return;
  }

  response.json({ game: toGameResponse(database.currentGame) });
});

app.post("/api/game/restart", async (request, response) => {
  const title = String(request.body?.title ?? "").trim();

  const database = await updateDatabase(request, (current) => {
    if (!current.currentGame) {
      throw new Error("There is no current game to restart.");
    }

    const activePlayers = getActivePlayers(current.currentGame);
    if (activePlayers.length < 2) {
      throw new Error("A game needs at least two players.");
    }

    const nextGame = createGame(
      title || current.currentGame.title,
      activePlayers.map((player) => player.name),
      {
        gameMode: current.currentGame.gameMode,
        winningScore: current.currentGame.winningScore
      }
    );

    return {
      currentGame: nextGame,
      gameHistory: archiveCurrentGame(current.gameHistory, current.currentGame)
    };
  }).catch((error: Error) => {
    response.status(400).json({ error: error.message });
    return null;
  });

  if (!database) {
    return;
  }

  response.status(201).json({ game: toGameResponse(database.currentGame), history: decorateGames(database.gameHistory) });
});

app.post("/api/game/:id/resume", async (request, response) => {
  const gameId = String(request.params.id ?? "");

  const database = await updateDatabase(request, (current) => {
    const gameToResume = current.gameHistory.find((game) => game.id === gameId);

    if (!gameToResume) {
      throw new Error("Archived game not found.");
    }

    const nextHistory = current.gameHistory.filter((game) => game.id !== gameId);

    return {
      currentGame: gameToResume,
      gameHistory: archiveCurrentGame(nextHistory, current.currentGame)
    };
  }).catch((error: Error) => {
    response.status(404).json({ error: error.message });
    return null;
  });

  if (!database) {
    return;
  }

  response.status(200).json({ game: toGameResponse(database.currentGame), history: decorateGames(database.gameHistory) });
});

app.post("/api/rounds", async (request, response) => {
  const note = String(request.body?.note ?? "").trim();
  const incomingScores: unknown[] = Array.isArray(request.body?.scores) ? request.body.scores : [];

  const database = await updateDatabase(request, (current) => {
    if (!current.currentGame) {
      throw new Error("Start a game before adding rounds.");
    }

    if (isGameFinished(current.currentGame)) {
      throw new Error("This game is already finished.");
    }

    const activePlayers = getActivePlayers(current.currentGame);
    const scores = validateRoundScores(activePlayers, incomingScores);

    const round: Round = {
      id: createId(),
      createdAt: now(),
      note,
      scores
    };

    const updatedGame: Game = {
      ...current.currentGame,
      updatedAt: now(),
      completedAt: null,
      rounds: [...current.currentGame.rounds, round]
    };

    return { ...current, currentGame: finalizeGameState(updatedGame) };
  }).catch((error: Error) => {
    response.status(400).json({ error: error.message });
    return null;
  });

  if (!database) {
    return;
  }

  response.status(201).json({ game: toGameResponse(database.currentGame) });
});

app.patch("/api/rounds/:id", async (request, response) => {
  const roundId = String(request.params.id ?? "");
  const note = String(request.body?.note ?? "").trim();
  const incomingScores: unknown[] = Array.isArray(request.body?.scores) ? request.body.scores : [];

  const database = await updateDatabase(request, (current) => {
    if (!current.currentGame) {
      throw new Error("Start a game before editing rounds.");
    }

    const roundIndex = current.currentGame.rounds.findIndex((round) => round.id === roundId);

    if (roundIndex < 0) {
      throw new Error("Round not found.");
    }

    const existingRound = current.currentGame.rounds[roundIndex];
    const playersForRound = getPlayersActiveAt(current.currentGame, existingRound.createdAt);
    const scores = validateRoundScores(playersForRound, incomingScores);

    if (isGameFinished(current.currentGame)) {
      const progress = getGameProgress(current.currentGame);

      if (progress.winningRoundId !== roundId) {
        throw new Error("This game is already finished.");
      }

      const sameScores =
        scores.length === existingRound.scores.length &&
        scores.every((score) => {
          const existingScore = existingRound.scores.find((entry) => entry.playerId === score.playerId);
          return Boolean(existingScore && existingScore.points === score.points);
        });

      if (!sameScores) {
        throw new Error("Finished games can only update the final note.");
      }
    }

    const rounds = current.currentGame.rounds.map((round, index) =>
      index === roundIndex ? { ...round, note, scores } : round
    );

    const updatedGame: Game = {
      ...current.currentGame,
      updatedAt: now(),
      completedAt: null,
      rounds
    };

    return { ...current, currentGame: finalizeGameState(updatedGame) };
  }).catch((error: Error) => {
    response.status(400).json({ error: error.message });
    return null;
  });

  if (!database) {
    return;
  }

  response.status(200).json({ game: toGameResponse(database.currentGame) });
});

app.delete("/api/game", async (_request, response) => {
  const database = await updateDatabase(_request, (current) => ({
    currentGame: null,
    gameHistory: archiveCurrentGame(current.gameHistory, current.currentGame)
  }));

  response.json({ game: null, history: decorateGames(database.gameHistory) });
});

app.delete("/api/history/:id", async (request, response) => {
  const gameId = String(request.params.id ?? "");

  const database = await updateDatabase(request, (current) => {
    const existingCount = current.gameHistory.length;
    const gameHistory = current.gameHistory.filter((game) => game.id !== gameId);

    if (gameHistory.length === existingCount) {
      throw new Error("Archived game not found.");
    }

    return {
      ...current,
      gameHistory
    };
  }).catch((error: Error) => {
    response.status(404).json({ error: error.message });
    return null;
  });

  if (!database) {
    return;
  }

  response.json({ history: decorateGames(database.gameHistory) });
});

app.get(/^(?!\/api).*/, (_request, response) => {
  response.sendFile(path.join(publicDirectory, "index.html"));
});

app.listen(port, () => {
  console.log(`Flip 7 scorekeeper is running on http://localhost:${port}`);
});
