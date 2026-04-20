const STORAGE_KEY = "flip7-preferences";
const APP_VERSION = "2026.16.02";
const DEFAULT_SETTINGS = {
  theme: "system",
  language: "en",
  defaultWinningScore: 200,
  defaultScoreInputMode: "manual",
  hiddenRecentGameIds: []
};
const SUPPORTED_LANGUAGES = ["en", "sv", "da"];

const FLIP7_BONUS_POINTS = 15;
const SCORE_INPUT_MODES = {
  manual: "manual",
  cards: "cards"
};
const FLIP7_NUMBER_CARDS = Array.from({ length: 13 }, (_, index) => index);
const FLIP7_MODIFIER_CARDS = [
  { token: "modifier:+2", label: "+2", value: 2 },
  { token: "modifier:+4", label: "+4", value: 4 },
  { token: "modifier:+6", label: "+6", value: 6 },
  { token: "modifier:+8", label: "+8", value: 8 },
  { token: "modifier:+10", label: "+10", value: 10 },
  { token: "modifier:x2", label: "x2", multiplier: 2 }
];
const FLIP7_CARD_ART_URLS = {
  "number:0": "/assets/cards/number_0.svg",
  "number:1": "/assets/cards/number_1.svg",
  "number:2": "/assets/cards/number_2.svg",
  "number:3": "/assets/cards/number_3.svg",
  "number:4": "/assets/cards/number_4.svg",
  "number:5": "/assets/cards/number_5.svg",
  "number:6": "/assets/cards/number_6.svg",
  "number:7": "/assets/cards/number_7.svg",
  "number:8": "/assets/cards/number_8.svg",
  "number:9": "/assets/cards/number_9.svg",
  "number:10": "/assets/cards/number_10.svg",
  "number:11": "/assets/cards/number_11.svg",
  "number:12": "/assets/cards/number_12.svg",
  "modifier:+2": "/assets/cards/bonus_plus_2.svg",
  "modifier:+4": "/assets/cards/bonus_plus_4.svg",
  "modifier:+6": "/assets/cards/bonus_plus_6.svg",
  "modifier:+8": "/assets/cards/bonus_plus_8.svg",
  "modifier:+10": "/assets/cards/bonus_plus_10.svg",
  "modifier:x2": "/assets/cards/bonus_times_2.svg"
};
const FAKE_SCAN_HANDS = [
  [
    "number:0",
    "number:1",
    "number:2",
    "number:3",
    "number:4",
    "number:5",
    "number:6",
    "modifier:+2",
    "modifier:+4",
    "modifier:+6",
    "modifier:+8",
    "modifier:+10",
    "modifier:x2"
  ],
  ["number:5", "number:6", "number:9"],
  ["number:0", "number:7", "number:11", "modifier:+4"],
  ["number:3", "number:4", "number:8", "modifier:x2"],
  ["number:1", "number:3", "number:5", "number:7", "number:9", "number:11", "number:12"]
];

const scanCamera = {
  stream: null,
  starting: false
};

function createUuid() {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.randomUUID) {
    return cryptoObject.randomUUID();
  }

  if (cryptoObject?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoObject.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeScoreInputMode(value) {
  return value === SCORE_INPUT_MODES.cards ? SCORE_INPUT_MODES.cards : SCORE_INPUT_MODES.manual;
}

function getNewGameScoreInputMode(gameMode, fallback = DEFAULT_SETTINGS.defaultScoreInputMode) {
  if (gameMode !== "classic") {
    return SCORE_INPUT_MODES.manual;
  }

  return normalizeScoreInputMode(fallback);
}

function getFlip7CardArtUrl(token) {
  return FLIP7_CARD_ART_URLS[token] || "";
}

function renderFlip7CardButton({
  token,
  label,
  playerId,
  selected = false,
  disabled = false,
  modifier = false,
  action = "toggle-card-selection"
}) {
  const artUrl = getFlip7CardArtUrl(token);

  return `
    <button
      class="score-card-button ${modifier ? "score-card-button-modifier" : ""} ${selected ? "is-selected" : ""}"
      type="button"
      data-action="${escapeHtml(action)}"
      data-player-id="${escapeHtml(playerId)}"
      data-card-token="${escapeHtml(token)}"
      aria-label="${escapeHtml(label)}"
      aria-pressed="${selected ? "true" : "false"}"
      ${disabled ? "disabled" : ""}
    >
      <img class="score-card-art" src="${escapeHtml(artUrl)}" alt="" aria-hidden="true" draggable="false" />
      <span class="sr-only">${escapeHtml(label)}</span>
    </button>
  `;
}

function preloadFlip7CardArt() {
  if (typeof Image === "undefined") {
    return;
  }

  Object.values(FLIP7_CARD_ART_URLS).forEach((src) => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
  });
}


const initialSettings = loadSettings();

const state = {
  route: getRouteFromHash(),
  drawerOpen: false,
  menu: null,
  confirmNextRoundOpen: false,
  confirmArchiveOpen: false,
  data: {
    currentGame: null,
    history: []
  },
  settings: initialSettings,
  draft: {
    newGame: {
      title: "",
      gameMode: "classic",
      winningScore: String(initialSettings.defaultWinningScore),
      scoreInputMode: getNewGameScoreInputMode("classic", initialSettings.defaultScoreInputMode),
      playerInput: "",
      players: []
    },
    statsScope: "current",
    statsGameId: "",
    currentGameOrder: "entered",
    currentGamePlayerInput: "",
    currentGameRenamingPlayerId: null,
    currentGameRenameInput: "",
    currentGameFocusTarget: null,
    scoreInputMode: initialSettings.defaultScoreInputMode,
    cardPickerPlayerId: null,
    currentRoundKey: "new",
    liveRoundVersion: 0,
    roundNote: "",
    roundScores: {},
    roundCardSelections: {},
    finishedRoundNoteSaveTimeoutId: null,
    roundDrafts: {
      new: {
        roundNote: "",
        roundScores: {},
        scoreInputMode: initialSettings.defaultScoreInputMode,
        cardPickerPlayerId: null,
        roundCardSelections: {}
      }
    },
    scanRound: null
  },
  homeSwipe: null,
  homeSwipeSuppressClickId: null,
  celebration: {
    rafId: null,
    timeoutId: null,
    burstTimers: [],
    presentation: null
  },
  loading: true,
  systemError: null
};

const elements = {
  appBackdrop: document.querySelector("#app-backdrop"),
  drawer: document.querySelector("#drawer"),
  menuButton: document.querySelector("#menu-button"),
  gameMenu: document.querySelector("#game-menu"),
  roundConfirmModal: document.querySelector("#round-confirm-modal"),
  roundConfirmTitle: document.querySelector("#round-confirm-title"),
  roundConfirmMessage: document.querySelector("#round-confirm-message"),
  roundConfirmContinue: document.querySelector("#round-confirm-continue"),
  roundConfirmCancel: document.querySelector("#round-confirm-cancel"),
  archiveConfirmModal: document.querySelector("#archive-confirm-modal"),
  archiveConfirmTitle: document.querySelector("#archive-confirm-title"),
  archiveConfirmMessage: document.querySelector("#archive-confirm-message"),
  archiveConfirmContinue: document.querySelector("#archive-confirm-continue"),
  archiveConfirmCancel: document.querySelector("#archive-confirm-cancel"),
  systemBanner: document.querySelector("#system-banner"),
  celebration: document.querySelector("#celebration"),
  celebrationCanvas: document.querySelector("#celebration-canvas"),
  celebrationTitle: document.querySelector("#celebration-title"),
  celebrationName: document.querySelector("#celebration-name"),
  celebrationActions: document.querySelector("#celebration-actions"),
  celebrationSuddenDeath: document.querySelector("#celebration-sudden-death"),
  celebrationKeepTied: document.querySelector("#celebration-keep-tied"),
  toast: document.querySelector("#toast"),
  screens: {
    home: document.querySelector("#screen-home"),
    newGame: document.querySelector("#screen-new-game"),
    existingGames: document.querySelector("#screen-existing-games"),
    currentGame: document.querySelector("#screen-current-game"),
    stats: document.querySelector("#screen-stats"),
    settings: document.querySelector("#screen-settings")
  }
};

function getRouteFromHash() {
  const route = window.location.hash.replace("#", "").trim();
  return ["home", "new-game", "existing-games", "current-game", "stats", "settings"].includes(route)
    ? route
    : "home";
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : "en";
}

function loadSettings() {
  const preferredLanguage = getPreferredLanguage();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return getDefaultSettings(preferredLanguage);
    }

    const storedLanguage = SUPPORTED_LANGUAGES.includes(parsed.language) ? parsed.language : null;

    return {
      theme: parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
        ? parsed.theme
        : DEFAULT_SETTINGS.theme,
      language: storedLanguage || preferredLanguage,
      defaultWinningScore:
        Number.isFinite(Number(parsed.defaultWinningScore)) && Number(parsed.defaultWinningScore) > 0
          ? Number(parsed.defaultWinningScore)
          : DEFAULT_SETTINGS.defaultWinningScore,
      defaultScoreInputMode: normalizeScoreInputMode(parsed.defaultScoreInputMode),
      hiddenRecentGameIds: Array.isArray(parsed.hiddenRecentGameIds)
        ? parsed.hiddenRecentGameIds.filter((value) => typeof value === "string" && value.length > 0)
        : []
    };
  } catch {
    return getDefaultSettings(preferredLanguage);
  }
}

function getPreferredLanguage() {
  const languages = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
    navigator.userLanguage
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (languages.some((language) => language.startsWith("da"))) {
    return "da";
  }

  if (languages.some((language) => language.startsWith("sv"))) {
    return "sv";
  }

  return "en";
}

function getDefaultSettings(language = getPreferredLanguage()) {
  return {
    ...DEFAULT_SETTINGS,
    hiddenRecentGameIds: [],
    language: normalizeLanguage(language)
  };
}

async function loadTranslationResource(language) {
  const response = await fetch(`/locales/${encodeURIComponent(language)}/translation.json`);
  if (!response.ok) {
    throw new Error(`Could not load ${language} translations.`);
  }

  return response.json();
}

async function initI18n() {
  if (!globalThis.i18next) {
    throw new Error("i18next is not available.");
  }

  const entries = await Promise.all(
    SUPPORTED_LANGUAGES.map(async (language) => [
      language,
      {
        translation: await loadTranslationResource(language)
      }
    ])
  );

  await globalThis.i18next.init({
    lng: normalizeLanguage(state.settings.language),
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    resources: Object.fromEntries(entries),
    interpolation: {
      escapeValue: false
    },
    returnNull: false
  });
}

function renderInputModeToggle({ value, action, allowCards = true, ariaLabel }) {
  const selectedMode = allowCards ? normalizeScoreInputMode(value) : SCORE_INPUT_MODES.manual;

  return `
    <div class="current-mode-toggle" role="group" aria-label="${escapeHtml(ariaLabel)}">
      <button
        class="${selectedMode === SCORE_INPUT_MODES.manual ? "primary-action" : "secondary-action"}"
        type="button"
        data-action="${escapeHtml(action)}"
        data-mode="manual"
      >
        ${escapeHtml(t("current.manualMode"))}
      </button>
      <button
        class="${selectedMode === SCORE_INPUT_MODES.cards ? "primary-action" : "secondary-action"}"
        type="button"
        data-action="${escapeHtml(action)}"
        data-mode="cards"
        ${allowCards ? "" : "disabled"}
      >
        ${escapeHtml(t("current.cardMode"))}
      </button>
    </div>
  `;
}

function t(path, vars = {}) {
  return globalThis.i18next?.t(path, vars) || path;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(state.settings.language, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false
  }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat(state.settings.language).format(value);
}

function formatNameList(names) {
  if (!names.length) {
    return "";
  }

  if (typeof Intl !== "undefined" && typeof Intl.ListFormat === "function") {
    return new Intl.ListFormat(state.settings.language, { style: "long", type: "conjunction" }).format(names);
  }

  return names.join(", ");
}

function pluralLabel(count, singular, plural) {
  return count === 1 ? singular : plural;
}

function gameModeLabel(mode) {
  return t(`modes.${mode}`);
}

function buildScoreboard(players, totals) {
  return players
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      total: totals[player.id] || 0
    }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
}

function getGameProgress(game) {
  if (!game) {
    return {
      scoreboard: [],
      winners: [],
      winner: null,
      winningRoundId: null,
      winningRoundNumber: null,
      invalidRoundIds: [],
      completedAt: null
    };
  }

  const totals = Object.fromEntries(game.players.map((player) => [player.id, 0]));
  let winners = [];
  let winner = null;
  let winningRoundId = null;
  let winningRoundNumber = null;
  let completedAt = null;
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

    for (const score of round.scores || []) {
      totals[score.playerId] = (totals[score.playerId] || 0) + score.points;
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
}

function resolveTheme() {
  if (state.settings.theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return state.settings.theme;
}

function applyPreferences() {
  const theme = resolveTheme();
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = state.settings.language;
  document.title = t("app.title");
}

function summarizeGame(game) {
  return getGameProgress(game).scoreboard;
}

function getWinner(game) {
  return getGameProgress(game).winner;
}

function getWinnerPresentation(game) {
  const progress = getGameProgress(game);
  const winners = progress.winners?.length ? progress.winners : progress.winner ? [progress.winner] : [];
  const names = winners.map((winner) => winner.name);

  return {
    winners,
    names,
    label: names.length > 1 ? t("current.tiedWinnerLabel") : t("current.winnerLabel"),
    celebrationTitle: names.length > 1 ? t("celebration.tiedTitle") : t("celebration.title"),
    nameText: formatNameList(names),
    total: winners[0]?.total ?? 0,
    roundId: winners[0]?.roundId || null,
    roundNumber: winners[0]?.roundNumber || null
  };
}

function getActiveStatsGame() {
  return state.data.currentGame || state.data.history[0] || null;
}

function buildGameStats(game) {
  const progress = getGameProgress(game);
  const activeRounds =
    progress.winningRoundNumber !== null ? game.rounds.slice(0, progress.winningRoundNumber) : game.rounds;
  const scoreboard = progress.scoreboard;
  const roundTotals = activeRounds.map((round) =>
    round.scores.reduce((sum, score) => sum + score.points, 0)
  );
  const singleScores = activeRounds.flatMap((round) => round.scores.map((score) => score.points));
  const highestSingleScore = singleScores.length ? Math.max(...singleScores) : 0;
  const lowestSingleScore = singleScores.length ? Math.min(...singleScores) : 0;
  const highestRoundTotal = roundTotals.length ? Math.max(...roundTotals) : 0;
  const lowestRoundTotal = roundTotals.length ? Math.min(...roundTotals) : 0;
  const averageRoundTotal = roundTotals.length
    ? roundTotals.reduce((sum, value) => sum + value, 0) / roundTotals.length
    : 0;

  return {
    scoreboard,
    rounds: activeRounds,
    roundTotals,
    highestSingleScore,
    lowestSingleScore,
    highestRoundTotal,
    lowestRoundTotal,
    averageRoundTotal,
    leader: scoreboard[0] || null,
    winner: getWinner(game),
    winnerPresentation: getWinnerPresentation(game)
  };
}

function getStatsGames() {
  const games = [];

  if (state.data.currentGame) {
    games.push(state.data.currentGame);
  }

  for (const game of state.data.history) {
    if (!games.some((entry) => entry.id === game.id)) {
      games.push(game);
    }
  }

  return games;
}

function buildAllGamesStats(games) {
  const activeRounds = games.flatMap((game) => {
    const progress = getGameProgress(game);
    const rounds =
      progress.winningRoundNumber !== null ? game.rounds.slice(0, progress.winningRoundNumber) : game.rounds;

    return rounds.map((round) => ({
      gameId: game.id,
      gameTitle: game.title,
      round
    }));
  });

  const roundTotals = activeRounds.map(({ round }) => round.scores.reduce((sum, score) => sum + score.points, 0));
  const singleScores = activeRounds.flatMap(({ round }) => round.scores.map((score) => score.points));
  const highestSingleScore = singleScores.length ? Math.max(...singleScores) : 0;
  const lowestSingleScore = singleScores.length ? Math.min(...singleScores) : 0;
  const highestRoundTotal = roundTotals.length ? Math.max(...roundTotals) : 0;
  const lowestRoundTotal = roundTotals.length ? Math.min(...roundTotals) : 0;
  const averageRoundTotal = roundTotals.length
    ? roundTotals.reduce((sum, value) => sum + value, 0) / roundTotals.length
    : 0;

  return {
    games,
    rounds: activeRounds,
    roundTotals,
    highestSingleScore,
    lowestSingleScore,
    highestRoundTotal,
    lowestRoundTotal,
    averageRoundTotal,
    totalGames: games.length,
    totalRounds: activeRounds.length,
    averageRoundsPerGame: games.length ? activeRounds.length / games.length : 0
  };
}

function isPlayerActiveAt(player, timestamp) {
  const targetTime = Date.parse(timestamp);
  if (!Number.isFinite(targetTime)) {
    return Boolean(player?.isActive);
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
}

function getActiveGamePlayers(game) {
  return [...(game?.players || [])].filter((player) => player.isActive);
}

function getActivePlayerCount(game) {
  return getActiveGamePlayers(game).length;
}

function getPlayersActiveAt(game, timestamp) {
  return [...(game?.players || [])].filter((player) => isPlayerActiveAt(player, timestamp));
}

function getRoundPlayers(game, roundKey = getRoundDraftKey()) {
  if (!game) {
    return [];
  }

  if (roundKey === "new") {
    return getActiveGamePlayers(game);
  }

  const round = game.rounds.find((entry) => entry.id === roundKey);
  if (!round) {
    return getActiveGamePlayers(game);
  }

  return getPlayersActiveAt(game, round.createdAt);
}

function getCurrentGamePlayers(game) {
  const basePlayers = [...getRoundPlayers(game)];
  if (state.draft.currentGameOrder !== "leader") {
    return basePlayers;
  }

  const leaderboard = summarizeGame(game);
  const order = new Map(leaderboard.map((entry) => [entry.playerId, entry.total]));
  const originalIndex = new Map(basePlayers.map((player, index) => [player.id, index]));

  return basePlayers.sort((left, right) => {
    const rightTotal = order.get(right.id) ?? 0;
    const leftTotal = order.get(left.id) ?? 0;
    return rightTotal - leftTotal || (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
  });
}

function getCurrentGameLiveScorePreview(game, roundScores = state.draft.roundScores) {
  const progress = getGameProgress(game);
  const committedTotals = new Map(progress.scoreboard.map((entry) => [entry.playerId, entry.total]));
  const previews = new Map();
  let leaderTotal = 0;

  for (const player of getCurrentGamePlayers(game)) {
    const committedTotal = committedTotals.get(player.id) ?? 0;
    const rawValue = roundScores?.[player.id];
    const hasValue = rawValue !== "" && rawValue !== null && rawValue !== undefined;
    const enteredPoints = hasValue ? Number(rawValue) : 0;
    const safeEnteredPoints = Number.isFinite(enteredPoints) ? enteredPoints : 0;
    const projectedTotal = committedTotal + safeEnteredPoints;

    previews.set(player.id, {
      committedTotal,
      enteredPoints: safeEnteredPoints,
      projectedTotal,
      hasValue
    });

    leaderTotal = Math.max(leaderTotal, projectedTotal);
  }

  let leaderCount = 0;
  for (const preview of previews.values()) {
    if (preview.projectedTotal === leaderTotal) {
      leaderCount += 1;
    }
  }

  return { leaderCount, leaderTotal, previews };
}

function getCurrentGamePreviewLabel(projectedTotal, leaderTotal, leaderCount) {
  const gap = leaderTotal - projectedTotal;
  if (gap <= 0) {
    return leaderCount > 1 ? t("current.tiedLeaderLabel") : t("current.leaderLabel");
  }

  return t("current.behindLeader", { count: gap });
}

function getCurrentGameTotalLine(total, winningScore) {
  const pointsLeft = Math.max(0, winningScore - total);
  return `${formatNumber(total)} pts · ${t("current.leftToWin", { count: pointsLeft })}`;
}

function updateCurrentGameLiveScorePreview() {
  const game = state.data.currentGame;
  if (!game || state.route !== "current-game" || getRoundDraftKey() !== "new") {
    return;
  }

  const form = document.querySelector("#current-game-form");
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const { leaderCount, leaderTotal, previews } = getCurrentGameLiveScorePreview(game);

  form.querySelectorAll(".score-row[data-player-id]").forEach((row) => {
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const playerId = row.dataset.playerId;
    if (!playerId) {
      return;
    }

    const preview = previews.get(playerId);
    const previewTotal = row.querySelector("[data-live-score-preview-total]");
    const previewGap = row.querySelector("[data-live-score-preview-gap]");

    if (!(previewTotal instanceof HTMLElement) || !(previewGap instanceof HTMLElement) || !preview) {
      return;
    }

    const totalLine = row.querySelector("[data-live-score-total]");

    if (totalLine instanceof HTMLElement) {
      const displayedTotal = preview.hasValue ? preview.projectedTotal : preview.committedTotal;
      totalLine.textContent = getCurrentGameTotalLine(displayedTotal, game.winningScore);
    }

    if (preview.hasValue) {
      previewTotal.textContent = t("current.liveScorePreview", {
        committed: formatNumber(preview.committedTotal),
        entered: formatNumber(preview.enteredPoints),
        projected: formatNumber(preview.projectedTotal)
      });
    } else {
      previewTotal.textContent = "";
    }

    previewGap.textContent = getCurrentGamePreviewLabel(preview.projectedTotal, leaderTotal, leaderCount);
  });
}

function syncCurrentGameCardPickerState(game, playerId = state.draft.cardPickerPlayerId) {
  if (!game || state.route !== "current-game") {
    return;
  }

  const screen = elements.screens.currentGame;
  if (!screen) {
    return;
  }

  const picker = screen.querySelector(".score-card-picker-shell");
  if (!(picker instanceof HTMLElement)) {
    return;
  }

  const effectivePlayerId = typeof playerId === "string" && playerId.length ? playerId : state.draft.cardPickerPlayerId;
  if (!effectivePlayerId) {
    return;
  }

  const selection = getRoundCardSelections(game)[effectivePlayerId] || [];
  const stats = getFlip7CardSelectionStats(selection);
  const manualScoreValue = String(state.draft.roundScores[effectivePlayerId] ?? "").trim();
  const manualEditActive = selection.length === 0 && manualScoreValue.length > 0;

  picker.classList.toggle("is-manual-edit", manualEditActive);

  const countEl = picker.querySelector("[data-card-picker-count]");
  if (countEl instanceof HTMLElement) {
    countEl.textContent = manualEditActive
      ? `${t("current.manualEditActive")} · ${formatNumber(Number(manualScoreValue || 0))} ${t("common.points")}`
      : `${t("current.cardsSelected", { count: stats.numberCount })} · ${formatNumber(stats.total)} ${t("common.points")}`;
  }

  const summaryEl = picker.querySelector("[data-card-picker-summary]");
  if (summaryEl instanceof HTMLElement) {
    summaryEl.textContent = manualEditActive
      ? `${formatNumber(Number(manualScoreValue || 0))} ${t("common.points")} • ${t("current.manualEditActive")}`
      : stats.flip7Bonus
        ? `${formatNumber(stats.total)} ${t("common.points")} • ${t("current.flip7Achieved")}`
        : `${formatNumber(stats.total)} ${t("common.points")}`;
  }

  const input = [...screen.querySelectorAll("input[data-player-id]")].find(
    (entry) => entry instanceof HTMLInputElement && entry.dataset.playerId === effectivePlayerId
  );
  if (input instanceof HTMLInputElement) {
    input.disabled = selection.length > 0;
    input.value = selection.length > 0 ? String(stats.total) : manualScoreValue;
  }

  picker.querySelectorAll(".score-card-button[data-card-token]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const token = button.dataset.cardToken || "";
    const isSelected = selection.includes(token);
    const isNumberCard = token.startsWith("number:");

    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    button.disabled = manualEditActive || (isNumberCard ? stats.numberCount === 7 && !isSelected : false);
  });

  updateCurrentGameLiveScorePreview();
}

function getStatsScopeState() {
  const games = getStatsGames();
  if (!games.length) {
    return { mode: "single", game: null, games };
  }

  if (games.length === 1) {
    return { mode: "single", game: games[0], games };
  }

  const hasCurrentGame = Boolean(state.data.currentGame);
  const scope = hasCurrentGame ? state.draft.statsScope : state.draft.statsScope === "current" ? "all" : state.draft.statsScope;

  if (scope === "all") {
    return { mode: "all", games };
  }

  if (scope === "pick") {
    const selectedGame =
      games.find((game) => game.id === state.draft.statsGameId) ||
      (hasCurrentGame ? state.data.currentGame : games[0]) ||
      null;
    return { mode: "pick", game: selectedGame, games };
  }

  const currentGame = state.data.currentGame || games[0];
  return { mode: hasCurrentGame ? "current" : "single", game: currentGame, games };
}

async function api(url, options = {}) {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    let payload = {};

    if (text && contentType.includes("application/json")) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = {};
      }
    } else if (text && !response.ok) {
      payload = {
        error:
          response.status >= 500 || /<!doctype html>|<html[\s>]/i.test(text)
            ? t("common.dbUnavailable")
            : text
      };
    }

    if (!response.ok) {
      const message =
        response.status >= 500
          ? t("common.dbUnavailable")
          : typeof payload?.error === "string"
            ? payload.error
            : t("common.dbUnavailable");
      const apiError = new Error(message);
      apiError.apiError = true;
      throw apiError;
    }

    if (state.systemError) {
      state.systemError = null;
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.apiError) {
      throw error;
    }

    throw new Error(t("common.dbUnavailable"));
  }
}

