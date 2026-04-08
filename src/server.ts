import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import { getWinnerSummary, isGameFinished, JsonStore, summarizeGame } from "./store";
import { Game, Player, Round, RoundScore } from "./types";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const appRoot = path.resolve(__dirname, "..");
const publicDirectory = path.join(appRoot, "public");
const store = new JsonStore(path.join(appRoot, "data", "database.json"));

app.use(express.json());
app.use(express.static(publicDirectory));

const createId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const createGame = (title: string, playerNames: string[]): Game => {
  const players: Player[] = Array.from(
    new Set(playerNames.map((name) => name.trim()).filter(Boolean))
  ).map((name) => ({
    id: createId(),
    name
  }));

  if (players.length < 2) {
    throw new Error("Add at least two players to start a game.");
  }

  const timestamp = now();

  return {
    id: createId(),
    title: title.trim() || "Flip 7 Game",
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    players,
    rounds: []
  };
};

const archiveCurrentGame = (gameHistory: Game[], currentGame: Game | null) =>
  currentGame ? [currentGame, ...gameHistory] : gameHistory;

const toGameResponse = (game: Game | null) => {
  if (!game) {
    return null;
  }

  const scoreboard = summarizeGame(game);
  const winner = getWinnerSummary(game);

  return {
    ...game,
    scoreboard,
    isFinished: winner !== null,
    winner
  };
};

app.get("/api/game", async (_request, response) => {
  const database = await store.read();
  response.json({ game: toGameResponse(database.currentGame), history: database.gameHistory });
});

app.post("/api/game", async (request, response) => {
  const title = String(request.body?.title ?? "");
  const playerNames = Array.isArray(request.body?.players) ? request.body.players.map(String) : [];

  try {
    const game = createGame(title, playerNames);
    const database = await store.update((current) => ({
      currentGame: game,
      gameHistory: archiveCurrentGame(current.gameHistory, current.currentGame)
    }));

    response.status(201).json({ game: toGameResponse(database.currentGame) });
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

  const database = await store.update((current) => {
    if (!current.currentGame) {
      throw new Error("Start a game before adding players.");
    }

    if (isGameFinished(current.currentGame)) {
      throw new Error("This game is finished. Start a new game to keep scoring.");
    }

    const duplicate = current.currentGame.players.some(
      (player) => player.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      throw new Error("That player already exists.");
    }

    const updatedGame: Game = {
      ...current.currentGame,
      updatedAt: now(),
      players: [...current.currentGame.players, { id: createId(), name }]
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

  const database = await store.update((current) => {
    if (!current.currentGame) {
      throw new Error("Start a game before removing players.");
    }

    const players = current.currentGame.players.filter((player) => player.id !== playerId);

    if (players.length === current.currentGame.players.length) {
      throw new Error("Player not found.");
    }

    if (players.length < 2) {
      throw new Error("A game needs at least two players.");
    }

    const updatedGame: Game = {
      ...current.currentGame,
      updatedAt: now(),
      players,
      rounds: current.currentGame.rounds.map((round) => ({
        ...round,
        scores: round.scores.filter((score) => score.playerId !== playerId)
      }))
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

  const database = await store.update((current) => {
    if (!current.currentGame) {
      throw new Error("There is no current game to restart.");
    }

    const nextGame = createGame(
      title || current.currentGame.title,
      current.currentGame.players.map((player) => player.name)
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

  response.status(201).json({ game: toGameResponse(database.currentGame), history: database.gameHistory });
});

app.post("/api/rounds", async (request, response) => {
  const note = String(request.body?.note ?? "").trim();
  const incomingScores: unknown[] = Array.isArray(request.body?.scores) ? request.body.scores : [];

  const database = await store.update((current) => {
    if (!current.currentGame) {
      throw new Error("Start a game before adding rounds.");
    }

    if (isGameFinished(current.currentGame)) {
      throw new Error("This game is already finished.");
    }

    const validPlayers = new Set(current.currentGame.players.map((player) => player.id));
    const scores: RoundScore[] = incomingScores.map((score) => ({
      playerId: String((score as { playerId?: unknown }).playerId),
      points: Number((score as { points?: unknown }).points ?? 0)
    }));

    if (scores.length !== current.currentGame.players.length) {
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
    if (seenPlayers.size !== current.currentGame.players.length) {
      throw new Error("Each player should appear only once per round.");
    }

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

    if (isGameFinished(updatedGame)) {
      updatedGame.completedAt = now();
    }

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

app.delete("/api/game", async (_request, response) => {
  const database = await store.update((current) => ({
    currentGame: null,
    gameHistory: archiveCurrentGame(current.gameHistory, current.currentGame)
  }));

  response.json({ game: null, history: database.gameHistory });
});

app.delete("/api/history/:id", async (request, response) => {
  const gameId = String(request.params.id ?? "");

  const database = await store.update((current) => {
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

  response.json({ history: database.gameHistory });
});

app.get(/^(?!\/api).*/, (_request, response) => {
  response.sendFile(path.join(publicDirectory, "index.html"));
});

app.listen(port, () => {
  console.log(`Flip 7 scorekeeper is running on http://localhost:${port}`);
});
