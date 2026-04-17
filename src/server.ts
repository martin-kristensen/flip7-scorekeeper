import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import { Pool } from "pg";
import {
  getGameProgress,
  isGameFinished,
  PostgresStore
} from "./store";
import { Game, GameMode, Player, Round, RoundScore, ScoreInputMode } from "./types";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const appRoot = path.resolve(__dirname, "..");
const publicDirectory = path.join(appRoot, "public");
const databaseUrl = process.env.DATABASE_URL;
const parseEnvFlag = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return !["0", "false", "off", "no"].includes(value.trim().toLowerCase());
};

const clarityEnabled = parseEnvFlag(process.env.CLARITY_ENABLED, true);
const clarityProjectId = process.env.CLARITY_PROJECT_ID?.trim();
if (clarityEnabled && !clarityProjectId) {
  console.warn("CLARITY_ENABLED is true, but CLARITY_PROJECT_ID is missing. Clarity will not load.");
}
const claritySnippet = clarityEnabled && clarityProjectId
  ? `<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${clarityProjectId}");
</script>`
  : "";
const indexTemplate = fs
  .readFileSync(path.join(publicDirectory, "index.html"), "utf8")
  .replace("<!-- CLARITY_SNIPPET -->", claritySnippet);
const friendlyDatabaseError = "The scoreboard is temporarily offline. Please try again in a moment.";

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

app.get(["/", "/index.html"], (_request, response) => {
  response.type("html").send(indexTemplate);
});

app.use(express.static(publicDirectory));

const createId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const getSessionId = (request: express.Request) => (request as SessionRequest).sessionId;
const isGameMode = (value: unknown): value is GameMode =>
  value === "classic" || value === "vengeance" || value === "mixed";
const normalizeScoreInputMode = (value: unknown): ScoreInputMode =>
  value === "cards" ? "cards" : "manual";
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
  options?: { gameMode?: unknown; winningScore?: unknown; defaultScoreInputMode?: unknown }
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
    defaultScoreInputMode:
      isGameMode(options?.gameMode) && options?.gameMode === "classic"
        ? normalizeScoreInputMode(options?.defaultScoreInputMode)
        : "manual",
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    players,
    rounds: [],
    suddenDeathStartedAtRoundId: null,
    suddenDeathPlayerIds: null
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

const buildTotals = (game: Game) => {
  const totals: Record<string, number> = Object.fromEntries(game.players.map((player) => [player.id, 0]));

  for (const round of game.rounds) {
    const activePlayerIds = new Set(
      game.players.filter((player) => isPlayerActiveAt(player, round.createdAt)).map((player) => player.id)
    );

    for (const score of round.scores) {
      if (!activePlayerIds.has(score.playerId)) {
        continue;
      }

      totals[score.playerId] = (totals[score.playerId] || 0) + score.points;
    }
  }

  return totals;
};