const cloneValue = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const now = () => new Date().toISOString();

function isClassicCardModeGame(game) {
  return Boolean(game && game.gameMode === "classic");
}

function getCardInputMode(game, roundKey = getRoundDraftKey()) {
  if (!isClassicCardModeGame(game)) {
    return SCORE_INPUT_MODES.manual;
  }

  if (roundKey !== "new") {
    const round = game?.rounds.find((entry) => entry.id === roundKey) || null;
    return normalizeScoreInputMode(round?.scoreInputMode);
  }

  return normalizeScoreInputMode(game?.defaultScoreInputMode);
}

function normalizeCardToken(token) {
  if (typeof token !== "string" || !token.length) {
    return null;
  }

  if (FLIP7_NUMBER_CARDS.some((value) => token === `number:${value}`)) {
    return token;
  }

  if (FLIP7_MODIFIER_CARDS.some((card) => card.token === token)) {
    return token;
  }

  return null;
}

function getFlip7CardSelectionStats(selection) {
  const selectedCards = Array.isArray(selection) ? selection.filter((value) => typeof value === "string") : [];
  const numberValues = new Set();
  let numberTotal = 0;
  let modifierTotal = 0;
  let hasMultiplier = false;

  for (const token of selectedCards) {
    if (token.startsWith("number:")) {
      const value = Number(token.slice("number:".length));
      if (!Number.isFinite(value) || numberValues.has(value)) {
        continue;
      }

      numberValues.add(value);
      numberTotal += value;
      continue;
    }

    if (token === "modifier:x2") {
      hasMultiplier = true;
      continue;
    }

    if (token.startsWith("modifier:+")) {
      const value = Number(token.slice("modifier:+".length));
      if (Number.isFinite(value)) {
        modifierTotal += value;
      }
    }
  }

  const flip7Bonus = numberValues.size === 7 ? FLIP7_BONUS_POINTS : 0;
  const numberScore = hasMultiplier ? numberTotal * 2 : numberTotal;
  const total = numberScore + modifierTotal + flip7Bonus;

  return {
    selectedCards,
    numberCount: numberValues.size,
    numberTotal,
    modifierTotal,
    hasMultiplier,
    flip7Bonus,
    total
  };
}

function createScanPlayerDraft(player) {
  return {
    playerId: player.id,
    status: "idle",
    tokens: [],
    score: null,
    confidence: null,
    note: "",
    manualValue: "",
    imageDataUrl: null,
    imageMeta: null,
    timerIds: []
  };
}

function getScanRoundPlayers(game) {
  if (!game) {
    return [];
  }

  const playerIds = state.draft.scanRound?.playerOrder || [];
  const playersById = new Map(getRoundPlayers(game, "new").map((player) => [player.id, player]));
  return playerIds.map((playerId) => playersById.get(playerId)).filter(Boolean);
}

function getScanEntry(playerId) {
  return state.draft.scanRound?.players?.[playerId] || null;
}

function getScanStatusLabel(status) {
  const labels = {
    idle: t("current.scanRound.idle"),
    uploading: t("current.scanRound.uploading"),
    processing: t("current.scanRound.processing"),
    ready: t("current.scanRound.ready"),
    failed: t("current.scanRound.failed"),
    skipped: t("current.scanRound.skipped"),
    manual: t("current.scanRound.manualStatus")
  };

  return labels[status] || status;
}

function isScanRoundActiveForGame(game) {
  return Boolean(state.draft.scanRound?.active && game && state.draft.scanRound.gameId === game.id);
}

function getCurrentScanPlayer(game) {
  const players = getScanRoundPlayers(game);
  const index = state.draft.scanRound?.currentPlayerIndex ?? 0;
  return players[index] || null;
}

function clearScanTimers(scanRound = state.draft.scanRound) {
  if (!scanRound?.players) {
    return;
  }

  Object.values(scanRound.players).forEach((entry) => {
    if (!Array.isArray(entry.timerIds)) {
      return;
    }

    entry.timerIds.forEach((timerId) => window.clearTimeout(timerId));
    entry.timerIds = [];
  });
}

function stopScanCamera() {
  if (scanCamera.stream) {
    scanCamera.stream.getTracks().forEach((track) => track.stop());
  }

  scanCamera.stream = null;
  scanCamera.starting = false;
}

async function attachScanCamera() {
  const video = document.querySelector("[data-scan-camera]");
  if (!(video instanceof HTMLVideoElement) || !state.draft.scanRound?.active) {
    return;
  }

  if (scanCamera.stream) {
    video.srcObject = scanCamera.stream;
    return;
  }

  if (state.draft.scanRound.cameraStatus === "unavailable") {
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    if (state.draft.scanRound) {
      state.draft.scanRound.cameraStatus = "unavailable";
      render();
    }
    return;
  }

  if (scanCamera.starting) {
    return;
  }

  scanCamera.starting = true;
  try {
    scanCamera.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" }
      },
      audio: false
    });
    video.srcObject = scanCamera.stream;
    if (state.draft.scanRound) {
      state.draft.scanRound.cameraStatus = "ready";
    }
  } catch {
    if (state.draft.scanRound) {
      state.draft.scanRound.cameraStatus = "unavailable";
    }
  } finally {
    scanCamera.starting = false;
    if (state.draft.scanRound?.active) {
      render();
    }
  }
}

function makeScanPlaceholderImage(player, index) {
  const initial = String(player?.name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <rect width="640" height="420" fill="#1c1713"/>
      <rect x="56" y="42" width="528" height="336" rx="28" fill="#fffaf3" opacity="0.08"/>
      <g fill="#ff8a48" opacity="0.9">
        <rect x="164" y="118" width="82" height="126" rx="10" transform="rotate(-7 205 181)"/>
        <rect x="252" y="98" width="82" height="126" rx="10"/>
        <rect x="340" y="118" width="82" height="126" rx="10" transform="rotate(7 381 181)"/>
      </g>
      <text x="320" y="294" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="800" fill="#f6efe7">${initial}</text>
      <text x="320" y="334" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#c8b8a7">Scan prototype ${index + 1}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function captureScanPreview(player, index) {
  const video = document.querySelector("[data-scan-camera]");
  if (video instanceof HTMLVideoElement && video.videoWidth > 0 && video.videoHeight > 0) {
    const canvas = document.createElement("canvas");
    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.72);
    }
  }

  return makeScanPlaceholderImage(player, index);
}

function hasUsableScanCameraPreview() {
  const video = document.querySelector("[data-scan-camera]");
  return video instanceof HTMLVideoElement && video.videoWidth > 0 && video.videoHeight > 0;
}

function openScanFileCapture() {
  const input = document.querySelector("[data-scan-file-capture]");
  if (input instanceof HTMLInputElement) {
    input.click();
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Failed to read image.")));
    reader.readAsDataURL(file);
  });
}

async function prepareScanImageForRecognition(file) {
  if (window.Flip7ScanImage?.prepareScanImageForUpload) {
    return window.Flip7ScanImage.prepareScanImageForUpload(file);
  }

  const imageDataUrl = await readFileAsDataUrl(file);
  return {
    imageDataUrl,
    originalBytes: file.size,
    uploadBytes: file.size,
    width: null,
    height: null,
    sourceWidth: null,
    sourceHeight: null,
    originalType: file.type || "unknown",
    outputType: file.type || "unknown",
    resized: false
  };
}

async function readScanFileCapture(file) {
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return;
  }

  const playerId = state.draft.scanRound?.pendingCapturePlayerId;
  if (!playerId) {
    return;
  }

  state.draft.scanRound.pendingCapturePlayerId = null;

  try {
    const preparedImage = await prepareScanImageForRecognition(file);
    void completeScanPlayerCapture(playerId, preparedImage.imageDataUrl, preparedImage);
  } catch (error) {
    void completeScanPlayerCapture(playerId, null, {
      originalBytes: file.size,
      uploadBytes: file.size,
      warning: error instanceof Error ? error.message : "Image processing failed."
    });
  }
}

async function completeScanPlayerCapture(playerId, imageDataUrl = null, imageMeta = null) {
  const game = state.data.currentGame;
  const scanRound = state.draft.scanRound;
  if (!scanRound || !playerId) {
    return;
  }

  const players = getScanRoundPlayers(game);
  const player = players.find((entry) => entry.id === playerId);
  const index = players.findIndex((entry) => entry.id === playerId);
  const entry = getScanEntry(playerId);
  if (!player || !entry) {
    return;
  }

  clearScanTimers({ players: { [playerId]: entry } });
  Object.assign(entry, {
    status: "uploading",
    tokens: [],
    score: null,
    confidence: null,
    note: "",
    manualValue: "",
    imageDataUrl,
    imageMeta
  });
  render();

  if (!imageDataUrl) {
    Object.assign(entry, {
      status: "failed",
      note: t("current.scanRound.failed")
    });
    render();
    return;
  }

  try {
    const response = await fetch("/api/scan/recognize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageDataUrl,
        playerId,
        playerName: player.name,
        gameId: scanRound.gameId,
        imageMeta
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(String(payload?.error || payload?.message || t("current.scanRound.failed")));
    }

    const tokens = Array.isArray(payload?.tokens)
      ? payload.tokens.filter((token) => typeof token === "string" && token.trim().length > 0).map((token) => token.trim())
      : [];
    const stats = getFlip7CardSelectionStats(tokens);
    const confidence = typeof payload?.confidence === "number" && Number.isFinite(payload.confidence)
      ? Math.max(0, Math.min(1, payload.confidence))
      : null;
    const warnings = Array.isArray(payload?.warnings)
      ? payload.warnings.filter((warning) => typeof warning === "string" && warning.trim().length > 0)
      : [];

    Object.assign(entry, {
      status: tokens.length ? "ready" : "failed",
      tokens,
      score: tokens.length ? stats.total : null,
      confidence,
      note: warnings.join(" • ")
    });
    console.info("[scan-recognition]", {
      playerId,
      playerName: player.name,
      tokens,
      score: tokens.length ? stats.total : null,
      confidence,
      warnings,
      imageMeta
    });
  } catch (error) {
    Object.assign(entry, {
      status: "failed",
      tokens: [],
      score: null,
      confidence: null,
      note: error instanceof Error ? error.message : t("current.scanRound.failed")
    });
    console.error("[scan-recognition]", error);
  }

  render();
}

function startScanRound() {
  const game = state.data.currentGame;
  if (!game || game.isFinished) {
    return;
  }

  const players = getRoundPlayers(game, "new");
  if (!players.length) {
    return;
  }

  cacheRoundDraft(game, "new");
  state.draft.scanRound = {
    active: true,
    gameId: game.id,
    step: "summary",
    currentPlayerIndex: 0,
    manualPlayerId: null,
    manualInput: "",
    manualCardsPlayerId: null,
    focusScorePlayerId: null,
    pendingCapturePlayerId: null,
    summaryMenuPlayerId: null,
    cameraStatus: "starting",
    playerOrder: players.map((player) => player.id),
    players: Object.fromEntries(players.map((player) => [player.id, createScanPlayerDraft(player)]))
  };
  render();
}

function cancelScanRound({ silent = false } = {}) {
  clearScanTimers();
  stopScanCamera();
  state.draft.scanRound = null;
  if (!silent) {
    render();
  }
}

function advanceScanPlayer() {
  if (!state.draft.scanRound) {
    return;
  }

  state.draft.scanRound.step = "summary";
  state.draft.scanRound.manualPlayerId = null;
  state.draft.scanRound.manualInput = "";
  state.draft.scanRound.manualCardsPlayerId = null;
  state.draft.scanRound.pendingCapturePlayerId = null;
}

function openScanFileCapture(playerId = null) {
  const scanRound = state.draft.scanRound;
  if (!scanRound) {
    return;
  }

  scanRound.pendingCapturePlayerId = playerId;
  const input = document.querySelector("[data-scan-file-capture]");
  if (input instanceof HTMLInputElement) {
    input.click();
  }
}

function skipCurrentScanPlayer() {
  const player = getCurrentScanPlayer(state.data.currentGame);
  const entry = player ? getScanEntry(player.id) : null;
  if (!entry) {
    return;
  }

  clearScanTimers({ players: { [player.id]: entry } });
  Object.assign(entry, {
    status: "skipped",
    tokens: [],
    score: 0,
    confidence: null,
    note: t("current.scanRound.skipped"),
    manualValue: "0"
  });
  advanceScanPlayer();
  render();
}

function setScanManualScore(playerId, value, { advance = false } = {}) {
  const entry = getScanEntry(playerId);
  if (!entry) {
    return false;
  }

  const score = Number(value);
  if (!Number.isFinite(score)) {
    return false;
  }

  clearScanTimers({ players: { [playerId]: entry } });
  Object.assign(entry, {
    status: "manual",
    tokens: [],
    score,
    confidence: null,
    note: t("current.scanRound.manualStatus"),
    manualValue: String(value).trim()
  });
  if (advance) {
    advanceScanPlayer();
  }
  render();
  return true;
}

function enterManualForCurrentScanPlayer() {
  const player = getCurrentScanPlayer(state.data.currentGame);
  if (!player || !state.draft.scanRound) {
    return;
  }

  const entry = getScanEntry(player.id);
  state.draft.scanRound.manualPlayerId = player.id;
  state.draft.scanRound.manualInput = entry?.manualValue || (entry?.score !== null && entry?.score !== undefined ? String(entry.score) : "");
  render();
}

function closeScanSummaryMenu() {
  if (state.draft.scanRound?.summaryMenuPlayerId) {
    state.draft.scanRound.summaryMenuPlayerId = null;
    render();
  }
}

function toggleScanSummaryMenu(playerId) {
  if (!state.draft.scanRound || state.draft.scanRound.step !== "summary") {
    return;
  }

  state.draft.scanRound.manualCardsPlayerId = null;
  state.draft.scanRound.summaryMenuPlayerId =
    state.draft.scanRound.summaryMenuPlayerId === playerId ? null : playerId;
  render();
}

function closeScanManualCards() {
  if (state.draft.scanRound?.manualCardsPlayerId) {
    state.draft.scanRound.manualCardsPlayerId = null;
    render();
  }
}

function openScanManualCards(playerId) {
  if (!state.draft.scanRound || state.draft.scanRound.step !== "summary") {
    return;
  }

  const nextPlayerId =
    state.draft.scanRound.manualCardsPlayerId === playerId ? null : playerId;
  state.draft.scanRound.summaryMenuPlayerId = null;
  state.draft.scanRound.manualPlayerId = null;
  state.draft.scanRound.manualInput = "";
  state.draft.scanRound.manualCardsPlayerId = nextPlayerId;
  render();
}

function setScanManualCardSelection(playerId, selection) {
  const entry = getScanEntry(playerId);
  if (!entry) {
    return null;
  }

  const normalized = Array.isArray(selection) ? selection.map(normalizeCardToken).filter((token) => token !== null) : [];
  const stats = getFlip7CardSelectionStats(normalized);
  clearScanTimers({ players: { [playerId]: entry } });
  Object.assign(entry, {
    status: "manual",
    tokens: normalized,
    score: normalized.length > 0 ? stats.total : null,
    confidence: null,
    note: t("current.scanRound.manualStatus"),
    manualValue: ""
  });
  render();
  return stats;
}

function toggleScanManualCardSelection(playerId, token) {
  const entry = getScanEntry(playerId);
  if (!entry) {
    return null;
  }

  const normalizedToken = normalizeCardToken(token);
  if (!normalizedToken) {
    return null;
  }

  const currentSelection = Array.isArray(entry.tokens) ? [...entry.tokens] : [];
  const currentStats = getFlip7CardSelectionStats(currentSelection);
  const existingIndex = currentSelection.indexOf(normalizedToken);

  if (existingIndex >= 0) {
    currentSelection.splice(existingIndex, 1);
  } else {
    const isNumberCard = normalizedToken.startsWith("number:");
    if (isNumberCard && currentStats.numberCount === 7) {
      return currentStats;
    }

    currentSelection.push(normalizedToken);
  }

  state.draft.scanRound.manualCardsPlayerId = playerId;
  return setScanManualCardSelection(playerId, currentSelection);
}

function clearScanManualCardSelection(playerId) {
  state.draft.scanRound.manualCardsPlayerId = playerId;
  return setScanManualCardSelection(playerId, []);
}

function renderScanManualCardPicker(player, entry) {
  const selection = Array.isArray(entry.tokens) ? entry.tokens : [];
  const stats = getFlip7CardSelectionStats(selection);
  const selectionLabel = stats.flip7Bonus
    ? t("current.flip7Achieved")
    : t("current.cardsSelected", { count: stats.selectedCards.length });
  const summaryLabel = `${formatNumber(stats.total)} ${t("common.points")}`;
  const isLocked = stats.numberCount === 7;

  return `
    <div class="score-card-picker">
      <div class="score-card-picker-head">
        <span class="muted">${escapeHtml(t("current.cardModeHint"))}</span>
        <span class="pill ${stats.flip7Bonus ? "pill-success" : "pill-muted"}">${escapeHtml(selectionLabel)}</span>
      </div>
      <div class="score-card-picker-grid score-card-picker-grid-numbers">
        ${FLIP7_NUMBER_CARDS.map((value) => {
          const token = `number:${value}`;
          const isSelected = selection.includes(token);
          return renderFlip7CardButton({
            token,
            label: String(value),
            playerId: player.id,
            selected: isSelected,
            disabled: isLocked && !isSelected,
            action: "scan-summary-toggle-card"
          });
        }).join("")}
      </div>
      <div class="score-card-picker-divider"></div>
      <div class="score-card-picker-grid score-card-picker-grid-modifiers">
        ${FLIP7_MODIFIER_CARDS.map((card) => {
          const isSelected = selection.includes(card.token);
          return renderFlip7CardButton({
            token: card.token,
            label: card.label,
            playerId: player.id,
            selected: isSelected,
            disabled: isLocked && !isSelected,
            modifier: true,
            action: "scan-summary-toggle-card"
          });
        }).join("")}
      </div>
      <div class="score-card-picker-footer">
        <span class="score-card-picker-summary">${escapeHtml(summaryLabel)}</span>
        <button
          class="secondary-action score-card-clear"
          type="button"
          data-action="scan-summary-clear-cards"
          data-player-id="${escapeHtml(player.id)}"
        >
          ${escapeHtml(t("current.clearCards"))}
        </button>
      </div>
    </div>
  `;
}

function renderScanManualCardPanel(player, entry) {
  return `
    <section class="scan-summary-manual-panel score-card-picker-shell" data-player-id="${escapeHtml(player.id)}">
      <div class="scan-summary-manual-head">
        <div class="scan-summary-manual-copy">
          <p class="eyebrow">${escapeHtml(t("current.scanRound.manualAddCards"))}</p>
          <strong>${escapeHtml(player.name)}</strong>
        </div>
        <button
          class="secondary-action scan-summary-manual-close"
          type="button"
          data-action="scan-summary-close-cards"
          data-player-id="${escapeHtml(player.id)}"
        >
          ${escapeHtml(t("common.close"))}
        </button>
      </div>
      ${renderScanManualCardPicker(player, entry)}
    </section>
  `;
}

function focusScanSummaryScoreInput(playerId) {
  if (!state.draft.scanRound) {
    return;
  }

  state.draft.scanRound.focusScorePlayerId = playerId;
  state.draft.scanRound.summaryMenuPlayerId = null;
  render();
}

function rescanSummaryPlayer(playerId) {
  if (!state.draft.scanRound) {
    return;
  }

  state.draft.scanRound.summaryMenuPlayerId = null;
  closeScanManualCards();
  const entry = getScanEntry(playerId);
  if (entry?.imageDataUrl) {
    void completeScanPlayerCapture(playerId, entry.imageDataUrl, entry.imageMeta || null);
    return;
  }

  openScanFileCapture(playerId);
}

function retakeSummaryPlayer(playerId) {
  if (!state.draft.scanRound) {
    return;
  }

  state.draft.scanRound.summaryMenuPlayerId = null;
  closeScanManualCards();
  openScanFileCapture(playerId);
}

function captureSummaryPlayer(playerId) {
  if (!state.draft.scanRound) {
    return;
  }

  state.draft.scanRound.summaryMenuPlayerId = null;
  closeScanManualCards();
  openScanFileCapture(playerId);
}

function enterManualSummaryPlayer(playerId) {
  focusScanSummaryScoreInput(playerId);
}

function getScanRoundPendingCount() {
  const entries = Object.values(state.draft.scanRound?.players || {});
  return entries.filter((entry) => ["idle", "uploading", "processing"].includes(entry.status)).length;
}

function isScanRoundReadyToConfirm() {
  const entries = Object.values(state.draft.scanRound?.players || {});
  return (
    entries.length > 0 &&
    entries.every((entry) => {
      if (entry.status === "manual") {
        return (
          (Array.isArray(entry.tokens) && entry.tokens.length > 0) ||
          (typeof entry.manualValue === "string" && entry.manualValue.trim().length > 0) ||
          (typeof entry.score === "number" && Number.isFinite(entry.score))
        );
      }

      return ["ready", "skipped"].includes(entry.status);
    })
  );
}

async function confirmScanRound() {
  const game = state.data.currentGame;
  const scanRound = state.draft.scanRound;
  if (!game || !scanRound || !isScanRoundReadyToConfirm()) {
    return;
  }

  const players = getScanRoundPlayers(game);
  const nextScores = {};
  const nextSelections = {};
  players.forEach((player) => {
    const entry = getScanEntry(player.id);
    nextScores[player.id] = String(entry?.score ?? 0);
    nextSelections[player.id] = Array.isArray(entry?.tokens) ? entry.tokens : [];
  });

  clearScanTimers();
  stopScanCamera();
  state.draft.roundScores = nextScores;
  state.draft.roundCardSelections = nextSelections;
  state.draft.scoreInputMode = isClassicCardModeGame(game) ? SCORE_INPUT_MODES.cards : SCORE_INPUT_MODES.manual;
  state.draft.cardPickerPlayerId = players[0]?.id || null;
  cacheRoundDraft(game, "new");
  state.draft.scanRound = null;
  await saveRound();
}

function getRoundCardSelections(game, roundKey = getRoundDraftKey()) {
  const players = getRoundPlayers(game, roundKey);
  const selections = state.draft.roundCardSelections || {};

  return Object.fromEntries(
    players.map((player) => [
      player.id,
      Array.isArray(selections[player.id])
        ? selections[player.id].map(normalizeCardToken).filter((token) => token !== null)
        : []
    ])
  );
}

function setRoundCardSelection(game, playerId, selection, roundKey = getRoundDraftKey()) {
  const key = getRoundDraftKey(roundKey);
  if (!game || !playerId) {
    return null;
  }

  const normalized = Array.isArray(selection) ? selection.map(normalizeCardToken).filter((token) => token !== null) : [];
  state.draft.roundCardSelections = {
    ...(state.draft.roundCardSelections || {}),
    [playerId]: normalized
  };
  const stats = getFlip7CardSelectionStats(normalized);
  state.draft.roundScores = {
    ...state.draft.roundScores,
    [playerId]: normalized.length > 0 ? String(stats.total) : ""
  };

  cacheRoundDraft(game, key);
  return stats;
}

function toggleRoundCardSelection(game, playerId, token, roundKey = getRoundDraftKey()) {
  const key = getRoundDraftKey(roundKey);
  if (!game || !playerId) {
    return null;
  }

  const normalizedToken = normalizeCardToken(token);
  if (!normalizedToken) {
    return null;
  }

  const selections = getRoundCardSelections(game, key);
  const currentSelection = Array.isArray(selections[playerId]) ? [...selections[playerId]] : [];
  const currentManualValue = String(state.draft.roundScores[playerId] ?? "").trim();
  if (currentSelection.length === 0 && currentManualValue.length > 0) {
    return null;
  }
  const currentStats = getFlip7CardSelectionStats(currentSelection);
  const existingIndex = currentSelection.indexOf(normalizedToken);

  if (existingIndex >= 0) {
    currentSelection.splice(existingIndex, 1);
  } else {
    const isNumberCard = normalizedToken.startsWith("number:");
    if (isNumberCard && currentStats.numberCount === 7) {
      return currentStats;
    }

    currentSelection.push(normalizedToken);
  }

  const nextStats = setRoundCardSelection(game, playerId, currentSelection, key);

  return nextStats;
}

function clearRoundCardSelection(game, playerId, roundKey = getRoundDraftKey()) {
  return setRoundCardSelection(game, playerId, [], roundKey);
}

function renderFlip7CardPicker(player, selection) {
  const stats = getFlip7CardSelectionStats(selection);
  const selectionLabel = stats.flip7Bonus
    ? t("current.flip7Achieved")
    : t("current.cardsSelected", { count: stats.selectedCards.length });
  const summaryLabel = `${formatNumber(stats.total)} ${t("common.points")}`;
  const isLocked = stats.numberCount === 7;

  return `
    <div class="score-card-picker">
      <div class="score-card-picker-head">
        <span class="muted">${escapeHtml(t("current.cardModeHint"))}</span>
        <span class="pill ${stats.flip7Bonus ? "pill-success" : "pill-muted"}">${escapeHtml(selectionLabel)}</span>
      </div>
      <div class="score-card-picker-grid score-card-picker-grid-numbers">
        ${FLIP7_NUMBER_CARDS.map((value) => {
          const token = `number:${value}`;
          const isSelected = selection.includes(token);
          return renderFlip7CardButton({
            token,
            label: String(value),
            playerId: player.id,
            selected: isSelected,
            disabled: isLocked && !isSelected
          });
        }).join("")}
      </div>
      <div class="score-card-picker-divider"></div>
      <div class="score-card-picker-grid score-card-picker-grid-modifiers">
        ${FLIP7_MODIFIER_CARDS.map((card) => {
          const isSelected = selection.includes(card.token);
          return renderFlip7CardButton({
            token: card.token,
            label: card.label,
            playerId: player.id,
            selected: isSelected,
            disabled: isLocked && !isSelected,
            modifier: true
          });
        }).join("")}
      </div>
      <div class="score-card-picker-footer">
        <span class="score-card-picker-summary">${escapeHtml(summaryLabel)}</span>
        <button
          class="secondary-action score-card-clear"
          type="button"
          data-action="clear-card-selection"
          data-player-id="${escapeHtml(player.id)}"
        >
          ${escapeHtml(t("current.clearCards"))}
        </button>
      </div>
    </div>
  `;
}

function getCardPickerNavigatorState(game) {
  const players = getRoundPlayers(game);
  const currentPlayerId = state.draft.cardPickerPlayerId || players[0]?.id || null;
  const currentIndex = players.findIndex((player) => player.id === currentPlayerId);
  const selectedPlayer = currentIndex >= 0 ? players[currentIndex] : players[0] || null;
  const previousPlayer = currentIndex > 0 ? players[currentIndex - 1] : null;
  const nextPlayer = currentIndex >= 0 && currentIndex < players.length - 1 ? players[currentIndex + 1] : null;
  const selection = selectedPlayer ? getRoundCardSelections(game)[selectedPlayer.id] || [] : [];
  const stats = getFlip7CardSelectionStats(selection);

  return {
    players,
    currentPlayerId: selectedPlayer?.id || null,
    currentPlayerName: selectedPlayer?.name || "",
    currentPlayerIndex: currentIndex >= 0 ? currentIndex : 0,
    currentPlayerCount: players.length,
    previousPlayerId: previousPlayer?.id || null,
    nextPlayerId: nextPlayer?.id || null,
    stats
  };
}

function renderCardPickerPanel(game) {
  const navigator = getCardPickerNavigatorState(game);
  if (!navigator.currentPlayerId) {
    return "";
  }

  const player = navigator.players.find((entry) => entry.id === navigator.currentPlayerId) || navigator.players[0];
  if (!player) {
    return "";
  }

  const selection = getRoundCardSelections(game)[player.id] || [];
  const stats = getFlip7CardSelectionStats(selection);
  const manualScoreValue = String(state.draft.roundScores[player.id] ?? "").trim();
  const manualEditActive = selection.length === 0 && manualScoreValue.length > 0;
  const summaryText = manualEditActive
    ? `${formatNumber(Number(manualScoreValue || 0))} ${t("common.points")} • ${t("current.manualEditActive")}`
    : stats.flip7Bonus
      ? `${formatNumber(stats.total)} ${t("common.points")} • ${t("current.flip7Achieved")}`
      : `${formatNumber(stats.total)} ${t("common.points")}`;

  return `
    <div class="score-card-picker-shell ${manualEditActive ? "is-manual-edit" : ""}">
      <div class="current-round-nav current-player-nav" role="group" aria-label="${escapeHtml(t("current.cardMode"))}">
        <button
          class="round-nav-button"
          type="button"
          data-action="move-card-player"
          data-direction="prev"
          ${navigator.previousPlayerId ? "" : "disabled"}
          aria-label="${escapeHtml(t("current.previousPlayer"))}"
        >
          <span class="round-nav-button-copy">
            <span>${escapeHtml(t("current.previousWord"))}</span>
            <span>${escapeHtml(t("current.playerWord"))}</span>
          </span>
        </button>
        <div class="current-round-nav-copy">
          <strong title="${escapeHtml(navigator.currentPlayerName)}">${escapeHtml(navigator.currentPlayerName)}</strong>
          <span data-card-picker-count>${escapeHtml(
            manualEditActive ? t("current.manualEditActive") : t("current.cardsSelected", { count: stats.numberCount })
          )} · ${escapeHtml(manualEditActive ? formatNumber(Number(manualScoreValue || 0)) : formatNumber(stats.total))} ${escapeHtml(
            t("common.points")
          )}</span>
        </div>
        <button
          class="round-nav-button"
          type="button"
          data-action="move-card-player"
          data-direction="next"
          ${navigator.nextPlayerId ? "" : "disabled"}
          aria-label="${escapeHtml(t("current.nextPlayer"))}"
        >
          <span class="round-nav-button-copy">
            <span>${escapeHtml(t("current.nextWord"))}</span>
            <span>${escapeHtml(t("current.playerWord"))}</span>
          </span>
        </button>
      </div>
      <p class="muted current-card-hint">${escapeHtml(t("current.cardModeHint"))}</p>
      <div class="score-card-picker-grid score-card-picker-grid-numbers">
        ${FLIP7_NUMBER_CARDS.map((value) => {
          const token = `number:${value}`;
          const isSelected = selection.includes(token);
          return renderFlip7CardButton({
            token,
            label: String(value),
            playerId: player.id,
            selected: isSelected,
            disabled: manualEditActive || (stats.numberCount === 7 && !isSelected)
          });
        }).join("")}
      </div>
      <div class="score-card-picker-divider"></div>
      <div class="score-card-picker-grid score-card-picker-grid-modifiers">
        ${FLIP7_MODIFIER_CARDS.map((card) => {
          const isSelected = selection.includes(card.token);
          return renderFlip7CardButton({
            token: card.token,
            label: card.label,
            playerId: player.id,
            selected: isSelected,
            disabled: manualEditActive,
            modifier: true
          });
        }).join("")}
      </div>
      <div class="score-card-picker-footer">
        <span class="score-card-picker-summary" data-card-picker-summary>${escapeHtml(summaryText)}</span>
        <button
          class="secondary-action score-card-clear"
          type="button"
          data-action="clear-card-selection"
          data-player-id="${escapeHtml(player.id)}"
        >
          ${escapeHtml(t("current.clearCards"))}
        </button>
      </div>
    </div>
  `;
}

function snapshotAppState() {
  return {
    data: {
      currentGame: state.data.currentGame,
      history: [...state.data.history]
    },
    draft: cloneValue(state.draft),
    route: state.route,
    drawerOpen: state.drawerOpen,
    menu: state.menu ? { ...state.menu } : null,
    confirmNextRoundOpen: state.confirmNextRoundOpen,
    confirmArchiveOpen: state.confirmArchiveOpen,
    homeSwipeSuppressClickId: state.homeSwipeSuppressClickId
  };
}

function restoreAppState(snapshot) {
  clearFinishedRoundNoteAutosave();
  state.data = snapshot.data;
  state.draft = snapshot.draft;
  state.draft.finishedRoundNoteSaveTimeoutId = null;
  state.route = snapshot.route;
  state.drawerOpen = snapshot.drawerOpen;
  state.menu = snapshot.menu;
  state.confirmNextRoundOpen = snapshot.confirmNextRoundOpen;
  state.confirmArchiveOpen = snapshot.confirmArchiveOpen;
  state.homeSwipeSuppressClickId = snapshot.homeSwipeSuppressClickId;
  clearHomeSwipeState();

  if (window.location.hash.replace("#", "") !== snapshot.route) {
    window.location.hash = snapshot.route;
  }
}

function makePlayers(playerNames) {
  return Array.from(new Set(playerNames.map((name) => name.trim()).filter(Boolean))).map((name) => ({
    id: createUuid(),
    name
  }));
}

function makeNewGame({ title, gameMode, winningScore, defaultScoreInputMode, playerNames }) {
  const players = makePlayers(playerNames);
  const timestamp = now();

  return {
    id: createUuid(),
    title: title.trim() || "Flip 7 Game",
    gameMode,
    winningScore,
    defaultScoreInputMode:
      gameMode === "classic" ? normalizeScoreInputMode(defaultScoreInputMode) : SCORE_INPUT_MODES.manual,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    players,
    rounds: [],
    isFinished: false,
    winner: null
  };
}

function makeRestartedGame(game, title = game.title) {
  return makeNewGame({
    title,
    gameMode: game.gameMode,
    winningScore: game.winningScore,
    defaultScoreInputMode: game.defaultScoreInputMode,
    playerNames: game.players.map((player) => player.name)
  });
}

function decorateGame(game) {
  const progress = getGameProgress(game);
  return {
    ...game,
    completedAt: game.completedAt || progress.completedAt,
    scoreboard: progress.scoreboard,
    isFinished: Boolean(progress.winner),
    winner: progress.winner,
    invalidRoundIds: progress.invalidRoundIds,
    winningRoundId: progress.winningRoundId,
    winningRoundNumber: progress.winningRoundNumber
  };
}

function appendCurrentGameToHistory(history, currentGame) {
  if (!currentGame) {
    return history;
  }

  return [currentGame, ...history.filter((game) => game.id !== currentGame.id)];
}

function getHiddenRecentGameIds() {
  return new Set(
    Array.isArray(state.settings.hiddenRecentGameIds)
      ? state.settings.hiddenRecentGameIds.filter((value) => typeof value === "string" && value.length > 0)
      : []
  );
}

function hideRecentGame(gameId) {
  if (!gameId) {
    return;
  }

  if (state.data.currentGame?.id === gameId) {
    return;
  }

  const hidden = getHiddenRecentGameIds();
  if (hidden.has(gameId)) {
    return;
  }

  hidden.add(gameId);
  state.settings.hiddenRecentGameIds = [...hidden];
  saveSettings();
  clearHomeSwipeState();
  showToast(t("toast.recentRemoved"));
  render();
}

function remapRoundScores(previousPlayers, nextPlayers, draftScores) {
  const previousByName = new Map(previousPlayers.map((player) => [player.name.toLowerCase(), player.id]));

  return nextPlayers.reduce((scores, player, index) => {
    const previousPlayer = previousPlayers[index];
    const previousId = previousPlayer?.id || previousByName.get(player.name.toLowerCase());
    const value = draftScores[player.id] ?? (previousId ? draftScores[previousId] : undefined);

    scores[player.id] = value === "" || value === null || value === undefined ? "" : String(value);
    return scores;
  }, {});
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.dataset.variant = isError ? "error" : "default";
  elements.toast.classList.remove("hidden");
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 2600);
}

function hideToast() {
  clearTimeout(showToast.timeoutId);
  elements.toast.classList.add("hidden");
}

function setRoute(route, { replace = false } = {}) {
  state.route = route;
  state.drawerOpen = false;
  state.menu = null;
  state.confirmNextRoundOpen = false;
  state.confirmArchiveOpen = false;

  if (replace) {
    window.location.replace(`#${route}`);
  } else if (window.location.hash.replace("#", "") !== route) {
    window.location.hash = route;
  }

  render();
}

function getCurrentGame() {
  return state.data.currentGame;
}

function getRoundDraftKey(roundKey = state.draft.currentRoundKey) {
  return roundKey || "new";
}

function createBlankRoundDraft(game, roundKey = getRoundDraftKey()) {
  const players = getRoundPlayers(game, roundKey);
  const scoreInputMode = getCardInputMode(game, roundKey);
  const round = roundKey === "new" ? null : game?.rounds.find((entry) => entry.id === roundKey) || null;
  const storedSelections =
    round && round.cardSelections && typeof round.cardSelections === "object" ? round.cardSelections : {};
  return {
    roundNote: "",
    roundScores: Object.fromEntries(players.map((player) => [player.id, ""])),
    scoreInputMode,
    cardPickerPlayerId: scoreInputMode === SCORE_INPUT_MODES.cards ? players[0]?.id || null : null,
    roundCardSelections: Object.fromEntries(
      players.map((player) => [
        player.id,
        Array.isArray(storedSelections[player.id])
          ? storedSelections[player.id].map(normalizeCardToken).filter((token) => token !== null)
          : []
      ])
    )
  };
}

function createRoundDraftFromRound(game, round) {
  const draft = createBlankRoundDraft(game, round?.id || "new");

  if (!round) {
    return draft;
  }

  draft.roundNote = round.note;
  draft.scoreInputMode = normalizeScoreInputMode(round.scoreInputMode);
  draft.roundCardSelections = Object.fromEntries(
    getRoundPlayers(game, round.id).map((player) => [
      player.id,
      Array.isArray(round.cardSelections?.[player.id])
        ? round.cardSelections[player.id].map(normalizeCardToken).filter((token) => token !== null)
        : []
    ])
  );
  for (const score of round.scores) {
    draft.roundScores[score.playerId] = String(score.points);
  }

  return draft;
}

function normalizeRoundDraft(game, draft, roundKey = getRoundDraftKey()) {
  const players = getRoundPlayers(game, roundKey);
  const nextScores = {};
  const nextCardSelections = {};
  for (const player of players) {
    const currentValue = draft?.roundScores?.[player.id];
    nextScores[player.id] =
      currentValue === "" || currentValue === null || currentValue === undefined ? "" : String(currentValue);

    const currentSelection = Array.isArray(draft?.roundCardSelections?.[player.id])
      ? draft.roundCardSelections[player.id]
      : [];
    const normalizedSelection = currentSelection.map(normalizeCardToken).filter((token) => token !== null);
    nextCardSelections[player.id] = normalizedSelection;
  }

  const isLiveDraft = roundKey === "new" && isClassicCardModeGame(game);
  const currentMode =
    isClassicCardModeGame(game) && draft?.scoreInputMode === SCORE_INPUT_MODES.cards
      ? SCORE_INPUT_MODES.cards
      : isLiveDraft && draft?.scoreInputMode === SCORE_INPUT_MODES.cards
        ? SCORE_INPUT_MODES.cards
        : SCORE_INPUT_MODES.manual;
  const requestedPickerId = typeof draft?.cardPickerPlayerId === "string" ? draft.cardPickerPlayerId : null;
  const nextPickerId =
    currentMode === SCORE_INPUT_MODES.cards && players.some((player) => player.id === requestedPickerId)
      ? requestedPickerId
      : currentMode === SCORE_INPUT_MODES.cards
        ? players[0]?.id || null
        : null;

  return {
    roundNote: draft?.roundNote ? String(draft.roundNote) : "",
    roundScores: nextScores,
    scoreInputMode: currentMode,
    cardPickerPlayerId: nextPickerId,
    roundCardSelections: nextCardSelections
  };
}

function cacheRoundDraft(game, roundKey = state.draft.currentRoundKey) {
  const key = getRoundDraftKey(roundKey);
  const draft = normalizeRoundDraft(game, {
    roundNote: state.draft.roundNote,
    roundScores: state.draft.roundScores,
    scoreInputMode: state.draft.scoreInputMode,
    cardPickerPlayerId: state.draft.cardPickerPlayerId,
    roundCardSelections: state.draft.roundCardSelections
  }, key);
  state.draft.roundDrafts[key] = draft;
  return draft;
}

function resetLiveRoundDraft(game, { scoreInputMode } = {}) {
  if (!game) {
    return;
  }

  const blankDraft = createBlankRoundDraft(game, "new");
  if (scoreInputMode === SCORE_INPUT_MODES.cards && isClassicCardModeGame(game)) {
    blankDraft.scoreInputMode = SCORE_INPUT_MODES.cards;
    blankDraft.cardPickerPlayerId = blankDraft.cardPickerPlayerId || getRoundPlayers(game, "new")[0]?.id || null;
  }
  state.draft.liveRoundVersion += 1;
  state.draft.currentRoundKey = "new";
  state.draft.roundNote = blankDraft.roundNote;
  state.draft.roundScores = blankDraft.roundScores;
  state.draft.scoreInputMode = blankDraft.scoreInputMode;
  state.draft.cardPickerPlayerId = blankDraft.cardPickerPlayerId;
  state.draft.roundCardSelections = blankDraft.roundCardSelections;
  state.draft.roundDrafts.new = blankDraft;
}

function loadRoundDraft(game, roundKey = "new") {
  if (!game) {
    state.draft.currentRoundKey = "new";
    state.draft.roundNote = "";
    state.draft.roundScores = {};
    state.draft.scoreInputMode = SCORE_INPUT_MODES.manual;
    state.draft.cardPickerPlayerId = null;
    state.draft.roundCardSelections = {};
    state.draft.roundDrafts = {
      new: {
        roundNote: "",
        roundScores: {},
        scoreInputMode: SCORE_INPUT_MODES.manual,
        cardPickerPlayerId: null,
        roundCardSelections: {}
      }
    };
    return;
  }

  const key = getRoundDraftKey(roundKey);
  const round = key === "new" ? null : game.rounds.find((entry) => entry.id === key) || null;
  const draft =
    state.draft.roundDrafts[key] ||
    (round ? createRoundDraftFromRound(game, round) : createBlankRoundDraft(game, key));
  const normalized = normalizeRoundDraft(game, draft, key);

  state.draft.currentRoundKey = key;
  state.draft.roundNote = normalized.roundNote;
  state.draft.roundScores = normalized.roundScores;
  state.draft.scoreInputMode = normalized.scoreInputMode;
  state.draft.cardPickerPlayerId = normalized.cardPickerPlayerId;
  state.draft.roundCardSelections = normalized.roundCardSelections;
  state.draft.roundDrafts[key] = normalized;
}

function getSelectedRound(game) {
  if (!game) {
    return null;
  }

  const key = getRoundDraftKey();
  if (key === "new") {
    return null;
  }

  return game.rounds.find((round) => round.id === key) || null;
}

function getSelectedRoundIndex(game) {
  if (!game) {
    return -1;
  }

  const key = getRoundDraftKey();
  if (key === "new") {
    return game.rounds.length;
  }

  const index = game.rounds.findIndex((round) => round.id === key);
  return index >= 0 ? index : game.rounds.length;
}

function isRoundDraftLive() {
  return getRoundDraftKey() === "new";
}

function getRoundDraftPayload(game, { includeDefaultScoreInputMode = false } = {}) {
  const scores = getRoundPlayers(game).map((player) => ({
    playerId: player.id,
    points: Number(state.draft.roundScores[player.id] || 0)
  }));

  const payload = {
    note: state.draft.roundNote.trim(),
    scores,
    scoreInputMode: normalizeScoreInputMode(state.draft.scoreInputMode),
    cardSelections: state.draft.roundCardSelections
  };

  if (includeDefaultScoreInputMode && game?.gameMode === "classic") {
    payload.defaultScoreInputMode = normalizeScoreInputMode(state.draft.scoreInputMode);
  }

  return payload;
}

function isCurrentRoundFinished(game) {
  const selectedRound = getSelectedRound(game);
  return Boolean(selectedRound && game.invalidRoundIds?.includes(selectedRound.id));
}

function syncRoundDraftWithGame(game) {
  if (!game) {
    loadRoundDraft(null);
    return;
  }

  if (game.isFinished) {
    const key = getRoundDraftKey();
    const resolvedKey =
      key === "new" || !game.rounds.some((round) => round.id === key)
        ? game.winningRoundId || (game.rounds[0]?.id ?? "new")
        : key;
    loadRoundDraft(game, resolvedKey);
    return;
  }

  const key = getRoundDraftKey();
  if (key !== "new" && !game.rounds.some((round) => round.id === key)) {
    loadRoundDraft(game, "new");
    return;
  }

  loadRoundDraft(game, key);
}

function ensureRoundDraft(game) {
  syncRoundDraftWithGame(game);
}

function isRoundDraftEditable(game) {
  return Boolean(game && !game.isFinished && !isCurrentRoundFinished(game));
}

function clearFinishedRoundNoteAutosave() {
  if (state.draft.finishedRoundNoteSaveTimeoutId !== null) {
    window.clearTimeout(state.draft.finishedRoundNoteSaveTimeoutId);
    state.draft.finishedRoundNoteSaveTimeoutId = null;
  }
}