const getSuddenDeathSurvivorIds = (game: Game) => {
  const eligiblePlayerIds = new Set(
    Array.isArray(game.suddenDeathPlayerIds) ? game.suddenDeathPlayerIds.filter((id) => typeof id === "string") : []
  );
  const eligiblePlayers = game.players.filter((player) => player.isActive && eligiblePlayerIds.has(player.id));

  if (!eligiblePlayers.length) {
    return [];
  }

  const totals = buildTotals(game);
  const scoreboard = eligiblePlayers
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      total: totals[player.id] || 0
    }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));

  const leader = scoreboard[0];
  if (!leader) {
    return [];
  }

  return scoreboard.filter((entry) => entry.total === leader.total).map((entry) => entry.playerId);
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
    winners: progress.winners,
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
  const defaultScoreInputMode = request.body?.defaultScoreInputMode;

  try {
    const game = createGame(title, playerNames, { gameMode, winningScore, defaultScoreInputMode });
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

    const restartPlayers = current.currentGame.players;
    if (restartPlayers.length < 2) {
      throw new Error("A game needs at least two players.");
    }

    const nextGame = createGame(
      title || current.currentGame.title,
      restartPlayers.map((player) => player.name),
      {
        gameMode: current.currentGame.gameMode,
        winningScore: current.currentGame.winningScore,
        defaultScoreInputMode: current.currentGame.defaultScoreInputMode
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
  const defaultScoreInputMode = request.body?.defaultScoreInputMode;

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

    const roundCreatedAt = round.createdAt;
    const eliminationTimestamp = new Date(Date.parse(roundCreatedAt) + 1).toISOString();
    const nextDefaultScoreInputMode =
      current.currentGame.gameMode === "classic"
        ? normalizeScoreInputMode(defaultScoreInputMode ?? current.currentGame.defaultScoreInputMode)
        : current.currentGame.defaultScoreInputMode;
    const updatedGame: Game = {
      ...current.currentGame,
      updatedAt: now(),
      completedAt: null,
      defaultScoreInputMode: nextDefaultScoreInputMode,
      rounds: [...current.currentGame.rounds, round]
    };

    if (updatedGame.suddenDeathStartedAtRoundId) {
      const survivorIds = getSuddenDeathSurvivorIds(updatedGame);
      if (survivorIds.length) {
        const survivorIdSet = new Set(survivorIds);
        const eliminatedPlayerIds = updatedGame.players
          .filter((player) => player.isActive && !survivorIdSet.has(player.id))
          .map((player) => player.id);

        if (eliminatedPlayerIds.length) {
          const eliminatedPlayerIdSet = new Set(eliminatedPlayerIds);
          return {
            ...current,
            currentGame: finalizeGameState({
              ...updatedGame,
              suddenDeathPlayerIds: survivorIds,
              players: updatedGame.players.map((player) =>
                eliminatedPlayerIdSet.has(player.id)
                  ? {
                      ...player,
                      isActive: false,
                      removedAt: eliminationTimestamp
                    }
                  : player
              )
            })
          };
        }

        return {
          ...current,
          currentGame: finalizeGameState({
            ...updatedGame,
            suddenDeathPlayerIds: survivorIds
          })
        };
      }
    }

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

app.post("/api/game/:id/sudden-death", async (request, response) => {
  const gameId = String(request.params.id ?? "");

  const database = await updateDatabase(request, (current) => {
    if (!current.currentGame || current.currentGame.id !== gameId) {
      throw new Error("Current game not found.");
    }

    if (current.currentGame.suddenDeathStartedAtRoundId) {
      throw new Error("Sudden death is already active.");
    }

    const progress = getGameProgress(current.currentGame);
    if (!progress.winners || progress.winners.length < 2 || !progress.winningRoundId) {
      throw new Error("This game is not tied.");
    }

    const suddenDeathPlayerIds = progress.winners.map((winner) => winner.playerId);
    const timestamp = now();

    const updatedGame: Game = {
      ...current.currentGame,
      updatedAt: timestamp,
      completedAt: null,
      suddenDeathStartedAtRoundId: progress.winningRoundId,
      suddenDeathPlayerIds,
      players: current.currentGame.players.map((player) =>
        suddenDeathPlayerIds.includes(player.id) || !player.isActive
          ? player
          : {
              ...player,
              isActive: false,
              removedAt: timestamp
            }
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
  response.type("html").send(indexTemplate);
});

app.use((error: Error, request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const errorMessage = error?.message || "";
  const isDatabaseConnectionError =
    /ECONNREFUSED|connection refused|could not connect|connect EHOSTUNREACH|connect ETIMEDOUT/i.test(errorMessage) ||
    (error as NodeJS.ErrnoException | null)?.code === "ECONNREFUSED";
  const message = isDatabaseConnectionError ? friendlyDatabaseError : "Something went wrong.";

  if (request.originalUrl.startsWith("/api")) {
    response.status(500).json({ error: message });
    return;
  }

  response
    .status(500)
    .type("html")
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Flip 7 Scorekeeper</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: system-ui, sans-serif;
        background: #14110e;
        color: #f6efe7;
        padding: 2rem;
      }
      .panel {
        max-width: 34rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 24px;
        padding: 1.25rem 1.35rem;
        background: rgba(27, 23, 19, 0.92);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      }
      p {
        margin: 0.5rem 0 0;
        line-height: 1.5;
        color: #c8b8a7;
      }
      strong {
        display: block;
        font-size: 1.2rem;
      }
    </style>
  </head>
  <body>
    <div class="panel">
      <strong>${message}</strong>
      <p>The app could not reach the database. Please reload in a moment.</p>
    </div>
  </body>
</html>`);
});

app.listen(port, () => {
  console.log(`Flip 7 scorekeeper is running on http://localhost:${port}`);
});