function isRoundDraftChanged(game) {
  if (!game) {
    return false;
  }

  const selectedRound = getSelectedRound(game);
  const currentNote = state.draft.roundNote.trim();
  const players = getRoundPlayers(game);
  const currentSelectionSignature = players
    .map((player) => `${player.id}:${(state.draft.roundCardSelections?.[player.id] || []).join(",")}`)
    .join("|");

  if (!selectedRound) {
    return (
      currentNote.length > 0 ||
      players.some((player) => state.draft.roundScores[player.id] !== "") ||
      players.some((player) => Array.isArray(state.draft.roundCardSelections?.[player.id]) && state.draft.roundCardSelections[player.id].length > 0)
    );
  }

  const baseline = new Map(selectedRound.scores.map((score) => [score.playerId, score.points]));
  if (selectedRound.note.trim() !== currentNote) {
    return true;
  }

  if (normalizeScoreInputMode(selectedRound.scoreInputMode) !== normalizeScoreInputMode(state.draft.scoreInputMode)) {
    return true;
  }

  const baselineSelectionSignature = players
    .map((player) => `${player.id}:${(selectedRound.cardSelections?.[player.id] || []).join(",")}`)
    .join("|");
  if (baselineSelectionSignature !== currentSelectionSignature) {
    return true;
  }

  return players.some((player) => {
    const currentValue = state.draft.roundScores[player.id];
    const normalizedCurrent =
      currentValue === "" || currentValue === null || currentValue === undefined ? 0 : Number(currentValue);
    return (baseline.get(player.id) ?? 0) !== normalizedCurrent;
  });
}

async function saveFinishedRoundNote() {
  const game = state.data.currentGame;
  if (!game || !game.isFinished) {
    return;
  }

  const selectedRound = getSelectedRound(game);
  if (!selectedRound || selectedRound.id !== game.winningRoundId) {
    return;
  }

  const note = state.draft.roundNote.trim();
  if (selectedRound.note.trim() === note) {
    return;
  }
  const payload = {
    note,
    scores: selectedRound.scores.map((score) => ({
      playerId: score.playerId,
      points: score.points
    }))
  };

  try {
    const response = await api(`/api/rounds/${encodeURIComponent(selectedRound.id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });

    if (response.game) {
      state.data.currentGame = response.game;
      ensureRoundDraft(state.data.currentGame);
      render();
    }
  } catch (error) {
    showToast(error.message, true);
  }
}

function queueFinishedRoundNoteSave() {
  clearFinishedRoundNoteAutosave();

  const game = state.data.currentGame;
  if (!game || !game.isFinished) {
    return;
  }

  state.draft.finishedRoundNoteSaveTimeoutId = window.setTimeout(() => {
    state.draft.finishedRoundNoteSaveTimeoutId = null;
    saveFinishedRoundNote();
  }, 450);
}

function jumpToRound(game, roundKey) {
  if (!game) {
    return;
  }

  cacheRoundDraft(game);
  loadRoundDraft(game, roundKey);
}

function getRoundNavigatorState(game) {
  const rounds = game?.rounds || [];
  const key = getRoundDraftKey();
  const selectedRound = key === "new" ? null : rounds.find((round) => round.id === key) || null;
  const selectedIndex = selectedRound ? rounds.findIndex((round) => round.id === key) : rounds.length;
  const isLive = selectedRound === null;
  const label = selectedRound
    ? t("current.roundCounter", { current: selectedIndex + 1, total: rounds.length })
    : t("current.roundNumber", { count: rounds.length + 1 });
  const status = game?.isFinished
    ? t("current.readOnlyRound")
    : selectedRound
      ? t("current.editingRound")
      : t("current.liveRoundStatus");
  const prevKey = selectedRound
    ? selectedIndex > 0
      ? rounds[selectedIndex - 1].id
      : null
    : rounds.length
      ? rounds[rounds.length - 1].id
      : null;
  const nextKey = selectedRound
    ? selectedIndex < rounds.length - 1
      ? rounds[selectedIndex + 1].id
      : game?.isFinished
        ? null
        : "new"
    : game?.isFinished
      ? null
      : "new";

  return {
    key,
    selectedRound,
    selectedIndex,
    isLive,
    label,
    status,
    prevKey,
    nextKey,
    canGoPrev: Boolean(prevKey),
    canGoNext: Boolean(nextKey) && (Boolean(selectedRound) || isRoundDraftChanged(game))
  };
}

async function commitRoundDraft(nextRoundKey = "new", { force = false } = {}) {
  const game = state.data.currentGame;
  if (!game || game.isFinished) {
    return;
  }

  const selectedRound = getSelectedRound(game);
  const nextLiveScoreInputMode = state.draft.scoreInputMode;
  const shouldPersistLiveInputMode = !selectedRound && game.gameMode === "classic";

  if (!force && !isRoundDraftChanged(game)) {
    if (nextRoundKey) {
      loadRoundDraft(game, nextRoundKey);
      render();
      if (isRoundDraftEditable(game)) {
        focusCurrentScoreInput();
      }
    }
    return;
  }

  const snapshot = snapshotAppState();
  const requestPayload = getRoundDraftPayload(game, {
    includeDefaultScoreInputMode: shouldPersistLiveInputMode
  });
  const optimisticRound = {
    id: selectedRound?.id || createUuid(),
    createdAt: selectedRound?.createdAt || now(),
    note: requestPayload.note,
    scores: requestPayload.scores
  };
  const optimisticGame = selectedRound
    ? {
        ...game,
        updatedAt: now(),
        completedAt: null,
        rounds: game.rounds.map((round) => (round.id === optimisticRound.id ? optimisticRound : round))
      }
    : {
        ...game,
        updatedAt: now(),
        completedAt: null,
        defaultScoreInputMode:
          shouldPersistLiveInputMode ? normalizeScoreInputMode(nextLiveScoreInputMode) : game.defaultScoreInputMode,
        rounds: [...game.rounds, optimisticRound]
      };
  const decoratedOptimistic = decorateGame(optimisticGame);
  const optimisticNextKey =
    nextRoundKey === "new" && decoratedOptimistic.isFinished
      ? decoratedOptimistic.winningRoundId || nextRoundKey
      : nextRoundKey;

  state.data.currentGame = decoratedOptimistic;
  if (nextRoundKey === "new" && !decoratedOptimistic.isFinished) {
    resetLiveRoundDraft(decoratedOptimistic, { scoreInputMode: nextLiveScoreInputMode });
  }
  loadRoundDraft(decoratedOptimistic, optimisticNextKey);
  state.route = "current-game";
  window.location.hash = "current-game";
  render();

  try {
    const payload = await api(selectedRound ? `/api/rounds/${encodeURIComponent(selectedRound.id)}` : "/api/rounds", {
      method: selectedRound ? "PATCH" : "POST",
      body: JSON.stringify(requestPayload)
    });

    if (payload.game) {
      state.data.currentGame = payload.game;
      const responseNextKey =
        nextRoundKey === "new" && payload.game.isFinished
          ? payload.game.winningRoundId || nextRoundKey
          : nextRoundKey;
      if (nextRoundKey === "new" && !payload.game.isFinished) {
        resetLiveRoundDraft(payload.game, { scoreInputMode: nextLiveScoreInputMode });
      }
      loadRoundDraft(payload.game, responseNextKey);
    }

    if (payload.game?.isFinished) {
      showCelebration(getWinnerPresentation(payload.game));
      showToast(t("toast.gameFinished"));
    } else {
      showToast(t("toast.roundSaved"));
    }

    render();

    if (isRoundDraftEditable(state.data.currentGame)) {
      focusCurrentScoreInput();
    }
  } catch (error) {
    restoreAppState(snapshot);
    hideCelebration();
    showToast(error.message, true);
    render();
  }
}

async function navigateToRound(roundKey) {
  const game = state.data.currentGame;
  if (!game || !roundKey || roundKey === getRoundDraftKey()) {
    return;
  }

  if (isRoundDraftEditable(game) && isRoundDraftChanged(game)) {
    await commitRoundDraft(roundKey);
    return;
  }

  if (roundKey === "new" && !game.isFinished) {
    resetLiveRoundDraft(game);
  }

  loadRoundDraft(game, roundKey);
  render();

  if (isRoundDraftEditable(state.data.currentGame)) {
    focusCurrentScoreInput();
  }
}

function syncRouteFromHash() {
  const nextRoute = getRouteFromHash();
  if (nextRoute === state.route) {
    return;
  }

  state.route = nextRoute;
  render();
}

async function refresh() {
  const payload = await api("/api/game", { method: "GET" });
  const previousGameId = state.data.currentGame?.id || null;

  state.data.currentGame = payload.game || null;
  state.data.history = payload.history || [];
  state.loading = false;
  state.systemError = null;

  if (state.data.currentGame?.id !== previousGameId) {
    if (state.data.currentGame && !state.data.currentGame.isFinished) {
      resetLiveRoundDraft(state.data.currentGame);
    } else {
      ensureRoundDraft(state.data.currentGame);
    }
  } else if (state.data.currentGame) {
    ensureRoundDraft(state.data.currentGame);
  }

  applyPreferences();
  render();
}

function openDrawer() {
  state.drawerOpen = true;
  render();
}

function closeDrawer() {
  state.drawerOpen = false;
  render();
}

function openMenu(gameId, anchor) {
  const rect = anchor.getBoundingClientRect();
  const width = 240;
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
  const top = Math.min(window.innerHeight - 16, rect.bottom + 8);

  state.menu = { gameId, left, top };
  render();
}

function closeMenu() {
  state.menu = null;
  render();
}

function openConfirmModal() {
  state.confirmNextRoundOpen = true;
  render();
}

function closeConfirmModal() {
  state.confirmNextRoundOpen = false;
  render();
}

function openArchiveConfirmModal() {
  state.confirmArchiveOpen = true;
  render();
}

function closeArchiveConfirmModal() {
  state.confirmArchiveOpen = false;
  render();
}

function findGameById(gameId) {
  if (state.data.currentGame?.id === gameId) {
    return state.data.currentGame;
  }

  return state.data.history.find((game) => game.id === gameId) || null;
}

function renderShellText() {
  document.title = t("app.title");
  const brand = document.querySelector(".brand-copy");
  if (brand) {
    const [primary, secondary] = brand.querySelectorAll("strong, span");
    if (primary) {
      primary.textContent = t("app.brandPrimary");
    }
    if (secondary) {
      secondary.textContent = t("app.brandSecondary");
    }
  }

  elements.menuButton.setAttribute("aria-label", t("nav.openMenu"));
  elements.roundConfirmTitle.textContent = t("current.confirmTitle");
  elements.roundConfirmMessage.textContent = t("current.askContinue");
  elements.roundConfirmContinue.textContent = t("current.continueNextRound");
  elements.roundConfirmCancel.textContent = t("common.cancel");
  elements.archiveConfirmTitle.textContent = t("archiveConfirm.title");
  elements.archiveConfirmMessage.textContent = t("archiveConfirm.message");
  elements.archiveConfirmContinue.textContent = t("archiveConfirm.confirm");
  elements.archiveConfirmCancel.textContent = t("common.cancel");

  const drawerLinks = elements.drawer.querySelectorAll("[data-route]");
  drawerLinks.forEach((button) => {
    const route = button.dataset.route;
    if (route === "new-game") button.textContent = t("nav.playNewGame");
    if (route === "existing-games") button.textContent = t("nav.browseGames");
    if (route === "current-game") button.textContent = t("nav.currentGame");
    if (route === "stats") button.textContent = t("nav.stats");
    if (route === "settings") button.textContent = t("nav.settings");
  });
}

function renderHomeScreen() {
  const currentGame = state.data.currentGame;
  const recentGames = [currentGame, ...state.data.history]
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const hiddenRecentGameIds = new Set(state.settings.hiddenRecentGameIds || []);
  const visibleRecentGames = recentGames.filter(
    (game) => !hiddenRecentGameIds.has(game.id) || Boolean(currentGame && currentGame.id === game.id)
  );

  const mobileRecentGames =
    visibleRecentGames.length === 0
      ? ""
      : `
        <section class="stack home-history-section">
          <p class="eyebrow">${escapeHtml(t("home.recentGames"))}</p>
          <div class="home-history-list">
            ${visibleRecentGames
              .map((game) => {
                const modeLabel = game.gameMode ? gameModeLabel(game.gameMode) : "";
                const canDelete = !(currentGame && currentGame.id === game.id);
                const playerCount = getActivePlayerCount(game);
                return `
                  <div
                    class="home-history-item-shell"
                    data-swipe-delete-card
                    data-swipe-mode="recent"
                    data-game-card="${escapeHtml(game.id)}"
                    data-home-current="${String(!canDelete)}"
                  >
                    <button
                      class="home-history-item"
                      type="button"
                      data-action="open-home-game"
                      data-game-id="${escapeHtml(game.id)}"
                      data-home-current="${String(!canDelete)}"
                    >
                      <div class="home-history-copy">
                        <strong class="home-history-title" title="${escapeHtml(game.title)}">${escapeHtml(game.title)}</strong>
                        <div class="home-history-meta">
                          <span>${escapeHtml(t("existing.playersLabel", { count: playerCount }))}</span>
                          ${modeLabel ? `<span>${escapeHtml(modeLabel)}</span>` : ""}
                        </div>
                      </div>
                      <span class="home-history-time">${escapeHtml(formatDateTime(game.updatedAt))}</span>
                    </button>
                    ${
                      canDelete
                        ? `<div class="home-history-actions" aria-hidden="true">
                          <button
                              class="home-history-delete"
                              type="button"
                              data-action="remove-home-game"
                              data-game-id="${escapeHtml(game.id)}"
                              aria-label="${escapeHtml(t("home.removeRecent"))}"
                            >
                              ${escapeHtml(t("home.removeRecent"))}
                            </button>
                          </div>`
                        : ""
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        </section>
      `;

  return `
    <section class="hero stack">
      <p class="eyebrow">${t("home.eyebrow")}</p>
      <h1 class="screen-title">${escapeHtml(t("home.title"))}</h1>
      <p class="screen-lead">${escapeHtml(t("home.lead"))}</p>
      <div class="hero-actions">
        <button class="primary-action" type="button" data-action="go-new-game">${escapeHtml(
          t("home.startFresh")
        )}</button>
      </div>
      <p class="home-credits plain-copy">
        Vibbed in Sibbarp by
        <a href="https://github.com/martin-kristensen" target="_blank" rel="noreferrer">Disco</a>,
        <a href="https://github.com/Klangen82" target="_blank" rel="noreferrer">Klangen82</a>
        and Codex. Independent fan-made scoreboard for Flip 7. Not affiliated with the creators of Flip 7.
      </p>
    </section>
    ${mobileRecentGames}
      ${
        currentGame
          ? `
      <section class="stack home-current-game">
        <p class="eyebrow">${escapeHtml(t("home.activeGameLabel"))}</p>
        <div class="game-card game-card-active">
          <div class="game-card-header">
            <div class="game-card-title">
              <strong title="${escapeHtml(currentGame.title)}">${escapeHtml(currentGame.title)}</strong>
              <span class="game-card-meta">
                <span class="pill">${escapeHtml(gameModeLabel(currentGame.gameMode))}</span>
                <span>${escapeHtml(t("existing.playersLabel", { count: getActivePlayerCount(currentGame) }))}</span>
                <span>${escapeHtml(t("existing.roundsLabel", { count: currentGame.rounds.length }))}</span>
              </span>
            </div>
            <span class="pill ${currentGame.isFinished ? "pill-success" : ""}">${escapeHtml(
              currentGame.isFinished ? t("statuses.finished") : t("statuses.inProgress")
            )}</span>
          </div>
          <div class="game-card-meta">
            <span>${escapeHtml(t("current.winningScore"))}: ${formatNumber(currentGame.winningScore)}</span>
            <span>${escapeHtml(t("existing.lastPlayed"))}: ${escapeHtml(formatDateTime(currentGame.updatedAt))}</span>
          </div>
          <div class="game-card-actions">
            <button class="primary-action" type="button" data-action="go-current-game">${escapeHtml(
              t("home.continueCurrent")
            )}</button>
          </div>
        </div>
      </section>
      `
        : `
    `
    }
  `;
}

function renderNewGameScreen() {
  const draft = state.draft.newGame;
  const currentGame = state.data.currentGame;

  return `
    <section class="stack new-game-view">
      <div class="stack-tight">
        <p class="eyebrow">${escapeHtml(t("newGame.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(t("newGame.title"))}</h1>
        <p class="screen-lead">${escapeHtml(t("newGame.lead"))}</p>
      </div>
      ${
        currentGame
          ? `<div class="helper">${escapeHtml(
              `${currentGame.title} ${currentGame.isFinished ? `(${t("statuses.finished")})` : ""}`
            )}</div>`
          : ""
      }
      <form id="new-game-form" class="stack">
        <div class="field">
          <span class="field-label">${escapeHtml(t("newGame.playersLabel"))}</span>
          <div class="inline-row">
            <input
              id="new-player-input"
              type="text"
              inputmode="text"
              autocomplete="off"
              enterkeyhint="next"
              placeholder="${escapeHtml(t("newGame.playerPlaceholder"))}"
              value="${escapeHtml(draft.playerInput)}"
            />
            <button class="secondary-action" type="button" data-action="add-player">${escapeHtml(
              t("common.add")
            )}</button>
          </div>
          <div class="helper">${escapeHtml(t("newGame.playerHelp"))}</div>
        </div>
        <div class="stack-tight">
          <strong>${escapeHtml(t("newGame.addedPlayers"))}</strong>
          ${
            draft.players.length
              ? `<div class="chip-list">
                ${draft.players
                  .map(
                    (player, index) => `
                      <div class="player-chip">
                        <span class="player-chip-name">${escapeHtml(player)}</span>
                        <button class="chip-remove" type="button" data-action="remove-player" data-player-index="${index}" aria-label="${escapeHtml(
                          `${t("common.delete")} ${player}`
                        )}">×</button>
                      </div>
                    `
                  )
                  .join("")}
            </div>`
              : `<p class="helper plain-copy">${escapeHtml(t("newGame.noPlayersYet"))}</p>`
          }
        </div>
        <label class="field">
          <span class="field-label">${escapeHtml(t("newGame.titleLabel"))}</span>
          <input
            id="new-game-title"
            name="title"
            type="text"
            inputmode="text"
            enterkeyhint="next"
            placeholder="${escapeHtml(t("newGame.titlePlaceholder"))}"
            value="${escapeHtml(draft.title)}"
          />
        </label>
        <div class="field">
          <span class="field-label">${escapeHtml(t("newGame.modeLabel"))}</span>
          <select id="new-game-mode" name="gameMode">
            ${["classic", "vengeance", "mixed"]
              .map(
                (mode) => `
                  <option value="${escapeHtml(mode)}"${draft.gameMode === mode ? " selected" : ""}>
                    ${escapeHtml(gameModeLabel(mode))}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
        <div class="field">
          <span class="field-label">${escapeHtml(t("current.scoreInputMode"))}</span>
          ${
            draft.gameMode === "classic"
              ? `
                ${renderInputModeToggle({
                  value: draft.scoreInputMode,
                  action: "set-new-game-input-mode",
                  allowCards: true,
                  ariaLabel: t("current.scoreInputMode")
                })}
                <div class="helper">${escapeHtml(t("newGame.inputModeHelp"))}</div>
              `
              : ""
          }
        </div>
        <label class="field">
          <span class="field-label">${escapeHtml(t("newGame.winningScoreLabel"))}</span>
          <input
            id="new-game-winning-score"
            name="winningScore"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            enterkeyhint="next"
            value="${escapeHtml(String(draft.winningScore))}"
          />
        </label>
        <button class="primary-action" type="submit" ${draft.players.length < 2 ? "disabled" : ""}>${escapeHtml(
          t("newGame.startGame")
        )}</button>
      </form>
    </section>
  `;
}

function renderGameCard(game, { current = false } = {}) {
  const isFinished = Boolean(game.completedAt || getWinner(game));
  const status = current
    ? game.isFinished
      ? t("statuses.finished")
      : t("statuses.inProgress")
    : isFinished
      ? t("statuses.finished")
      : t("statuses.archived");
  const scoreSummary = summarizeGame(game);
  const leader = scoreSummary[0];
  const winnerPresentation = isFinished ? getWinnerPresentation(game) : null;
  const winner = winnerPresentation?.winners[0] || getWinner(game);
  const headline = isFinished && winner ? winner : leader;
  const headlineLabel = isFinished ? winnerPresentation?.label || t("stats.winner") : t("stats.leader");
  const headlineName = winnerPresentation?.nameText || headline?.name || "";
  const headlineTotal = winnerPresentation?.total ?? headline?.total ?? 0;
  const statusPillClass = isFinished ? "pill-success" : current ? "" : "pill-muted";
  const menuAction = current ? "archive" : "delete";
  const menuLabel = current ? t("existing.archiveCard") : t("existing.deleteCard");
  const cardAction = current ? "go-current-game" : "resume-game";
  const playerCount = getActivePlayerCount(game);

  if (!current) {
    return `
      <div
        class="home-history-item-shell game-list-item-shell"
        data-swipe-delete-card
        data-swipe-mode="stash"
        data-game-card="${escapeHtml(game.id)}"
      >
        <button
          class="home-history-item game-list-item"
          type="button"
          data-action="${cardAction}"
          data-game-id="${escapeHtml(game.id)}"
        >
          <div class="home-history-copy game-list-copy">
            <strong class="home-history-title" title="${escapeHtml(game.title)}">${escapeHtml(game.title)}</strong>
            <div class="home-history-meta">
              <span class="pill">${escapeHtml(gameModeLabel(game.gameMode))}</span>
              <span>${escapeHtml(t("existing.playersLabel", { count: playerCount }))}</span>
              <span>${escapeHtml(t("existing.roundsLabel", { count: game.rounds.length }))}</span>
            </div>
            <div class="home-history-meta game-list-submeta">
              <span>${escapeHtml(t("existing.lastPlayed"))}: ${escapeHtml(formatDateTime(game.updatedAt))}</span>
              <span>${escapeHtml(t("current.winningScore"))}: ${formatNumber(game.winningScore)}</span>
            </div>
            <div class="home-history-meta game-list-submeta">
              <span class="pill ${statusPillClass}">${escapeHtml(status)}</span>
              ${
                headline
                  ? `<span class="game-card-leader" title="${escapeHtml(`${headlineLabel}: ${headlineName}`)}">${escapeHtml(
                      headlineLabel
                    )}: ${escapeHtml(headlineName)} ${formatNumber(headlineTotal)} ${escapeHtml(t("common.points"))}</span>`
                  : ""
              }
            </div>
          </div>
          <span class="home-history-time">${escapeHtml(formatDateTime(game.updatedAt))}</span>
        </button>
        <div class="home-history-actions" aria-hidden="true">
          <button
            class="home-history-delete"
            type="button"
            data-action="delete-game"
            data-game-id="${escapeHtml(game.id)}"
            aria-label="${escapeHtml(t("common.delete"))}"
          >
            ${escapeHtml(t("common.delete"))}
          </button>
        </div>
      </div>
    `;
  }

  return `
    <article class="game-card ${current ? "game-card-active" : ""}" data-game-card="${escapeHtml(game.id)}">
      <div class="game-card-header">
          <div class="game-card-title">
            <strong>${escapeHtml(game.title)}</strong>
            <div class="game-card-meta">
              <span class="pill">${escapeHtml(gameModeLabel(game.gameMode))}</span>
              <span>${escapeHtml(t("existing.playersLabel", { count: playerCount }))}</span>
              <span>${escapeHtml(t("existing.roundsLabel", { count: game.rounds.length }))}</span>
            </div>
          </div>
        <button
          class="menu-trigger"
          type="button"
          data-action="open-game-menu"
          data-game-id="${escapeHtml(game.id)}"
          aria-label="${escapeHtml(t("nav.openMenu"))}"
        >⋯</button>
      </div>
      <div class="game-card-meta">
        <span>${escapeHtml(t("existing.lastPlayed"))}: ${escapeHtml(formatDateTime(game.updatedAt))}</span>
        <span>${escapeHtml(t("current.winningScore"))}: ${formatNumber(game.winningScore)}</span>
      </div>
      <div class="game-card-meta">
        <span class="pill ${statusPillClass}">${escapeHtml(status)}</span>
        ${
          headline
            ? `<span>${escapeHtml(headlineLabel)}: ${escapeHtml(headlineName)} ${formatNumber(headlineTotal)} ${escapeHtml(
                t("common.points")
              )}</span>`
            : ""
        }
      </div>
      <div class="game-card-actions">
        <button class="primary-action" type="button" data-action="${cardAction}" data-game-id="${escapeHtml(
          game.id
        )}">${escapeHtml(current ? t("existing.continueCard") : t("existing.resumeCard"))}</button>
      </div>
      <input type="hidden" value="${escapeHtml(menuAction)}" data-menu-action="${escapeHtml(game.id)}" />
      <button class="hidden" type="button" data-menu-label="${escapeHtml(game.id)}">${escapeHtml(menuLabel)}</button>
    </article>
  `;
}

function openGameFromList(gameId) {
  if (state.data.currentGame?.id === gameId) {
    setRoute("current-game");
    return;
  }

  return resumeGame(gameId);
}

function renderExistingGamesScreen() {
  const currentGame = state.data.currentGame;
  const archivedGames = state.data.history;

  return `
    <section class="stack existing-view">
      <div class="stack-tight">
        <p class="eyebrow">${escapeHtml(t("existing.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(t("existing.title"))}</h1>
        <p class="screen-lead">${escapeHtml(t("existing.lead"))}</p>
      </div>
      ${
        currentGame
          ? `
            <div class="stack-tight">
              <strong>${escapeHtml(t("existing.currentSection"))}</strong>
              <div class="game-list">${renderGameCard(currentGame, { current: true })}</div>
            </div>
          `
          : ""
      }
      <div class="stack-tight">
        <strong>${escapeHtml(t("existing.savedSection"))}</strong>
        ${
          archivedGames.length
            ? `<div class="game-list">${archivedGames.map((game) => renderGameCard(game)).join("")}</div>`
            : `<div class="empty-state">${escapeHtml(t("existing.noGames"))}</div>`
        }
      </div>
    </section>
  `;
}

function getCardTokenLabel(token) {
  if (token.startsWith("number:")) {
    return token.slice("number:".length);
  }

  if (token.startsWith("modifier:")) {
    return token.slice("modifier:".length);
  }

  return token;
}

function renderScanTokenList(tokens) {
  if (!tokens?.length) {
    return `<span class="muted">${escapeHtml(t("current.scanRound.noCards"))}</span>`;
  }

  return tokens
    .map((token) => `<span class="scan-token">${escapeHtml(getCardTokenLabel(token))}</span>`)
    .join("");
}

function setScanUiActive(isActive) {
  if (isActive) {
    document.body.setAttribute("data-scan-ui-active", "true");
  } else {
    document.body.removeAttribute("data-scan-ui-active");
  }
}

function setScanCaptureUiActive(isActive) {
  if (isActive) {
    document.body.setAttribute("data-scan-capture-active", "true");
  } else {
    document.body.removeAttribute("data-scan-capture-active");
  }
}

function renderScanRoundScreen(game) {
  const scanRound = state.draft.scanRound;
  const players = getScanRoundPlayers(game);
  if (!scanRound || !players.length) {
    setScanCaptureUiActive(false);
    return "";
  }

  const currentPlayer = getCurrentScanPlayer(game);
  const currentEntry = currentPlayer ? getScanEntry(currentPlayer.id) : null;
  const pendingCount = getScanRoundPendingCount();
  const canConfirm = isScanRoundReadyToConfirm();
  setScanUiActive(scanRound.active);
  setScanCaptureUiActive(false);

  const summaryView = () => `
    <section class="scan-round-view scan-round-summary">
      <div class="scan-summary-list">
        ${
          players
            .map((player) => {
              const entry = getScanEntry(player.id) || createScanPlayerDraft(player);
              const scoreValue = entry.score === null || entry.score === undefined ? "" : String(entry.score);
              const menuOpen = state.draft.scanRound?.summaryMenuPlayerId === player.id;
              const manualCardsOpen = state.draft.scanRound?.manualCardsPlayerId === player.id;
              const statusClass = `scan-summary-status--${entry.status}`;
              const denseTokens = (entry.tokens || []).length > 6;
              const hasRowActions = ["ready", "failed", "manual", "skipped"].includes(entry.status);
              const showCaptureButton = ["idle", "failed", "skipped"].includes(entry.status);
              return `
                <article class="scan-summary-row ${denseTokens ? "is-dense" : ""} ${menuOpen ? "is-menu-open" : ""} ${manualCardsOpen ? "is-manual-cards-open" : ""} ${showCaptureButton ? "is-waiting" : "is-captured"} ${hasRowActions ? "has-actions" : ""}" data-player-id="${escapeHtml(
                  player.id
                )}">
                  <div class="scan-summary-main">
                    <div class="scan-summary-head">
                      <div class="scan-summary-headline">
                        <strong title="${escapeHtml(player.name)}">${escapeHtml(player.name)}</strong>
                        <span class="scan-summary-status ${statusClass}">
                          ${escapeHtml(getScanStatusLabel(entry.status))}
                        </span>
                      </div>
                      ${
                        hasRowActions
                          ? `
                            <button
                              class="secondary-action scan-summary-edit-trigger"
                              type="button"
                              data-action="scan-summary-toggle-menu"
                              data-player-id="${escapeHtml(player.id)}"
                              aria-label="${escapeHtml(t("current.scanRound.rowActions"))}"
                              aria-haspopup="menu"
                              aria-expanded="${menuOpen ? "true" : "false"}"
                            >
                              Edit
                            </button>
                            <div class="scan-summary-actions ${menuOpen ? "is-open" : ""}" role="menu" aria-hidden="${menuOpen ? "false" : "true"}">
                              <button class="menu-action" type="button" data-action="scan-summary-rescan" data-player-id="${escapeHtml(player.id)}">
                                ${escapeHtml(t("current.scanRound.rescan"))}
                              </button>
                              <button class="menu-action" type="button" data-action="scan-summary-retake" data-player-id="${escapeHtml(player.id)}">
                                ${escapeHtml(t("current.scanRound.retakePhoto"))}
                              </button>
                              <button class="menu-action" type="button" data-action="scan-summary-manual-cards" data-player-id="${escapeHtml(player.id)}">
                                ${escapeHtml(t("current.scanRound.manualAddCards"))}
                              </button>
                            </div>
                          `
                          : ""
                      }
                    </div>
                    <div class="scan-summary-cards ${denseTokens ? "is-dense" : ""}" aria-label="${escapeHtml(t("current.scanRound.detectedCards"))}">
                      ${renderScanTokenList(entry.tokens)}
                    </div>
                  </div>
                  ${
                    showCaptureButton
                      ? `
                        <div class="scan-summary-capture-col">
                          <button class="secondary-action scan-summary-capture-action" type="button" data-action="scan-summary-capture" data-player-id="${escapeHtml(player.id)}">
                            ${escapeHtml(t("current.scanRound.capture"))}
                          </button>
                        </div>
                      `
                      : ""
                  }
                    <div class="scan-summary-score">
                      <label class="field scan-summary-score-field">
                        <input
                          type="text"
                          inputmode="numeric"
                          pattern="[0-9]*"
                          placeholder="${escapeHtml(t("current.scanRound.scoreLabel"))}"
                          autocomplete="off"
                          data-scan-score-player-id="${escapeHtml(player.id)}"
                          value="${escapeHtml(scoreValue)}"
                          ${["uploading", "processing"].includes(entry.status) ? "disabled" : ""}
                        />
                      </label>
                    </div>
                </article>
                ${manualCardsOpen ? renderScanManualCardPanel(player, entry) : ""}
              `;
            })
            .join("") || `<p class="empty-state">${escapeHtml(t("current.scanRound.summaryEmpty"))}</p>`
        }
      </div>

      <div class="sticky-actions scan-summary-sticky">
        <button class="secondary-action" type="button" data-action="cancel-scan-round">
          ${escapeHtml(t("current.scanRound.cancel"))}
        </button>
        <button class="primary-action" type="button" data-action="scan-confirm-round" ${canConfirm ? "" : "disabled"}>
          ${escapeHtml(t("current.scanRound.confirm"))}
        </button>
      </div>
    </section>
  `;

  return summaryView();
}

function renderCurrentGameScreen() {
  const screen = elements.screens.currentGame;
  const game = state.data.currentGame;
  if (!screen) {
    return;
  }

  if (!game) {
    clearFinishedRoundNoteAutosave();
    screen.removeAttribute("data-current-game-id");
    screen.removeAttribute("data-current-game-editor-key");
    screen.removeAttribute("data-current-game-details-key");
    screen.innerHTML = `
      <section class="stack current-game-view">
        <p class="eyebrow">${escapeHtml(t("current.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(t("current.title"))}</h1>
        <p class="helper plain-copy">${escapeHtml(t("current.noGame"))}</p>
        <div class="hero-actions">
          <button class="primary-action" type="button" data-action="go-new-game">${escapeHtml(t("current.newGame"))}</button>
        </div>
      </section>
    `;
    return;
  }

  ensureRoundDraft(game);
  if (isScanRoundActiveForGame(game)) {
    screen.removeAttribute("data-current-game-editor-key");
    screen.removeAttribute("data-current-game-details-key");
    screen.dataset.currentGameId = game.id;
    screen.innerHTML = renderScanRoundScreen(game);
    return;
  }

  if (state.draft.scanRound?.active) {
    cancelScanRound({ silent: true });
  }

  const progress = getGameProgress(game);
  const winnerPresentation = getWinnerPresentation(game);
  const winner = winnerPresentation.winners[0] || null;
  const suddenDeathActive = Boolean(game.suddenDeathStartedAtRoundId && !winner);
  const finishedSuddenDeath = Boolean(game.isFinished && game.suddenDeathStartedAtRoundId);
  const roundNavigator = getRoundNavigatorState(game);
  const activePlayers = getActiveGamePlayers(game);
  const inactivePlayers = game.players.filter((player) => !player.isActive);
  const orderedPlayers = getCurrentGamePlayers(game);
  const scoreRowPlayers = suddenDeathActive
    ? [...orderedPlayers, ...inactivePlayers]
    : finishedSuddenDeath
      ? game.players
      : orderedPlayers;
  const canEditScores = isRoundDraftEditable(game);
  const canEditNote = Boolean(canEditScores || game.isFinished);
  const canManagePlayers = Boolean(roundNavigator.isLive && !game.isFinished);
  const activePlayerCount = activePlayers.length;
  const headerPlayerCount = finishedSuddenDeath ? game.players.length : activePlayerCount;
  const currentRoundKey = getRoundDraftKey();
  const invalidRoundIds = new Set(progress.invalidRoundIds);
  const selectedRound = getSelectedRound(game);
  const draftForSelectedRound =
    state.draft.roundDrafts[currentRoundKey] || createRoundDraftFromRound(game, selectedRound);
  const scoreInputMode = draftForSelectedRound.scoreInputMode || SCORE_INPUT_MODES.manual;
  const cardModeAvailable = Boolean(canEditScores && isClassicCardModeGame(game));
  const cardModeEnabled = Boolean(cardModeAvailable && scoreInputMode === SCORE_INPUT_MODES.cards);
  const showLiveScorePreview = currentRoundKey === "new" && canEditScores;
  const currentCardPickerPlayerId = draftForSelectedRound.cardPickerPlayerId || null;
  const cardPickerNavigator = getCardPickerNavigatorState(game);
  const liveScorePreviewState = showLiveScorePreview
    ? getCurrentGameLiveScorePreview(game, draftForSelectedRound.roundScores)
    : null;
  const roundNoteLabel = game.isFinished ? t("current.finalNote") : t("current.roundNote");
  const cardSelectionSignature = Object.entries(draftForSelectedRound.roundCardSelections || {})
    .map(([playerId, selection]) => `${playerId}:${Array.isArray(selection) ? selection.join(",") : ""}`)
    .join("|");
  const scoresSignature = orderedPlayers
    .map((player) => `${player.id}:${draftForSelectedRound.roundScores[player.id] ?? ""}`)
    .join("|");
  const editorKey = [
    game.id,
    currentRoundKey,
    currentRoundKey === "new" ? `live:${state.draft.liveRoundVersion}` : "saved",
    state.draft.currentGameOrder,
    scoreInputMode,
    currentCardPickerPlayerId || "none",
    canEditScores ? "edit" : "locked",
    game.players.map((player) => `${player.id}:${player.name}`).join("|")
  ].join("::");
  const detailsKey = [
    game.id,
    currentRoundKey,
    roundNoteLabel,
    draftForSelectedRound.roundNote,
    canEditNote ? "note-editable" : "note-locked",
    scoreInputMode,
    currentCardPickerPlayerId || "none",
    game.isFinished ? `winner:${winner?.roundId || "none"}` : "live",
    suddenDeathActive ? "sudden-death" : "normal",
    progress.invalidRoundIds.join(","),
    progress.winningRoundId || "none",
    progress.winningRoundNumber || 0,
    game.rounds.length,
    game.updatedAt,
    state.draft.currentGameRenamingPlayerId || "none",
    canManagePlayers ? "roster-live" : "roster-locked",
    scoreInputMode,
    currentCardPickerPlayerId || "none",
    game.players.map((player) => `${player.id}:${player.isActive ? "1" : "0"}:${player.name}`).join("|")
  ].join("::");
  const headerKey = [
    game.id,
    game.title,
    game.winningScore,
    headerPlayerCount,
    roundNavigator.label,
    roundNavigator.status,
    winnerPresentation.nameText || "",
    currentRoundKey
  ].join("::");
  const warningKey = `${game.id}:${progress.invalidRoundIds.join(",")}:${progress.winningRoundNumber || 0}`;
  const secondaryKey = `${game.id}:${game.isFinished ? "finished" : "live"}`;
  const currentDetailsOpen = Boolean(screen.querySelector(".current-details")?.open);

  const renderRoundHistory = () => {
    const roundHistory = game.rounds
      .map((round, index) => {
        const isSelected = currentRoundKey === round.id;
        const isInvalid = invalidRoundIds.has(round.id);
        const isWinningRound = progress.winningRoundId === round.id;
        const roundTotal = round.scores.reduce((sum, score) => sum + score.points, 0);
        const note = round.note.trim() ? round.note.trim() : t("current.noNote");
        const status = isWinningRound
          ? game.suddenDeathStartedAtRoundId
            ? `${t("current.winningRound")} • ${t("current.suddenDeath")}`
            : t("current.winningRound")
          : isInvalid
            ? t("current.invalidRound")
            : isSelected
              ? t("current.editingRound")
              : "";

        return `
          <button
            class="round-history-item ${isSelected ? "is-selected" : ""} ${isInvalid ? "is-invalid" : ""}"
            type="button"
            data-action="select-round"
            data-round-key="${escapeHtml(round.id)}"
          >
            <div class="round-history-main">
              <strong>${escapeHtml(t("current.roundCounter", { current: index + 1, total: game.rounds.length }))}</strong>
              <span>${escapeHtml(note)}</span>
            </div>
            <div class="round-history-meta">
              <span>${formatNumber(roundTotal)} ${escapeHtml(t("common.points"))}</span>
              ${
                status
                  ? `<span class="pill ${isInvalid ? "pill-muted" : "pill-success"}">${escapeHtml(status)}</span>`
                  : ""
              }
            </div>
          </button>
        `;
      })
      .join("");

    const liveRoundItem = game.isFinished
      ? ""
      : `
        <button
          class="round-history-item ${roundNavigator.isLive ? "is-selected" : ""}"
          type="button"
          data-action="select-round"
          data-round-key="new"
        >
          <div class="round-history-main">
            <strong>${escapeHtml(t("current.roundNumber", { count: game.rounds.length + 1 }))}</strong>
            <span>${escapeHtml(t("current.liveRoundStatus"))}</span>
          </div>
          <div class="round-history-meta">
            <span>${escapeHtml(t("current.roundScores"))}</span>
          </div>
        </button>
      `;

    return `
      <div class="stack-tight">
        <strong>${escapeHtml(t("current.roundHistory"))}</strong>
        <div class="round-history-list">
          ${roundHistory}
          ${liveRoundItem}
        </div>
      </div>
    `;
  };

  const currentShellHtml = `
    <section class="stack current-game-view" data-current-game-shell>
      <div data-current-game-slot="header"></div>
      <div data-current-game-slot="warning"></div>
      <div data-current-game-slot="editor"></div>
      <div data-current-game-slot="details"></div>
      <div data-current-game-slot="secondary"></div>
    </section>
  `;

  const headerHtml = () => `
    <div class="stack-tight current-game-header">
      <p class="eyebrow">${escapeHtml(t("current.eyebrow"))}</p>
      <h1 class="screen-title">${escapeHtml(game.title)}</h1>
      ${
        suddenDeathActive
          ? `<div class="state-banner state-banner-warning"><strong>${escapeHtml(
              t("current.suddenDeathInProgress")
            )}</strong></div>`
          : ""
      }
      <div class="current-meta-line">
        <span>${escapeHtml(t("current.winningScore"))} ${formatNumber(game.winningScore)}</span>
        <span>${escapeHtml(
          `${headerPlayerCount} ${pluralLabel(headerPlayerCount, t("common.player"), t("common.players"))}`
        )}</span>
      </div>
      ${
        winner
          ? `<div class="current-winner-line"><span>${escapeHtml(winnerPresentation.label)}:</span><strong title="${escapeHtml(
              winnerPresentation.nameText
            )}">${escapeHtml(winnerPresentation.nameText)}</strong></div>`
          : ""
      }
      <div class="current-round-nav" role="group" aria-label="${escapeHtml(t("current.roundNavigation"))}">
        <button
          class="round-nav-button"
          type="button"
          data-action="move-round"
          data-direction="prev"
          ${roundNavigator.canGoPrev ? "" : "disabled"}
          aria-label="${escapeHtml(t("current.previousRound"))}"
        >
          ←
        </button>
        <div class="current-round-nav-copy">
          <strong>${escapeHtml(roundNavigator.label)}</strong>
          <span>${escapeHtml(roundNavigator.status)}</span>
        </div>
        <button
          class="round-nav-button"
          type="button"
          data-action="move-round"
          data-direction="next"
          ${roundNavigator.canGoNext ? "" : "disabled"}
          aria-label="${escapeHtml(t("current.nextRound"))}"
        >
          →
        </button>
      </div>
    </div>
  `;

  const roundWarningHtml = () =>
    progress.invalidRoundIds.length
    ? `
      <div class="state-banner state-banner-warning">
        <strong>${escapeHtml(t("current.shouldHaveEndedAtRound", { count: progress.winningRoundNumber || 0 }))}</strong>
        <span class="muted">${escapeHtml(t("current.invalidRoundsNote"))}</span>
      </div>
    `
    : "";

  const editorHtml = () => `
    <form id="current-game-form" class="stack current-score-form">
      <div class="stack-tight">
        <div class="current-score-header">
          <strong>${escapeHtml(t("current.roundScores"))}</strong>
          <div class="current-order-toggle" role="group" aria-label="${escapeHtml(t("current.orderBy"))}">
            <button
              class="${state.draft.currentGameOrder === "entered" ? "primary-action" : "secondary-action"}"
              type="button"
              data-action="set-current-order"
              data-order="entered"
              ${canEditScores ? "" : "disabled"}
            >
              ${escapeHtml(t("current.enteredOrder"))}
            </button>
            <button
              class="${state.draft.currentGameOrder === "leader" ? "primary-action" : "secondary-action"}"
              type="button"
              data-action="set-current-order"
              data-order="leader"
              ${canEditScores ? "" : "disabled"}
            >
              ${escapeHtml(t("current.leaderFirst"))}
            </button>
          </div>
          ${
            canEditScores && roundNavigator.isLive && isClassicCardModeGame(game)
              ? `<button class="secondary-action current-scan-entry" type="button" data-action="start-scan-round">${escapeHtml(
                  t("current.scanRound.action")
                )}</button>`
              : ""
          }
        </div>
      <div class="score-list">
          ${scoreRowPlayers
            .map((player, index) => {
              const total = progress.scoreboard.find((entry) => entry.playerId === player.id)?.total ?? 0;
              const isEliminated = suddenDeathActive && !player.isActive;
              const roundDraftValue = Number(draftForSelectedRound.roundScores[player.id] || 0);
              const value = isEliminated ? "" : draftForSelectedRound.roundScores[player.id] ?? "";
              const livePreview = liveScorePreviewState?.previews.get(player.id) || null;
              const playerCardSelections = draftForSelectedRound.roundCardSelections?.[player.id] || [];
              const scoreInputDisabled = !canEditScores || (scoreInputMode === SCORE_INPUT_MODES.cards && playerCardSelections.length > 0);
              const displayedTotal = livePreview?.hasValue
                ? livePreview.projectedTotal
                : currentRoundKey === "new"
                  ? total + roundDraftValue
                  : total;
              return `
                <div
                  class="score-row ${showLiveScorePreview ? "has-live-score-preview" : ""} ${isEliminated ? "is-eliminated" : ""}"
                  data-player-id="${escapeHtml(player.id)}"
                >
                  <label class="field">
                    <span class="player-name" title="${escapeHtml(player.name)}">${escapeHtml(player.name)}</span>
                    <span class="muted" data-live-score-total>${escapeHtml(
                      getCurrentGameTotalLine(displayedTotal, game.winningScore)
                    )}</span>
                  </label>
                  ${
                    showLiveScorePreview && !isEliminated
                      ? `
                        <div class="score-preview" data-score-preview>
                          <span class="score-preview-total" data-live-score-preview-total>${
                            livePreview?.hasValue
                              ? escapeHtml(
                                  t("current.liveScorePreview", {
                                    committed: formatNumber(livePreview.committedTotal),
                                    entered: formatNumber(livePreview.enteredPoints),
                                    projected: formatNumber(livePreview.projectedTotal)
                                  })
                                )
                              : ""
                          }</span>
                          <span class="score-preview-gap" data-live-score-preview-gap>${
                            livePreview
                              ? escapeHtml(
                                  getCurrentGamePreviewLabel(
                                    livePreview.projectedTotal,
                                    liveScorePreviewState.leaderTotal,
                                    liveScorePreviewState.leaderCount
                                  )
                                )
                              : ""
                          }</span>
                        </div>
                      `
                      : ""
                  }
                  ${
                    isEliminated
                      ? `<span class="score-row-status muted">${escapeHtml(t("current.inactive"))}</span>`
                      : `
                        <input
                          type="text"
                          step="1"
                          inputmode="numeric"
                          enterkeyhint="next"
                          pattern="[0-9]*"
                          autocomplete="off"
                          data-player-id="${escapeHtml(player.id)}"
                          data-player-index="${index}"
                          value="${escapeHtml(value)}"
                          ${scoreInputDisabled ? "disabled" : ""}
                        />
                      `
                  }
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
      ${
        cardModeEnabled
          ? renderCardPickerPanel(game)
          : ""
      }
      <div class="sticky-actions">
        ${
          winner
            ? `<button class="primary-action" type="button" data-action="play-again">${escapeHtml(
                t("current.playAgain")
              )}</button>`
            : `<button class="primary-action" type="submit">${escapeHtml(
                roundNavigator.isLive ? t("current.saveRound") : t("current.backToLive")
              )}</button>`
        }
      </div>
    </form>
  `;

  const noteHtml = () => `
    <label class="field current-details-note">
      <span class="field-label">${escapeHtml(roundNoteLabel)}</span>
      <textarea
        id="round-note"
        class="round-note"
        placeholder="${escapeHtml(roundNoteLabel)}"
        ${canEditNote ? "" : "disabled"}
      >${escapeHtml(draftForSelectedRound.roundNote)}</textarea>
    </label>
  `;

  const roundInputSettingsHtml = () =>
    cardModeAvailable
      ? `
        <div class="stack-tight current-details-settings">
          <strong>${escapeHtml(t("current.scoreInputMode"))}</strong>
          <div class="current-mode-toggle" role="group" aria-label="${escapeHtml(t("current.scoreInputMode"))}">
            <button
              class="${scoreInputMode === SCORE_INPUT_MODES.manual ? "primary-action" : "secondary-action"}"
              type="button"
              data-action="set-score-input-mode"
              data-mode="manual"
            >
              ${escapeHtml(t("current.manualMode"))}
            </button>
            <button
              class="${scoreInputMode === SCORE_INPUT_MODES.cards ? "primary-action" : "secondary-action"}"
              type="button"
              data-action="set-score-input-mode"
              data-mode="cards"
            >
              ${escapeHtml(t("current.cardMode"))}
            </button>
          </div>
        </div>
      `
      : "";

  const statusBannerHtml = () => `
      <div class="state-banner">
        <strong>${escapeHtml(gameModeLabel(game.gameMode))}</strong>
        <span class="muted">${escapeHtml(
          winner
            ? `${t("current.finishedTitle")}: ${winnerPresentation.nameText}`
            : suddenDeathActive
              ? t("current.suddenDeathInProgress")
              : t("current.lead")
        )}</span>
      </div>
  `;

  const winnerBannerHtml = () =>
    winner
      ? `
      <div class="state-banner">
        <p class="eyebrow">${escapeHtml(winnerPresentation.label)}</p>
        <strong title="${escapeHtml(winnerPresentation.nameText)}">${escapeHtml(winnerPresentation.nameText)}</strong>
        <span>${formatNumber(winnerPresentation.total)} ${escapeHtml(t("common.points"))}</span>
        <span class="muted">${escapeHtml(t("current.finishedLead"))}</span>
      </div>
      `
      : "";

  const rosterHtml = () => {
    if (!canManagePlayers) {
      return "";
    }

    const removeDisabled = activePlayers.length <= 2;
    const renamingPlayerId = state.draft.currentGameRenamingPlayerId;

    return `
      <div class="stack-tight current-roster-section">
        <strong>${escapeHtml(t("current.managePlayers"))}</strong>
        <div class="inline-row current-roster-add">
          <input
            id="current-player-input"
            type="text"
            inputmode="text"
            autocomplete="off"
            enterkeyhint="next"
            placeholder="${escapeHtml(t("current.playerPlaceholder"))}"
            value="${escapeHtml(state.draft.currentGamePlayerInput)}"
          />
          <button class="secondary-action" type="button" data-action="add-current-player">${escapeHtml(
            t("current.addPlayer")
          )}</button>
        </div>
        <p class="helper">${escapeHtml(t("current.appliesFutureRounds"))}</p>
        <div class="stack-tight">
          <strong class="subsection-title">${escapeHtml(t("current.activePlayers"))}</strong>
          ${
            activePlayers.length
              ? `<div class="current-roster-list">
                  ${activePlayers
                    .map(
                      (player) => {
                        const isRenaming = renamingPlayerId === player.id;
                        return `
                        <div class="current-roster-item">
                          <div class="current-roster-copy">
                            ${
                              isRenaming
                                ? `
                                  <input
                                    id="current-player-rename-input"
                                    class="current-roster-rename-input"
                                    type="text"
                                    inputmode="text"
                                    autocomplete="off"
                                    enterkeyhint="done"
                                    data-player-id="${escapeHtml(player.id)}"
                                    value="${escapeHtml(state.draft.currentGameRenameInput)}"
                                  />
                                  <div class="current-roster-edit-actions">
                                    <button
                                      class="secondary-action current-roster-save"
                                      type="button"
                                      data-action="save-current-player-name"
                                      data-player-id="${escapeHtml(player.id)}"
                                    >
                                      ${escapeHtml(t("common.save"))}
                                    </button>
                                    <button
                                      class="secondary-action current-roster-cancel"
                                      type="button"
                                      data-action="cancel-current-player-rename"
                                    >
                                      ${escapeHtml(t("common.cancel"))}
                                    </button>
                                  </div>
                                `
                                : `
                                  <div class="current-roster-name-row">
                                    <strong class="current-roster-name" title="${escapeHtml(player.name)}">${escapeHtml(
                                      player.name
                                    )}</strong>
                                    <button
                                      class="icon-button current-roster-edit"
                                      type="button"
                                      data-action="edit-current-player"
                                      data-player-id="${escapeHtml(player.id)}"
                                      aria-label="${escapeHtml(`${t("current.editPlayer")} ${player.name}`)}"
                                    >
                                      <span aria-hidden="true">✎</span>
                                    </button>
                                  </div>
                                `
                            }
                          </div>
                          <div class="current-roster-actions">
                            <button
                              class="chip-remove current-roster-remove"
                              type="button"
                              data-action="remove-current-player"
                              data-player-id="${escapeHtml(player.id)}"
                              aria-label="${escapeHtml(`${t("current.removePlayer")} ${player.name}`)}"
                              ${removeDisabled ? "disabled" : ""}
                            >
                              −
                            </button>
                          </div>
                        </div>
                        `;
                      }
                    )
                    .join("")}
                </div>
                ${removeDisabled ? `<p class="helper plain-copy">${escapeHtml(t("current.minimumPlayers"))}</p>` : ""}`
              : `<p class="helper plain-copy">${escapeHtml(t("current.noActivePlayers"))}</p>`
          }
        </div>
        ${
          inactivePlayers.length
            ? `
              <div class="stack-tight">
                <strong class="subsection-title">${escapeHtml(t("current.inactivePlayers"))}</strong>
                <div class="current-roster-list">
                  ${inactivePlayers
                    .map(
                      (player) => `
                        <div class="current-roster-item is-inactive">
                          <div class="current-roster-copy">
                            <strong class="current-roster-name" title="${escapeHtml(player.name)}">${escapeHtml(
                              player.name
                            )}</strong>
                          </div>
                          <button
                            class="current-roster-restore"
                            type="button"
                            data-action="restore-current-player"
                            data-player-name="${escapeHtml(player.name)}"
                            aria-label="${escapeHtml(`${t("current.activatePlayer")} ${player.name}`)}"
                          >
                            ${escapeHtml(t("current.activatePlayer"))}
                          </button>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </div>
            `
            : `<p class="helper plain-copy">${escapeHtml(t("current.noInactivePlayers"))}</p>`
        }
      </div>
    `;
  };

  const detailsHtml = () => `
    <details class="current-details" ${currentDetailsOpen ? "open" : ""}>
      <summary>
        <span>${escapeHtml(t("current.gameDetails"))}</span>
        <span class="current-details-caret" aria-hidden="true">⌄</span>
      </summary>
      <div class="stack current-details-body">
        ${statusBannerHtml()}
        ${winnerBannerHtml()}
        ${roundInputSettingsHtml()}
        ${rosterHtml()}
        ${noteHtml()}
        ${renderRoundHistory()}
      </div>
    </details>
  `;

  const secondaryHtml = () => `
    <div class="current-secondary-actions">
      <button class="secondary-action" type="button" data-action="archive-current">${escapeHtml(
        t("current.archiveGame")
      )}</button>
    </div>
  `;

  if (
    screen.dataset.currentGameId !== game.id ||
    !screen.querySelector("[data-current-game-shell]") ||
    !screen.querySelector('[data-current-game-slot="details"]')
  ) {
    screen.innerHTML = currentShellHtml;
    screen.dataset.currentGameId = game.id;
    screen.dataset.currentGameEditorKey = "";
    screen.dataset.currentGameDetailsKey = "";
  }

  const setSlot = (slotName, htmlOrFactory, key, datasetKey) => {
    const slot = screen.querySelector(`[data-current-game-slot="${slotName}"]`);
    if (!slot) {
      return;
    }

    if (datasetKey && slot.dataset[datasetKey] === key) {
      return;
    }

    const html = typeof htmlOrFactory === "function" ? htmlOrFactory() : htmlOrFactory;
    slot.innerHTML = html;
    if (datasetKey) {
      slot.dataset[datasetKey] = key;
    }
  };

  setSlot("header", headerHtml, headerKey, "renderKey");
  setSlot("warning", roundWarningHtml, warningKey, "renderKey");
  setSlot("editor", editorHtml, editorKey, "renderKey");
  setSlot("details", detailsHtml, detailsKey, "renderKey");
  setSlot("secondary", secondaryHtml, secondaryKey, "renderKey");
}

function renderStatsScreen() {
  const scopeState = getStatsScopeState();

  if (!scopeState.game && scopeState.mode !== "all") {
    return `
      <section class="stack stats-view">
        <p class="eyebrow">${escapeHtml(t("stats.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(t("stats.title"))}</h1>
        <p class="helper plain-copy">${escapeHtml(t("stats.noStats"))}</p>
      </section>
    `;
  }

  const game = scopeState.game;
  const isAggregate = scopeState.mode === "all";
  const stats = isAggregate ? buildAllGamesStats(scopeState.games) : buildGameStats(game);
  const winnerPresentation = !isAggregate ? stats.winnerPresentation : null;
  const roundSummaries =
    !isAggregate && game
      ? stats.rounds.map((round, index) => {
          const roundTotal = stats.roundTotals[index];
          return `
            <article class="round-card">
              <div class="game-card-header">
                <strong>${escapeHtml(t("current.roundNumber", { count: index + 1 }))}</strong>
                <span class="pill">${escapeHtml(t("stats.roundTotal"))}: ${formatNumber(roundTotal)}</span>
              </div>
              <div class="game-card-meta">
                ${round.scores
                  .map((score) => {
                    const playerName = game.players.find((player) => player.id === score.playerId)?.name || score.playerId;
                    return `<span>${escapeHtml(playerName)}: ${formatNumber(score.points)}</span>`;
                  })
                  .join(" • ")}
              </div>
            </article>
          `;
        })
      : [];

  const availableGames = scopeState.games;
  const showScopePicker = availableGames.length > 1;
  const selectedStatsGameId = scopeState.game?.id || state.draft.statsGameId || "";
  const scopeOptions = availableGames.some((game) => game === state.data.currentGame)
    ? `
      <option value="current"${scopeState.mode === "current" ? " selected" : ""}>${escapeHtml(t("current.title"))}</option>
      <option value="all"${scopeState.mode === "all" ? " selected" : ""}>${escapeHtml(t("stats.allGames"))}</option>
      <option value="pick"${scopeState.mode === "pick" ? " selected" : ""}>${escapeHtml(t("stats.pickGame"))}</option>
    `
    : `
      <option value="all"${scopeState.mode === "all" ? " selected" : ""}>${escapeHtml(t("stats.allGames"))}</option>
      <option value="pick"${scopeState.mode === "pick" ? " selected" : ""}>${escapeHtml(t("stats.pickGame"))}</option>
    `;

  return `
    <section class="stack stats-view">
      <div class="stack-tight">
        <p class="eyebrow">${escapeHtml(t("stats.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(t("stats.title"))}</h1>
        <p class="screen-lead">${escapeHtml(t("stats.lead"))}</p>
      </div>
      ${
        showScopePicker
          ? `
            <div class="stack-tight stats-scope">
              <label class="field">
                <span class="field-label">${escapeHtml(t("stats.scopeLabel"))}</span>
                <select id="stats-scope">
                  ${scopeOptions}
                </select>
              </label>
              ${
                scopeState.mode === "pick"
                  ? `
                    <label class="field">
                      <span class="field-label">${escapeHtml(t("stats.pickLabel"))}</span>
                  <select id="stats-game-id">
                        ${availableGames
                          .map(
                            (entry) => `
                              <option value="${escapeHtml(entry.id)}"${entry.id === selectedStatsGameId ? " selected" : ""}>${escapeHtml(
                                entry.title + (entry.isFinished ? ` (${t("statuses.finished")})` : "")
                              )}</option>
                            `
                          )
                          .join("")}
                      </select>
                    </label>
                  `
                  : ""
              }
            </div>
          `
          : ""
      }
      <div class="top-summary-grid">
        <div class="summary-block">
          <small class="muted">${escapeHtml(isAggregate ? t("stats.totalGames") : t("stats.leader"))}</small>
          <strong>${escapeHtml(
            isAggregate ? formatNumber(stats.totalGames) : stats.leader?.name || "—"
          )}</strong>
        </div>
        <div class="summary-block">
          <small class="muted">${escapeHtml(t("stats.highestSingleScore"))}</small>
          <strong>${formatNumber(stats.highestSingleScore)}</strong>
        </div>
        <div class="summary-block">
          <small class="muted">${escapeHtml(t("stats.lowestSingleScore"))}</small>
          <strong>${formatNumber(stats.lowestSingleScore)}</strong>
        </div>
        <div class="summary-block">
          <small class="muted">${escapeHtml(t("stats.totalRounds"))}</small>
          <strong>${formatNumber(stats.rounds.length)}</strong>
        </div>
        <div class="summary-block">
          <small class="muted">${escapeHtml(t("stats.averageRound"))}</small>
          <strong>${formatNumber(Math.round(stats.averageRoundTotal))}</strong>
        </div>
        <div class="summary-block">
          <small class="muted">${escapeHtml(t("stats.highestRoundTotal"))}</small>
          <strong>${formatNumber(stats.highestRoundTotal)}</strong>
        </div>
        <div class="summary-block">
          <small class="muted">${escapeHtml(t("stats.lowestRoundTotal"))}</small>
          <strong>${formatNumber(stats.lowestRoundTotal)}</strong>
        </div>
        <div class="summary-block">
          <small class="muted">${escapeHtml(isAggregate ? t("stats.averageRoundsPerGame") : t("current.winningScore"))}</small>
          <strong>${formatNumber(Math.round(isAggregate ? stats.averageRoundsPerGame : game.winningScore))}</strong>
        </div>
      </div>
      ${
        winnerPresentation && winnerPresentation.winners.length
          ? `
            <div class="state-banner">
              <p class="eyebrow">${escapeHtml(winnerPresentation.label)}</p>
              <strong title="${escapeHtml(winnerPresentation.nameText)}">${escapeHtml(winnerPresentation.nameText)}</strong>
              <span>${formatNumber(winnerPresentation.total)} ${escapeHtml(t("common.points"))}</span>
            </div>
          `
          : ""
      }
      ${
        !isAggregate
          ? `
            <div class="stack-tight">
              <strong>${escapeHtml(t("stats.perPlayerTotals"))}</strong>
              <div class="stats-list">
                ${stats.scoreboard
                  .map(
                    (entry) => `
                      <div class="summary-block">
                        <div class="game-card-header">
                          <strong title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</strong>
                          <span>${formatNumber(entry.total)}</span>
                        </div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </div>
            <div class="stack-tight">
              <strong>${escapeHtml(t("stats.roundHistory"))}</strong>
              <div class="round-list">${roundSummaries.join("") || `<div class="empty-state">${escapeHtml(t("stats.noStats"))}</div>`}</div>
            </div>
          `
          : `
            <div class="stack-tight">
              <strong>${escapeHtml(t("stats.roundHistory"))}</strong>
              <div class="round-list">
                ${scopeState.games
                  .map(
                    (entry) => `
                      <article class="round-card">
                        <div class="game-card-header">
                          <strong>${escapeHtml(entry.title)}</strong>
                          <span class="pill">${escapeHtml(
                            `${formatNumber(entry.rounds.length)} ${escapeHtml(t("stats.roundTotal"))}`
                          )}</span>
                        </div>
                        <div class="game-card-meta">
                          <span>${escapeHtml(t("existing.lastPlayed"))}: ${escapeHtml(formatDateTime(entry.updatedAt))}</span>
                          <span>${escapeHtml(t("current.winningScore"))}: ${formatNumber(entry.winningScore)}</span>
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `
      }
    </section>
  `;
}

function renderSettingsScreen() {
  return `
    <section class="stack settings-view">
      <div class="stack-tight">
        <p class="eyebrow">${escapeHtml(t("settings.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(t("settings.title"))}</h1>
        <p class="screen-lead">${escapeHtml(t("settings.lead"))}</p>
      </div>
      <form class="stack" id="settings-form">
        <label class="field">
          <span class="field-label">${escapeHtml(t("settings.defaultWinningScore"))}</span>
          <input
            id="settings-winning-score"
            type="number"
            min="1"
            step="1"
            value="${escapeHtml(state.settings.defaultWinningScore)}"
          />
        </label>
        <div class="field">
          <span class="field-label">${escapeHtml(t("settings.defaultInputMode"))}</span>
          ${renderInputModeToggle({
            value: state.settings.defaultScoreInputMode,
            action: "set-settings-input-mode",
            allowCards: true,
            ariaLabel: t("settings.defaultInputMode")
          })}
          <div class="helper">${escapeHtml(t("settings.inputModeHelp"))}</div>
        </div>
        <label class="field">
          <span class="field-label">${escapeHtml(t("settings.theme"))}</span>
          <select id="settings-theme">
            <option value="light"${state.settings.theme === "light" ? " selected" : ""}>${escapeHtml(
              t("settings.light")
            )}</option>
            <option value="dark"${state.settings.theme === "dark" ? " selected" : ""}>${escapeHtml(
              t("settings.dark")
            )}</option>
            <option value="system"${state.settings.theme === "system" ? " selected" : ""}>${escapeHtml(
              t("settings.system")
            )}</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">${escapeHtml(t("settings.language"))}</span>
          <select id="settings-language">
            <option value="en"${state.settings.language === "en" ? " selected" : ""}>${escapeHtml(
              t("settings.english")
            )}</option>
            <option value="sv"${state.settings.language === "sv" ? " selected" : ""}>${escapeHtml(
              t("settings.swedish")
            )}</option>
            <option value="da"${state.settings.language === "da" ? " selected" : ""}>${escapeHtml(
              t("settings.danish")
            )}</option>
          </select>
        </label>
      </form>
      <p class="settings-version" aria-label="${escapeHtml(`Version ${APP_VERSION}`)}">
        ${escapeHtml(`Version ${APP_VERSION}`)}
      </p>
    </section>
  `;
}

function renderScreen(name, html) {
  const screen = elements.screens[name];
  if (!screen) return;
  screen.innerHTML = html;
}

function renderMenu() {
  const menu = elements.gameMenu;
  if (!state.menu) {
    menu.classList.add("hidden");
    menu.innerHTML = "";
    return;
  }

  const game = findGameById(state.menu.gameId);
  if (!game) {
    state.menu = null;
    renderMenu();
    return;
  }

  const isCurrent = state.data.currentGame?.id === game.id;
  const actions = isCurrent
    ? [
        { action: "archive-game", label: t("existing.archiveCard"), destructive: false }
      ]
    : [
        { action: "resume-game", label: t("existing.resumeCard"), destructive: false },
        { action: "delete-game", label: t("existing.deleteCard"), destructive: true }
      ];

  menu.innerHTML = actions
    .map(
      (item) => `
        <button class="menu-action ${item.destructive ? "destructive" : ""}" type="button" data-action="${item.action}" data-game-id="${escapeHtml(
          game.id
        )}">${escapeHtml(item.label)}</button>
      `
    )
    .join("");
  menu.style.left = `${state.menu.left}px`;
  menu.style.top = `${state.menu.top}px`;
  menu.classList.remove("hidden");
}

function renderConfirmModal() {
  elements.roundConfirmModal.classList.toggle("hidden", !state.confirmNextRoundOpen);
  elements.roundConfirmModal.setAttribute("aria-hidden", String(!state.confirmNextRoundOpen));
  elements.roundConfirmMessage.textContent = t("current.askContinue");
}

function renderSystemBanner() {
  if (!elements.systemBanner) {
    return;
  }

  const hasError = Boolean(state.systemError);
  elements.systemBanner.classList.toggle("hidden", !hasError);

  if (!hasError) {
    elements.systemBanner.innerHTML = "";
    return;
  }

  elements.systemBanner.innerHTML = `
    <strong>${escapeHtml(state.systemError)}</strong>
    <button class="secondary-action system-banner-retry" type="button" data-action="retry-load">
      ${escapeHtml(t("common.retry"))}
    </button>
  `;
}

function renderArchiveConfirmModal() {
  elements.archiveConfirmModal.classList.toggle("hidden", !state.confirmArchiveOpen);
  elements.archiveConfirmModal.setAttribute("aria-hidden", String(!state.confirmArchiveOpen));
  elements.archiveConfirmMessage.textContent = t("archiveConfirm.message");
}

function renderDrawer() {
  elements.drawer.classList.toggle("hidden", !state.drawerOpen);
  elements.appBackdrop.classList.toggle(
    "hidden",
    !(state.drawerOpen || state.menu || state.confirmNextRoundOpen || state.confirmArchiveOpen)
  );
  elements.menuButton.setAttribute("aria-expanded", String(state.drawerOpen));
}

function renderChrome() {
  applyPreferences();
  renderShellText();
  renderSystemBanner();
  renderDrawer();
  renderMenu();
  renderConfirmModal();
  renderArchiveConfirmModal();
}

function render() {
  if (state.route !== "current-game" && state.draft.scanRound?.active) {
    cancelScanRound({ silent: true });
  }

  if (state.route !== "current-game") {
    hideCelebration();
  }

  setScanUiActive(state.route === "current-game" && Boolean(state.draft.scanRound?.active));
  setScanCaptureUiActive(state.route === "current-game" && state.draft.scanRound?.step === "capture");
  renderChrome();

  const routeMap = {
    home: { screenName: "home", render: renderHomeScreen },
    "new-game": { screenName: "newGame", render: renderNewGameScreen },
    "existing-games": { screenName: "existingGames", render: renderExistingGamesScreen },
    "current-game": { screenName: "currentGame", render: renderCurrentGameScreen },
    stats: { screenName: "stats", render: renderStatsScreen },
    settings: { screenName: "settings", render: renderSettingsScreen }
  };

  const activeRoute = routeMap[state.route] || routeMap.home;
  if (state.route === "current-game") {
    renderCurrentGameScreen();
  } else {
    renderScreen(activeRoute.screenName, activeRoute.render());
  }

  Object.entries(routeMap).forEach(([route, { screenName }]) => {
    const screen = elements.screens[screenName];
    screen.classList.toggle("hidden", state.route !== route);
  });

  const focusTarget = state.draft.currentGameFocusTarget;
  state.draft.currentGameFocusTarget = null;
  const scanFocusTarget = state.draft.scanRound?.focusScorePlayerId || null;
  if (state.draft.scanRound) {
    state.draft.scanRound.focusScorePlayerId = null;
  }
  requestAnimationFrame(() => {
    if (state.route === "new-game") {
      document.querySelector("#new-player-input")?.focus();
    } else if (
      state.route === "current-game" &&
      isRoundDraftEditable(state.data.currentGame) &&
      !state.confirmNextRoundOpen &&
      !state.confirmArchiveOpen
    ) {
      if (focusTarget === "player") {
        focusCurrentPlayerInput();
      } else if (focusTarget === "rename-player") {
        focusCurrentPlayerRenameInput();
      } else if (scanFocusTarget) {
        document
          .querySelector(`[data-scan-score-player-id="${scanFocusTarget}"]`)
          ?.focus();
      } else {
        focusCurrentScoreInput();
      }
    } else if (state.route === "settings") {
      document.querySelector("#settings-winning-score")?.focus();
    }
  });
}

function resizeCelebrationCanvas() {
  const canvas = elements.celebrationCanvas;
  const surface = elements.celebration;
  if (!(canvas instanceof HTMLCanvasElement) || !surface) {
    return null;
  }

  const rect = surface.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

function clearCelebrationTimers() {
  if (state.celebration.rafId !== null) {
    window.cancelAnimationFrame(state.celebration.rafId);
    state.celebration.rafId = null;
  }

  if (state.celebration.timeoutId !== null) {
    window.clearTimeout(state.celebration.timeoutId);
    state.celebration.timeoutId = null;
  }

  state.celebration.burstTimers.forEach((timerId) => window.clearTimeout(timerId));
  state.celebration.burstTimers = [];
}

function hideCelebration() {
  clearCelebrationTimers();
  state.celebration.presentation = null;
  if (elements.celebration) {
    elements.celebration.classList.add("hidden");
    elements.celebration.classList.remove("celebration-pulse");
    elements.celebration.classList.remove("celebration-persistent");
    elements.celebration.setAttribute("aria-hidden", "true");
  }
  if (elements.celebrationActions) {
    elements.celebrationActions.classList.add("hidden");
  }
  if (elements.celebrationSuddenDeath) {
    elements.celebrationSuddenDeath.disabled = false;
  }
  if (elements.celebrationKeepTied) {
    elements.celebrationKeepTied.disabled = false;
  }
}

function startCelebrationFireworks() {
  const surface = resizeCelebrationCanvas();
  if (!surface) {
    return;
  }

  const { context, width, height } = surface;
  const particles = [];
  
  // Bright, punchy neon colors for better screen pop
  const palette = ["#FF1461", "#18FF92", "#5A87FF", "#FBF38C", "#FF44FF", "#00FFFF"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const spawnBurst = (x, y, isBig = false) => {
    const baseColor = palette[Math.floor(Math.random() * palette.length)];
    // Scale down particles if reduced motion is enabled
    const count = reducedMotion ? 15 : (isBig ? 60 : 35);

    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      // Vary the speed so the burst looks spherical instead of like a flat ring
      const speed = Math.random() * (isBig ? 10 : 6) + 2;
      
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        // Mix in pure white sparks occasionally for brightness
        color: Math.random() > 0.8 ? "#FFFFFF" : baseColor,
        size: Math.random() * 2 + 1.5,
        life: 1, // We'll fade this down to 0
        decay: Math.random() * 0.015 + 0.015,
        gravity: 0.12,
        friction: 0.92 // Strong friction creates the initial "pop" then slow down
      });
    }
  };

  // 1. Schedule a sequence of randomized bursts
  const burstCount = reducedMotion ? 3 : 6;
  for (let index = 0; index < burstCount; index += 1) {
    const timerId = window.setTimeout(() => {
      // Keep bursts in the upper portion of the screen
      const x = width * 0.15 + Math.random() * (width * 0.7);
      const y = height * 0.1 + Math.random() * (height * 0.4);
      spawnBurst(x, y, Math.random() > 0.7);
    }, index * 250 + Math.random() * 150);
    
    state.celebration.burstTimers.push(timerId);
  }

  // 2. Schedule a "Grand Finale" volley at the end
  const finaleTimerId = window.setTimeout(() => {
    if (!reducedMotion) {
      spawnBurst(width * 0.3, height * 0.3, true);
      spawnBurst(width * 0.7, height * 0.3, true);
      spawnBurst(width * 0.5, height * 0.2, true);
    }
  }, burstCount * 250 + 200);
  state.celebration.burstTimers.push(finaleTimerId);

  // Fire off one immediate burst to start the show
  spawnBurst(width * 0.5, height * 0.25, true);

  const draw = () => {
    context.clearRect(0, 0, width, height);
    
    // Makes overlapping colors bright and glowing
    context.globalCompositeOperation = "lighter";

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      
      // Apply physics
      particle.vx *= particle.friction;
      particle.vy *= particle.friction;
      particle.vy += particle.gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= particle.decay;

      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }

      // Draw particle as a streak based on its velocity (motion blur effect)
      context.beginPath();
      context.moveTo(particle.x - particle.vx * 2.5, particle.y - particle.vy * 2.5);
      context.lineTo(particle.x, particle.y);
      
      context.strokeStyle = particle.color;
      context.lineWidth = particle.size;
      context.lineCap = "round";
      context.globalAlpha = Math.max(0, particle.life); // Fade out naturally
      context.stroke();
    }

    // Reset alpha for the next frame
    context.globalAlpha = 1;

    // Keep animating until the global timeout in showCelebration() kills the RAF ID
    state.celebration.rafId = window.requestAnimationFrame(draw);
  };

  state.celebration.rafId = window.requestAnimationFrame(draw);
}

function showCelebration(winnerPresentation) {
  if (!winnerPresentation || !winnerPresentation.winners?.length || !elements.celebration) {
    return;
  }

  hideCelebration();
  state.celebration.presentation = winnerPresentation;
  elements.celebration.classList.remove("hidden");
  elements.celebration.classList.add("celebration-pulse");
  elements.celebration.setAttribute("aria-hidden", "false");

  if (elements.celebrationTitle) {
    elements.celebrationTitle.textContent = winnerPresentation.celebrationTitle || t("celebration.title");
  }

  if (elements.celebrationName) {
    elements.celebrationName.textContent = winnerPresentation.nameText;
    elements.celebrationName.title = winnerPresentation.nameText;
  }

  const isTied = winnerPresentation.winners.length > 1;
  if (elements.celebrationActions) {
    elements.celebrationActions.classList.toggle("hidden", !isTied);
  }
  if (elements.celebration) {
    elements.celebration.classList.toggle("celebration-persistent", isTied);
  }
  if (elements.celebrationSuddenDeath) {
    elements.celebrationSuddenDeath.textContent = t("current.suddenDeath");
  }
  if (elements.celebrationKeepTied) {
    elements.celebrationKeepTied.textContent = t("current.keepTiedResult");
  }

  startCelebrationFireworks();
  if (!isTied) {
    state.celebration.timeoutId = window.setTimeout(() => {
      hideCelebration();
    }, 2800);
  }
}

async function startSuddenDeathFromCelebration() {
  const game = state.data.currentGame;
  const presentation = state.celebration.presentation || (game ? getWinnerPresentation(game) : null);

  if (!game || !presentation || presentation.winners.length < 2) {
    hideCelebration();
    return;
  }

  if (elements.celebrationSuddenDeath) {
    elements.celebrationSuddenDeath.disabled = true;
  }
  if (elements.celebrationKeepTied) {
    elements.celebrationKeepTied.disabled = true;
  }

  try {
    const payload = await api(`/api/game/${encodeURIComponent(game.id)}/sudden-death`, {
      method: "POST",
      body: JSON.stringify({})
    });

    if (payload.game) {
      state.data.currentGame = payload.game;
      resetLiveRoundDraft(state.data.currentGame);
    }

    hideCelebration();
    render();
    if (isRoundDraftEditable(state.data.currentGame)) {
      focusCurrentScoreInput();
    }
  } catch (error) {
    if (elements.celebrationSuddenDeath) {
      elements.celebrationSuddenDeath.disabled = false;
    }
    if (elements.celebrationKeepTied) {
      elements.celebrationKeepTied.disabled = false;
    }
    showToast(error.message, true);
  }
}

function resetNewGameDraft() {
  state.draft.newGame = {
    title: "",
    gameMode: "classic",
    winningScore: String(state.settings.defaultWinningScore),
    scoreInputMode: getNewGameScoreInputMode("classic", state.settings.defaultScoreInputMode),
    playerInput: "",
    players: []
  };
}

function setNewGameMode(mode) {
  state.draft.newGame.gameMode = mode === "vengeance" || mode === "mixed" ? mode : "classic";
  state.draft.newGame.scoreInputMode =
    state.draft.newGame.gameMode === "classic"
      ? normalizeScoreInputMode(state.settings.defaultScoreInputMode)
      : SCORE_INPUT_MODES.manual;
}

function seedNewGameFromPlayers(players, game) {
  state.draft.newGame = {
    title: game?.title ? `${game.title} ${t("common.current")}` : "",
    gameMode: game?.gameMode || "classic",
    winningScore: String(game?.winningScore || state.settings.defaultWinningScore),
    scoreInputMode: getNewGameScoreInputMode(
      game?.gameMode || "classic",
      game?.defaultScoreInputMode || state.settings.defaultScoreInputMode
    ),
    playerInput: "",
    players: players.map((player) => player.name)
  };
}

async function startGame() {
  clearFinishedRoundNoteAutosave();
  const players = [...state.draft.newGame.players];
  const title = state.draft.newGame.title.trim();
  const gameMode = state.draft.newGame.gameMode;

  if (players.length < 2) {
    showToast(t("newGame.noPlayersYet"), true);
    return;
  }

  const snapshot = snapshotAppState();

  try {
    const winningScore = Number(state.draft.newGame.winningScore);
    const normalizedWinningScore =
      Number.isFinite(winningScore) && winningScore > 0 ? winningScore : state.settings.defaultWinningScore;
    const optimisticGame = makeNewGame({
      title,
      gameMode,
      winningScore: normalizedWinningScore,
      defaultScoreInputMode: state.draft.newGame.scoreInputMode,
      playerNames: players
    });

    state.data.history = appendCurrentGameToHistory(state.data.history, state.data.currentGame);
    state.data.currentGame = optimisticGame;
    resetNewGameDraft();
    state.draft.currentRoundKey = "new";
    state.draft.roundDrafts = {
      new: createBlankRoundDraft(state.data.currentGame, "new")
    };
    state.draft.currentGamePlayerInput = "";
    ensureRoundDraft(state.data.currentGame);
    state.route = "current-game";
    window.location.hash = "current-game";
    render();
    focusCurrentScoreInput();

    const payload = await api("/api/game", {
      method: "POST",
      body: JSON.stringify({
        title,
        players,
        gameMode,
        winningScore: normalizedWinningScore,
        defaultScoreInputMode: state.draft.newGame.scoreInputMode
      })
    });

    if (payload.game) {
      state.draft.roundScores = remapRoundScores(optimisticGame.players, payload.game.players || [], state.draft.roundScores);
      state.data.currentGame = payload.game;
      ensureRoundDraft(state.data.currentGame);
    }

    if (payload.history) {
      state.data.history = payload.history;
    }

    showToast(t("toast.gameStarted"));
    render();
    focusCurrentScoreInput();
  } catch (error) {
    restoreAppState(snapshot);
    showToast(error.message, true);
    render();
  }
}

async function playAgain() {
  const game = state.data.currentGame;
  if (!game) {
    return;
  }

  clearFinishedRoundNoteAutosave();
  const snapshot = snapshotAppState();

  try {
    const optimisticGame = makeRestartedGame(game);

    hideCelebration();
    state.data.history = appendCurrentGameToHistory(state.data.history, state.data.currentGame);
    state.data.currentGame = optimisticGame;
    state.draft.roundNote = "";
    state.draft.roundScores = {};
    state.draft.currentGameOrder = "entered";
    state.draft.currentGamePlayerInput = "";
    state.draft.currentRoundKey = "new";
    state.draft.roundDrafts = {
      new: createBlankRoundDraft(state.data.currentGame, "new")
    };
    ensureRoundDraft(state.data.currentGame);
    state.route = "current-game";
    window.location.hash = "current-game";
    render();
    focusCurrentScoreInput();

    const payload = await api("/api/game/restart", {
      method: "POST",
      body: JSON.stringify({})
    });

    if (payload.game) {
      state.draft.roundScores = remapRoundScores(optimisticGame.players, payload.game.players || [], state.draft.roundScores);
      state.data.currentGame = payload.game;
      ensureRoundDraft(state.data.currentGame);
    }

    if (payload.history) {
      state.data.history = payload.history;
    }

    showToast(t("toast.gameStarted"));
    render();
    focusCurrentScoreInput();
  } catch (error) {
    restoreAppState(snapshot);
    showToast(error.message, true);
    render();
  }
}

function addDraftPlayer() {
  const name = state.draft.newGame.playerInput.trim();
  if (!name) {
    return;
  }

  if (state.draft.newGame.players.some((player) => player.toLowerCase() === name.toLowerCase())) {
    showToast(t("newGame.duplicatePlayer"), true);
    return;
  }

  state.draft.newGame.players = [...state.draft.newGame.players, name];
  state.draft.newGame.playerInput = "";
  showToast(t("toast.playerAdded"));
  render();
}

function removeDraftPlayer(index) {
  state.draft.newGame.players = state.draft.newGame.players.filter((_, playerIndex) => playerIndex !== index);
  render();
}

function focusNextCurrentScoreInput(currentInput) {
  const inputs = [...document.querySelectorAll('#current-game-form input[data-player-id]')];
  const index = inputs.indexOf(currentInput);
  const nextInput = index >= 0 ? inputs[index + 1] : null;
  if (nextInput instanceof HTMLInputElement) {
    focusCurrentScoreInput(nextInput);
    return true;
  }

  const note = document.querySelector("#round-note");
  if (note instanceof HTMLTextAreaElement && !note.disabled) {
    note.focus({ preventScroll: true });
    return true;
  }

  return false;
}

function focusCurrentScoreInput(target = null) {
  const input =
    target instanceof HTMLInputElement
      ? target
      : document.querySelector('#current-game-form input[data-player-id]');

  if (!(input instanceof HTMLInputElement)) {
    const cardButton = document.querySelector('#current-game-form [data-action="toggle-card-picker"]');
    if (cardButton instanceof HTMLButtonElement) {
      requestAnimationFrame(() => {
        cardButton.focus({ preventScroll: true });
      });
    }
    return;
  }

  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.select();
  });
}

function focusCurrentPlayerInput(target = null) {
  const input =
    target instanceof HTMLInputElement ? target : document.querySelector("#current-player-input");

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.select();
  });
}

function focusCurrentPlayerRenameInput(target = null) {
  const input =
    target instanceof HTMLInputElement ? target : document.querySelector("#current-player-rename-input");

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.select();
  });
}

async function addCurrentGamePlayer(nameInput = state.draft.currentGamePlayerInput) {
  const game = state.data.currentGame;
  if (!game || game.isFinished) {
    return;
  }

  const name = String(nameInput ?? "").trim();
  if (!name) {
    return;
  }

  const duplicate = game.players.some(
    (player) => player.isActive && player.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    showToast(t("newGame.duplicatePlayer"), true);
    return;
  }

  const snapshot = snapshotAppState();

  try {
    cacheRoundDraft(game);

    const timestamp = now();
    const players = [...game.players];
    const existingInactiveIndex = players.findIndex(
      (player) => !player.isActive && player.name.toLowerCase() === name.toLowerCase()
    );
    const restoringExistingPlayer = existingInactiveIndex >= 0;

    if (existingInactiveIndex >= 0) {
      players[existingInactiveIndex] = {
        ...players[existingInactiveIndex],
        isActive: true,
        removedAt: null,
        joinedAt: players[existingInactiveIndex].joinedAt || timestamp
      };
    } else {
      players.push({
        id: createUuid(),
        name,
        isActive: true,
        joinedAt: timestamp,
        removedAt: null
      });
    }

    const optimisticGame = {
      ...game,
      updatedAt: timestamp,
      players
    };

    state.data.currentGame = optimisticGame;
    state.draft.currentGamePlayerInput = "";
    state.draft.currentGameRenamingPlayerId = null;
    state.draft.currentGameRenameInput = "";
    loadRoundDraft(optimisticGame, getRoundDraftKey());
    state.draft.currentGameFocusTarget = "player";
    render();

    const payload = await api("/api/players", {
      method: "POST",
      body: JSON.stringify({ name })
    });

    if (payload.game) {
      state.data.currentGame = payload.game;
      ensureRoundDraft(state.data.currentGame);
    }

    showToast(t(restoringExistingPlayer ? "toast.playerRestored" : "toast.playerAdded"));
    state.draft.currentGameFocusTarget = "player";
    render();
  } catch (error) {
    restoreAppState(snapshot);
    showToast(error.message, true);
    render();
  }
}

async function removeCurrentGamePlayer(playerId) {
  const game = state.data.currentGame;
  if (!game || game.isFinished) {
    return;
  }

  const targetPlayer = game.players.find((player) => player.id === playerId && player.isActive);
  if (!targetPlayer) {
    return;
  }

  if (getActivePlayerCount(game) <= 2) {
    showToast(t("current.minimumPlayers"), true);
    return;
  }

  const snapshot = snapshotAppState();

  try {
    cacheRoundDraft(game);

    const timestamp = now();
    const optimisticGame = {
      ...game,
      updatedAt: timestamp,
      players: game.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              isActive: false,
              removedAt: timestamp
            }
          : player
      )
    };

    state.data.currentGame = optimisticGame;
    state.draft.currentGameRenamingPlayerId = null;
    state.draft.currentGameRenameInput = "";
    loadRoundDraft(optimisticGame, getRoundDraftKey());
    state.draft.currentGameFocusTarget = "player";
    render();

    const payload = await api(`/api/players/${encodeURIComponent(playerId)}`, {
      method: "DELETE"
    });

    if (payload.game) {
      state.data.currentGame = payload.game;
      ensureRoundDraft(state.data.currentGame);
    }

    showToast(t("toast.playerRemoved"));
    state.draft.currentGameFocusTarget = "player";
    render();
  } catch (error) {
    restoreAppState(snapshot);
    showToast(error.message, true);
    render();
  }
}

function cancelCurrentGamePlayerRename() {
  state.draft.currentGameRenamingPlayerId = null;
  state.draft.currentGameRenameInput = "";
  state.draft.currentGameFocusTarget = "player";
  render();
}

async function startCurrentGamePlayerRename(playerId) {
  const game = state.data.currentGame;
  if (!game || game.isFinished) {
    return;
  }

  const player = game.players.find((entry) => entry.id === playerId && entry.isActive);
  if (!player) {
    return;
  }

  state.draft.currentGameRenamingPlayerId = player.id;
  state.draft.currentGameRenameInput = player.name;
  state.draft.currentGameFocusTarget = "rename-player";
  render();
}

async function saveCurrentGamePlayerRename(playerId, nameInput = state.draft.currentGameRenameInput) {
  const game = state.data.currentGame;
  if (!game || game.isFinished) {
    return;
  }

  const targetPlayer = game.players.find((entry) => entry.id === playerId && entry.isActive);
  if (!targetPlayer) {
    return;
  }

  const name = String(nameInput ?? "").trim();
  if (!name) {
    return;
  }

  if (name === targetPlayer.name) {
    cancelCurrentGamePlayerRename();
    return;
  }

  const duplicate = game.players.some(
    (player) => player.id !== playerId && player.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    showToast(t("newGame.duplicatePlayer"), true);
    return;
  }

  const snapshot = snapshotAppState();

  try {
    const timestamp = now();
    const optimisticGame = {
      ...game,
      updatedAt: timestamp,
      players: game.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              name
            }
          : player
      )
    };

    state.data.currentGame = optimisticGame;
    state.draft.currentGameRenamingPlayerId = null;
    state.draft.currentGameRenameInput = "";
    state.draft.currentGameFocusTarget = "player";
    render();

    const payload = await api(`/api/players/${encodeURIComponent(playerId)}`, {
      method: "PATCH",
      body: JSON.stringify({ name })
    });

    if (payload.game) {
      state.data.currentGame = payload.game;
      ensureRoundDraft(state.data.currentGame);
    }

    showToast(t("toast.playerRenamed"));
    state.draft.currentGameFocusTarget = "player";
    render();
  } catch (error) {
    restoreAppState(snapshot);
    showToast(error.message, true);
    render();
  }
}

function clearHomeSwipeState() {
  const swipe = state.homeSwipe;
  if (swipe?.shell instanceof HTMLElement) {
    swipe.shell.classList.remove("swiping");
    swipe.shell.classList.remove("revealed");
  }

  if (swipe?.element instanceof HTMLElement) {
    swipe.element.style.transform = "";
    swipe.element.style.opacity = "";
  }

  state.homeSwipe = null;
}

function suppressHomeItemClick(gameId) {
  state.homeSwipeSuppressClickId = gameId;
  window.setTimeout(() => {
    if (state.homeSwipeSuppressClickId === gameId) {
      state.homeSwipeSuppressClickId = null;
    }
  }, 350);
}

function beginHomeSwipe(target, event) {
  if (window.matchMedia("(min-width: 720px)").matches) {
    return;
  }

  if (target.closest(".home-history-actions")) {
    return;
  }

  const swipeTarget = target.closest("[data-swipe-delete-card]");
  if (!(swipeTarget instanceof HTMLElement)) {
    return;
  }

  if (swipeTarget.dataset.homeCurrent === "true") {
    return;
  }

  clearHomeSwipeState();
  state.homeSwipe = {
    gameId: swipeTarget.dataset.gameCard,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    currentX: event.clientX,
    currentY: event.clientY,
    shell: swipeTarget,
    element: swipeTarget.querySelector(".home-history-item") || swipeTarget,
    revealed: false
  };
  swipeTarget.classList.add("swiping");
}

function moveHomeSwipe(event) {
  const swipe = state.homeSwipe;
  if (!swipe || swipe.pointerId !== event.pointerId || !(swipe.element instanceof HTMLElement)) {
    return;
  }

  const deltaX = event.clientX - swipe.startX;
  const deltaY = event.clientY - swipe.startY;

  if (Math.abs(deltaY) > Math.abs(deltaX) + 12) {
    clearHomeSwipeState();
    return;
  }

  if (deltaX >= 0) {
    swipe.element.style.transform = "";
    swipe.element.style.opacity = "";
    swipe.element.classList.remove("revealed");
    return;
  }

  const translateX = Math.max(deltaX, -120);
  swipe.element.style.transform = `translateX(${translateX}px)`;
  swipe.element.style.opacity = String(Math.max(0.58, 1 + translateX / 360));
}

async function endHomeSwipe(event) {
  const swipe = state.homeSwipe;
  if (!swipe || swipe.pointerId !== event.pointerId || !(swipe.element instanceof HTMLElement)) {
    return;
  }

  const deltaX = event.clientX - swipe.startX;
  const deltaY = event.clientY - swipe.startY;
  const shouldReveal = deltaX < -88 && Math.abs(deltaX) > Math.abs(deltaY) + 10;

  if (Math.abs(deltaX) > 12) {
    suppressHomeItemClick(swipe.gameId);
  }

  if (shouldReveal) {
    swipe.revealed = true;
    swipe.shell?.classList.add("revealed");
    swipe.element.style.transform = "translateX(-96px)";
    swipe.element.style.opacity = "1";
    return;
  }

  swipe.shell?.classList.remove("swiping");
  swipe.shell?.classList.remove("revealed");
  swipe.element.style.transform = "";
  swipe.element.style.opacity = "";
  clearHomeSwipeState();
}

function updateSettingsFromControls(shouldRender = true) {
  const winningScore = Number(document.querySelector("#settings-winning-score")?.value || 200);
  const theme = document.querySelector("#settings-theme")?.value || DEFAULT_SETTINGS.theme;
  const language = document.querySelector("#settings-language")?.value || DEFAULT_SETTINGS.language;

  state.settings.defaultWinningScore = Number.isFinite(winningScore) && winningScore > 0 ? winningScore : 200;
  state.settings.theme = theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
  state.settings.language = normalizeLanguage(language);
  globalThis.i18next?.changeLanguage(state.settings.language);
  saveSettings();
  if (shouldRender) {
    render();
  } else {
    applyPreferences();
  }
}

function resetPreferences() {
  state.settings = getDefaultSettings();
  saveSettings();
  showToast(t("toast.preferencesReset"));
  render();
}

async function resumeGame(gameId) {
  const gameToResume = findGameById(gameId);
  if (!gameToResume) {
    return;
  }

  clearFinishedRoundNoteAutosave();
  const snapshot = snapshotAppState();

  try {
    state.menu = null;
    state.data.history = appendCurrentGameToHistory(
      state.data.history.filter((game) => game.id !== gameId),
      state.data.currentGame
    );
    state.data.currentGame = gameToResume;
    state.draft.currentGamePlayerInput = "";
    if (state.data.currentGame && !state.data.currentGame.isFinished) {
      resetLiveRoundDraft(state.data.currentGame);
    } else {
      ensureRoundDraft(state.data.currentGame);
    }
    state.route = "current-game";
    window.location.hash = "current-game";
    render();

    const payload = await api(`/api/game/${encodeURIComponent(gameId)}/resume`, { method: "POST" });

    state.data.currentGame = payload.game || state.data.currentGame;
    if (payload.history) {
      state.data.history = payload.history;
    }
    if (state.data.currentGame && !state.data.currentGame.isFinished) {
      resetLiveRoundDraft(state.data.currentGame);
    } else {
      ensureRoundDraft(state.data.currentGame);
    }
    showToast(t("toast.gameResumed"));
    render();
  } catch (error) {
    restoreAppState(snapshot);
    showToast(error.message, true);
    render();
  }
}

async function archiveCurrentGame({ force = false } = {}) {
  const currentGame = state.data.currentGame;
  if (!currentGame) {
    return;
  }

  if (!force && !currentGame.isFinished) {
    openArchiveConfirmModal();
    return;
  }

  clearFinishedRoundNoteAutosave();
  const snapshot = snapshotAppState();

  try {
    state.menu = null;
    state.confirmArchiveOpen = false;
    state.data.history = appendCurrentGameToHistory(state.data.history, currentGame);
    state.data.currentGame = null;
    ensureRoundDraft(state.data.currentGame);
    state.route = "home";
    window.location.hash = "home";
    render();

    const payload = await api("/api/game", { method: "DELETE" });

    state.data.currentGame = payload.game || null;
    state.data.history = payload.history || state.data.history;
    ensureRoundDraft(state.data.currentGame);
    showToast(t("toast.gameArchived"));
    render();
  } catch (error) {
    restoreAppState(snapshot);
    showToast(error.message, true);
    render();
  }
}

async function deleteArchivedGame(gameId) {
  clearFinishedRoundNoteAutosave();
  const snapshot = snapshotAppState();

  try {
    state.menu = null;
    state.data.history = state.data.history.filter((game) => game.id !== gameId);
    render();

    const payload = await api(`/api/history/${encodeURIComponent(gameId)}`, { method: "DELETE" });

    state.data.history = payload.history || [];
    state.menu = null;
    showToast(t("toast.gameDeleted"));
    render();
  } catch (error) {
    restoreAppState(snapshot);
    showToast(error.message, true);
    render();
  }
}

async function saveRound() {
  return commitRoundDraft("new", { force: true });
}

function wireGlobalEvents() {
  window.addEventListener("hashchange", syncRouteFromHash);
  window.addEventListener("resize", () => {
    if (state.menu) {
      state.menu = null;
      render();
    }
  });

  elements.menuButton.addEventListener("click", () => {
    state.drawerOpen ? closeDrawer() : openDrawer();
  });

  elements.appBackdrop.addEventListener("click", () => {
    state.drawerOpen = false;
    state.menu = null;
    state.confirmNextRoundOpen = false;
    state.confirmArchiveOpen = false;
    render();
  });

  elements.drawer.addEventListener("click", (event) => {
    const routeButton = event.target.closest("[data-route]");
    if (!routeButton) {
      return;
    }

    setRoute(routeButton.dataset.route);
  });

  elements.roundConfirmContinue.addEventListener("click", () => {
    closeConfirmModal();
    focusCurrentScoreInput();
  });

  elements.roundConfirmCancel.addEventListener("click", () => {
    closeConfirmModal();
  });

  elements.roundConfirmModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.classList.contains("modal-backdrop")) {
      closeConfirmModal();
    }
  });

  elements.archiveConfirmContinue.addEventListener("click", async () => {
    closeArchiveConfirmModal();
    await archiveCurrentGame({ force: true });
  });

  elements.archiveConfirmCancel.addEventListener("click", () => {
    closeArchiveConfirmModal();
  });

  elements.archiveConfirmModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.classList.contains("modal-backdrop")) {
      closeArchiveConfirmModal();
    }
  });

  elements.celebrationSuddenDeath.addEventListener("click", async () => {
    await startSuddenDeathFromCelebration();
  });

  elements.celebrationKeepTied.addEventListener("click", () => {
    hideCelebration();
  });

  elements.toast.addEventListener("pointerdown", hideToast);
  elements.toast.addEventListener("click", hideToast);

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest(".home-history-actions")) {
      return;
    }

    const item = target.closest("[data-swipe-delete-card]");
    if (!(item instanceof HTMLElement)) {
      return;
    }

    beginHomeSwipe(item, event);
  });

  document.addEventListener("pointermove", (event) => {
    moveHomeSwipe(event);
  });

  document.addEventListener("pointerup", (event) => {
    endHomeSwipe(event);
  });

  document.addEventListener("pointercancel", (event) => {
    endHomeSwipe(event);
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (form.id === "new-game-form") {
      event.preventDefault();
      await startGame();
    } else if (form.id === "current-game-form") {
      event.preventDefault();
      await saveRound();
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.id === "new-game-title") {
      state.draft.newGame.title = target.value;
    } else if (target.id === "new-player-input") {
      state.draft.newGame.playerInput = target.value;
    } else if (target.id === "new-game-mode") {
      setNewGameMode(target.value);
    } else if (target.id === "new-game-winning-score") {
      state.draft.newGame.winningScore = target.value;
    } else if (target.id === "current-player-input") {
      state.draft.currentGamePlayerInput = target.value;
    } else if (target.id === "current-player-rename-input") {
      state.draft.currentGameRenameInput = target.value;
    } else if (target.matches("[data-scan-score-player-id]")) {
      const playerId = target.dataset.scanScorePlayerId;
      const entry = playerId ? getScanEntry(playerId) : null;
      const value = target.value.trim();
      const score = Number(value);
      if (entry) {
        entry.manualValue = value;
        if (value.length && Number.isFinite(score)) {
          clearScanTimers({ players: { [playerId]: entry } });
          entry.status = "manual";
          entry.score = score;
          entry.tokens = [];
          entry.confidence = null;
          entry.note = t("current.scanRound.manualStatus");
        }
      }
    } else if (target.matches("[data-scan-current-manual]")) {
      if (state.draft.scanRound) {
        state.draft.scanRound.manualInput = target.value;
      }
    } else if (target.matches('#current-game-form input[data-player-id]')) {
      const playerId = target.dataset.playerId;
      if (playerId) {
        state.draft.roundScores[playerId] = target.value;
        if (state.data.currentGame) {
          cacheRoundDraft(state.data.currentGame);
          syncCurrentGameCardPickerState(state.data.currentGame, playerId);
          updateCurrentGameLiveScorePreview();
        }
      }
    } else if (target.id === "round-note") {
      state.draft.roundNote = target.value;
      if (state.data.currentGame) {
        cacheRoundDraft(state.data.currentGame);
        if (state.data.currentGame.isFinished) {
          queueFinishedRoundNoteSave();
        }
      }
    } else if (
      target.id === "settings-winning-score" ||
      target.id === "settings-theme" ||
      target.id === "settings-language"
    ) {
      updateSettingsFromControls(false);
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.id === "stats-scope") {
      state.draft.statsScope = target.value === "all" || target.value === "pick" ? target.value : "current";
      if (state.draft.statsScope !== "pick") {
        state.draft.statsGameId = "";
      }
      render();
      return;
    }

    if (target.id === "new-game-mode") {
      setNewGameMode(target.value);
      render();
      return;
    }

    if (target.id === "stats-game-id") {
      state.draft.statsGameId = target.value;
      render();
      return;
    }

    if (target.id === "settings-winning-score" || target.id === "settings-theme" || target.id === "settings-language") {
      updateSettingsFromControls();
      return;
    }

    if (target.matches("[data-scan-file-capture]") && target instanceof HTMLInputElement) {
      const file = target.files?.[0];
      target.value = "";
      if (file) {
        readScanFileCapture(file);
      }
      return;
    }

    if (target.matches("[data-scan-score-player-id]")) {
      render();
    }
  });

  document.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.id === "round-note" && state.data.currentGame?.isFinished) {
      queueFinishedRoundNoteSave();
    }
  });

  document.addEventListener("keydown", async (event) => {
    if (event.key === "Escape" && (state.confirmNextRoundOpen || state.confirmArchiveOpen)) {
      closeConfirmModal();
      closeArchiveConfirmModal();
      return;
    }

    const target = event.target;

    if (target instanceof HTMLInputElement && target.id === "new-player-input" && (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      addDraftPlayer();
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.id === "current-player-input" &&
      (event.key === "Enter" || event.key === "Tab")
    ) {
      event.preventDefault();
      await addCurrentGamePlayer();
      return;
    }

    if (target instanceof HTMLInputElement && target.id === "current-player-rename-input") {
      if (event.key === "Enter") {
        event.preventDefault();
        const playerId = target.dataset.playerId;
        if (playerId) {
          await saveCurrentGamePlayerRename(playerId, target.value);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelCurrentGamePlayerRename();
        return;
      }
    }

    if (
      target instanceof HTMLInputElement &&
      target.matches('#current-game-form input[data-player-id]') &&
      (event.key === "Enter" || event.key === "Tab")
    ) {
      event.preventDefault();
      if (!focusNextCurrentScoreInput(target)) {
        target.blur();
      }
    }
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const swipeActions = target.closest(".home-history-actions");
    if (swipeActions instanceof HTMLElement) {
      const swipeCard = swipeActions.closest("[data-swipe-delete-card]");
      const gameId = swipeCard?.dataset.gameCard;
      const swipeMode = swipeCard?.dataset.swipeMode;
      if (gameId) {
        clearHomeSwipeState();
        if (swipeMode === "recent") {
          hideRecentGame(gameId);
        } else {
          await deleteArchivedGame(gameId);
        }
        return;
      }
    }

    const actionTarget = target.closest("[data-action]");
    if (actionTarget) {
      const action = actionTarget.dataset.action;
      const gameId = actionTarget.dataset.gameId;
      const playerIndex = Number(actionTarget.dataset.playerIndex);
      const swipeCard = actionTarget.closest("[data-swipe-delete-card]");
      const game = state.data.currentGame;
      const canUseCardMode = Boolean(game && !game.isFinished && isClassicCardModeGame(game) && state.draft.scoreInputMode === SCORE_INPUT_MODES.cards);
      const scoreInputMode = state.draft.scoreInputMode;
      const currentCardPickerPlayerId = state.draft.cardPickerPlayerId;
      const activePlayers = game ? getActiveGamePlayers(game) : [];

      if (
        gameId &&
        state.homeSwipeSuppressClickId === gameId &&
        action !== "remove-home-game" &&
        action !== "delete-game" &&
        !(swipeCard instanceof HTMLElement && swipeCard.classList.contains("revealed"))
      ) {
        state.homeSwipeSuppressClickId = null;
        return;
      }

      if (action === "go-new-game") {
        setRoute("new-game");
      } else if (action === "retry-load") {
        state.systemError = null;
        render();
        await refresh();
      } else if (action === "go-existing-games") {
        setRoute("existing-games");
      } else if (action === "go-current-game") {
        setRoute("current-game");
      } else if (action === "move-round" && actionTarget.dataset.direction) {
        const game = state.data.currentGame;
        if (!game) {
          return;
        }

        const cursor = getRoundNavigatorState(game);
        const targetRoundKey =
          actionTarget.dataset.direction === "prev" ? cursor.prevKey : cursor.nextKey;

        if (targetRoundKey) {
          await navigateToRound(targetRoundKey);
        }
      } else if (action === "select-round" && actionTarget.dataset.roundKey) {
        await navigateToRound(actionTarget.dataset.roundKey);
      } else if (action === "open-home-game" && gameId) {
        if (swipeCard instanceof HTMLElement && swipeCard.classList.contains("revealed")) {
          clearHomeSwipeState();
          return;
        }
        await openGameFromList(gameId);
      } else if (action === "set-new-game-mode" && actionTarget.dataset.mode) {
        state.draft.newGame.gameMode = actionTarget.dataset.mode;
        state.draft.newGame.scoreInputMode =
          state.draft.newGame.gameMode === "classic"
            ? normalizeScoreInputMode(state.settings.defaultScoreInputMode)
            : SCORE_INPUT_MODES.manual;
        render();
      } else if (action === "set-new-game-input-mode" && actionTarget.dataset.mode) {
        if (state.draft.newGame.gameMode !== "classic") {
          return;
        }

        state.draft.newGame.scoreInputMode =
          actionTarget.dataset.mode === SCORE_INPUT_MODES.cards ? SCORE_INPUT_MODES.cards : SCORE_INPUT_MODES.manual;
        render();
      } else if (action === "set-settings-input-mode" && actionTarget.dataset.mode) {
        state.settings.defaultScoreInputMode =
          actionTarget.dataset.mode === SCORE_INPUT_MODES.cards ? SCORE_INPUT_MODES.cards : SCORE_INPUT_MODES.manual;
        saveSettings();
        render();
      } else if (action === "add-player") {
        addDraftPlayer();
      } else if (action === "remove-player") {
        removeDraftPlayer(playerIndex);
      } else if (action === "add-current-player") {
        await addCurrentGamePlayer();
      } else if (action === "restore-current-player" && actionTarget.dataset.playerName) {
        await addCurrentGamePlayer(actionTarget.dataset.playerName);
      } else if (action === "edit-current-player" && actionTarget.dataset.playerId) {
        await startCurrentGamePlayerRename(actionTarget.dataset.playerId);
      } else if (action === "save-current-player-name" && actionTarget.dataset.playerId) {
        await saveCurrentGamePlayerRename(actionTarget.dataset.playerId);
      } else if (action === "cancel-current-player-rename") {
        cancelCurrentGamePlayerRename();
      } else if (action === "remove-current-player" && actionTarget.dataset.playerId) {
        await removeCurrentGamePlayer(actionTarget.dataset.playerId);
      } else if (action === "start-scan-round") {
        startScanRound();
      } else if (action === "cancel-scan-round") {
        cancelScanRound();
      } else if (action === "scan-capture") {
        openScanFileCapture();
      } else if (action === "scan-skip") {
        skipCurrentScanPlayer();
      } else if (action === "scan-manual-current") {
        enterManualForCurrentScanPlayer();
      } else if (action === "scan-save-manual-current") {
        const player = getCurrentScanPlayer(state.data.currentGame);
        if (!player || !state.draft.scanRound) {
          return;
        }

        if (!setScanManualScore(player.id, state.draft.scanRound.manualInput, { advance: true })) {
          showToast(t("current.scanRound.manualInvalid"), true);
        }
      } else if (action === "scan-cancel-manual-current") {
        if (state.draft.scanRound) {
          state.draft.scanRound.manualPlayerId = null;
          state.draft.scanRound.manualInput = "";
          render();
        }
      } else if (action === "scan-confirm-round") {
        await confirmScanRound();
      } else if (action === "scan-summary-capture" && actionTarget.dataset.playerId) {
        captureSummaryPlayer(actionTarget.dataset.playerId);
      } else if (action === "scan-summary-rescan" && actionTarget.dataset.playerId) {
        rescanSummaryPlayer(actionTarget.dataset.playerId);
      } else if (action === "scan-summary-retake" && actionTarget.dataset.playerId) {
        retakeSummaryPlayer(actionTarget.dataset.playerId);
      } else if (action === "scan-summary-manual-cards" && actionTarget.dataset.playerId) {
        openScanManualCards(actionTarget.dataset.playerId);
      } else if (action === "scan-summary-toggle-card" && actionTarget.dataset.playerId && actionTarget.dataset.cardToken) {
        toggleScanManualCardSelection(actionTarget.dataset.playerId, actionTarget.dataset.cardToken);
      } else if (action === "scan-summary-clear-cards" && actionTarget.dataset.playerId) {
        clearScanManualCardSelection(actionTarget.dataset.playerId);
      } else if (action === "scan-summary-close-cards") {
        closeScanManualCards();
      } else if (action === "scan-summary-toggle-menu" && actionTarget.dataset.playerId) {
        toggleScanSummaryMenu(actionTarget.dataset.playerId);
      } else if (action === "set-current-order" && actionTarget.dataset.order) {
        state.draft.currentGameOrder = actionTarget.dataset.order === "leader" ? "leader" : "entered";
        render();
      } else if (action === "move-card-player" && actionTarget.dataset.direction) {
        if (!canUseCardMode || scoreInputMode !== SCORE_INPUT_MODES.cards) {
          return;
        }

        const navigator = getCardPickerNavigatorState(game);
        const targetPlayerId =
          actionTarget.dataset.direction === "prev" ? navigator.previousPlayerId : navigator.nextPlayerId;
        if (!targetPlayerId) {
          return;
        }

        state.draft.cardPickerPlayerId = targetPlayerId;
        if (state.data.currentGame) {
          cacheRoundDraft(state.data.currentGame);
        }
        render();
      } else if (action === "set-score-input-mode" && actionTarget.dataset.mode) {
        if (!canUseCardMode) {
          return;
        }

        state.draft.scoreInputMode =
          actionTarget.dataset.mode === SCORE_INPUT_MODES.cards ? SCORE_INPUT_MODES.cards : SCORE_INPUT_MODES.manual;
        if (state.draft.scoreInputMode === SCORE_INPUT_MODES.cards) {
          state.draft.cardPickerPlayerId = currentCardPickerPlayerId || activePlayers[0]?.id || null;
        } else {
          state.draft.cardPickerPlayerId = null;
        }
        if (state.data.currentGame) {
          cacheRoundDraft(state.data.currentGame);
        }
        render();
        if (state.draft.scoreInputMode === SCORE_INPUT_MODES.cards) {
          focusCurrentScoreInput();
        }
      } else if (action === "toggle-card-picker" && actionTarget.dataset.playerId) {
        if (!canUseCardMode || scoreInputMode !== SCORE_INPUT_MODES.cards) {
          return;
        }

        const nextPlayerId = actionTarget.dataset.playerId;
        state.draft.cardPickerPlayerId = state.draft.cardPickerPlayerId === nextPlayerId ? null : nextPlayerId;
        if (state.data.currentGame) {
          cacheRoundDraft(state.data.currentGame);
        }
        render();
      } else if (action === "toggle-card-selection" && actionTarget.dataset.playerId && actionTarget.dataset.cardToken) {
        if (!canUseCardMode || scoreInputMode !== SCORE_INPUT_MODES.cards) {
          return;
        }

        const playerId = actionTarget.dataset.playerId;
        const token = actionTarget.dataset.cardToken;
        const nextStats = toggleRoundCardSelection(game, playerId, token);
        state.draft.cardPickerPlayerId = playerId;
        if (nextStats) {
          syncCurrentGameCardPickerState(game, playerId);
        }
      } else if (action === "clear-card-selection" && actionTarget.dataset.playerId) {
        if (!canUseCardMode || scoreInputMode !== SCORE_INPUT_MODES.cards) {
          return;
        }

        const playerId = actionTarget.dataset.playerId;
        clearRoundCardSelection(game, playerId);
        state.draft.roundScores = {
          ...state.draft.roundScores,
          [playerId]: ""
        };
        state.draft.cardPickerPlayerId = playerId;
        syncCurrentGameCardPickerState(game, playerId);
      } else if (action === "resume-game" && gameId) {
        if (swipeCard instanceof HTMLElement && swipeCard.classList.contains("revealed")) {
          clearHomeSwipeState();
          return;
        }
        await resumeGame(gameId);
      } else if (action === "archive-game") {
        if (gameId && state.data.currentGame?.id !== gameId) {
          // menu action from archived items is handled by delete/resume only
          return;
        }
        await archiveCurrentGame();
      } else if (action === "delete-game" && gameId) {
        await deleteArchivedGame(gameId);
      } else if (action === "open-game-menu" && gameId) {
        openMenu(gameId, actionTarget);
      } else if (action === "archive-current") {
        await archiveCurrentGame();
      } else if (action === "play-again") {
        playAgain();
      } else if (action === "remove-home-game" && gameId) {
        hideRecentGame(gameId);
      } else if (action === "reset-prefs") {
        resetPreferences();
      } else if (action === "resume-current") {
        setRoute("current-game");
      }
      return;
    }

    const scanRound = state.draft.scanRound;
    const scanRow = target.closest(".scan-summary-row");
    const scanMenu = target.closest(".scan-summary-actions");
    const scanManualPanel = target.closest(".scan-summary-manual-panel");
    const interactiveWithinRow = target.closest("button, input, select, textarea, label, a");
    if (scanRound?.step === "summary") {
      if (
        scanRound.manualCardsPlayerId &&
        !scanManualPanel &&
        (!scanRow || scanRow.dataset.playerId !== scanRound.manualCardsPlayerId)
      ) {
        closeScanManualCards();
        return;
      }

      if (scanRound.summaryMenuPlayerId && !scanMenu && !scanRow) {
        closeScanSummaryMenu();
        return;
      }

      if (!actionTarget && scanRow && !interactiveWithinRow && scanRow.classList.contains("has-actions")) {
        const playerId = scanRow.dataset.playerId;
        if (playerId) {
          toggleScanSummaryMenu(playerId);
          return;
        }
      }
    }

    const gameCard = target.closest("[data-game-card]");
    if (gameCard && !target.closest(".menu-popover")) {
      const gameId = gameCard.dataset.gameCard;
      if (!gameId) {
        return;
      }

      const swipeCard = target.closest("[data-swipe-delete-card]");
      if (swipeCard instanceof HTMLElement && swipeCard.classList.contains("revealed")) {
        clearHomeSwipeState();
        return;
      }

      if (state.homeSwipeSuppressClickId === gameId) {
        state.homeSwipeSuppressClickId = null;
        return;
      }

      await openGameFromList(gameId);
      return;
    }

    const menuAction = target.closest(".menu-action");
    if (menuAction) {
      const action = menuAction.dataset.action;
      const gameId = menuAction.dataset.gameId || state.menu?.gameId;
      closeMenu();
      if (action === "archive-game") {
        await archiveCurrentGame();
      } else if (action === "resume-game" && gameId) {
        await resumeGame(gameId);
      } else if (action === "delete-game" && gameId) {
        await deleteArchivedGame(gameId);
      }
      return;
    }

    if (target.closest("#game-menu")) {
      return;
    }

    if (state.menu) {
      closeMenu();
    }
  });
}

function initSettingsWatchers() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", () => {
    if (state.settings.theme === "system") {
      applyPreferences();
      render();
    }
  });
}

async function bootstrap() {
  await initI18n();
  preloadFlip7CardArt();
  render();
  wireGlobalEvents();
  initSettingsWatchers();
  refresh().catch((error) => {
    state.loading = false;
    state.systemError = error.message;
    render();
  });
}

bootstrap().catch((error) => {
  state.loading = false;
  state.systemError = error.message;
  render();
});
