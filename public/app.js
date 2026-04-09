const STORAGE_KEY = "flip7-preferences";
const DEFAULT_SETTINGS = {
  theme: "system",
  language: "en",
  defaultWinningScore: 200,
  confirmBeforeNextRound: false
};

const TRANSLATIONS = {
  en: {
    app: {
      title: "Flip 7 Scorekeeper",
      brandPrimary: "Flip 7",
      brandSecondary: "Scorekeeper"
    },
    nav: {
      home: "Home",
      currentGame: "Current Game",
      stats: "Stats",
      settings: "Settings",
      openMenu: "Open menu"
    },
    common: {
      players: "players",
      player: "player",
      rounds: "rounds",
      round: "round",
      points: "points",
      add: "Add",
      continue: "Continue",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      archive: "Archive",
      resume: "Continue",
      current: "Current",
      finished: "Finished",
      archived: "Archived",
      currentGame: "Current game",
      noGame: "No game on the table yet.",
      open: "Open",
      reset: "Reset",
      loading: "Loading..."
    },
    modes: {
      classic: "Flip 7 Classic",
      vengeance: "Flip 7: With a Vengeance",
      mixed: "Mixed / Custom"
    },
    statuses: {
      inProgress: "In progress",
      finished: "Finished",
      archived: "Archived"
    },
    home: {
      eyebrow: "Flip 7",
      title: "A score table with a bit more spark.",
      lead: "Start a fresh game or jump back into a recent one.",
      startFresh: "Start a game",
      selectExisting: "Browse games",
      continueCurrent: "Jump back in",
      activeGameLabel: "Live table",
      noActiveGame: "No live table right now.",
      recentGames: "Recent games"
    },
    newGame: {
      eyebrow: "Set the table",
      title: "Deal a new game",
      lead: "Pick a mode, add players, and get rolling fast.",
      titleLabel: "Table name (optional)",
      titlePlaceholder: "Friday showdown",
      modeLabel: "Deck / mode",
      winningScoreLabel: "Target score for this game",
      playersLabel: "Players at the table",
      playerPlaceholder: "Type a player name",
      playerHelp: "Press Enter or Next to add each player quickly.",
      addedPlayers: "Players on deck",
      startGame: "Deal the game",
      defaultWinningScore: "Default target: win on 200.",
      noPlayersYet: "No players yet.",
      duplicatePlayer: "That player is already in."
    },
    existing: {
      eyebrow: "Game stash",
      title: "Jump back in",
      lead: "Tap a game to open it again. Swipe or use the menu to clear one out.",
      currentSection: "Live game",
      savedSection: "Game stash",
      continueCard: "Jump back in",
      resumeCard: "Jump back in",
      archiveCard: "Tuck away",
      deleteCard: "Remove",
      lastPlayed: "Last played",
      playersLabel: ({ count }) => `${count} ${count === 1 ? "player" : "players"}`,
      roundsLabel: ({ count }) => `${count} ${count === 1 ? "round" : "rounds"}`,
      noGames: "No saved games yet. Start one first."
    },
    current: {
      eyebrow: "Live table",
      title: "Play the round",
      lead: "Enter scores, hit next round, and keep the table moving.",
      noGame: "No live table yet.",
      winningScore: "Target",
      roundScores: "Round scores",
      gameDetails: "Game details & note",
      orderBy: "Order",
      enteredOrder: "Entered",
      leaderFirst: "Leader first",
      roundNumber: "Round {{count}}",
      roundNote: "Round note (optional)",
      saveRound: "Next round",
      archiveGame: "Tuck away game",
      newGame: "Start a game",
      playAgain: "Play again",
      confirmTitle: "Continue to the next round?",
      finishedTitle: "Game over",
      finishedLead: "Someone hit the target.",
      winnerLabel: "Winner",
      askContinue: "Nobody has hit the target yet. Start another round anyway?",
      continueNextRound: "Continue to next round",
      currentTotals: "Current totals",
      leaderboardLabel: "Table"
    },
    stats: {
      eyebrow: "Stats",
      title: "Score story",
      lead: "A quick look at the live game or the latest finished one.",
      noStats: "Start or resume a game to see the numbers.",
      leader: "Front runner",
      highestSingleScore: "Highest single score",
      lowestSingleScore: "Lowest single score",
      totalRounds: "Total rounds",
      averageRound: "Average round",
      highestRoundTotal: "Highest round total",
      lowestRoundTotal: "Lowest round total",
      perPlayerTotals: "Per-player totals",
      roundHistory: "Round history",
      winner: "Winner",
      roundTotal: "Round total"
    },
    settings: {
      eyebrow: "Settings",
      title: "Table settings",
      lead: "Set your defaults and keep the game moving.",
      defaultWinningScore: "Default target score",
      askBeforeNextRound: "Ask before moving on if nobody has won",
      theme: "Theme",
      language: "Language",
      light: "Light",
      dark: "Dark",
      system: "System",
      english: "English",
      swedish: "Svenska",
      resetPrefs: "Reset table settings",
      keepNote: "New games keep their own target score."
    },
    celebration: {
      title: "Winner!"
    },
    toast: {
      gameStarted: "Game on.",
      playerAdded: "Player added.",
      playerRemoved: "Player removed.",
      roundSaved: "Round locked in.",
      gameFinished: "Game over.",
      gameArchived: "Game tucked away.",
      gameResumed: "Game reopened.",
      gameDeleted: "Saved game removed.",
      preferencesReset: "Table settings reset."
    }
  },
  sv: {
    app: {
      title: "Flip 7 Poängräknare",
      brandPrimary: "Flip 7",
      brandSecondary: "Poängräknare"
    },
    nav: {
      home: "Hem",
      currentGame: "Pågående spel",
      stats: "Statistik",
      settings: "Inställningar",
      openMenu: "Öppna meny"
    },
    common: {
      players: "spelare",
      player: "spelare",
      rounds: "omgångar",
      round: "omgång",
      points: "poäng",
      add: "Lägg till",
      continue: "Fortsätt",
      cancel: "Avbryt",
      save: "Spara",
      delete: "Ta bort",
      archive: "Arkivera",
      resume: "Fortsätt",
      current: "Pågående",
      finished: "Avslutat",
      archived: "Arkiverat",
      currentGame: "Pågående spel",
      noGame: "Inget spel vid bordet ännu.",
      open: "Öppna",
      reset: "Återställ",
      loading: "Laddar..."
    },
    modes: {
      classic: "Flip 7 Classic",
      vengeance: "Flip 7: With a Vengeance",
      mixed: "Blandat / Eget"
    },
    statuses: {
      inProgress: "Pågående",
      finished: "Avslutat",
      archived: "Arkiverat"
    },
    home: {
      eyebrow: "Flip 7",
      title: "Ett poängbord med lite mer spelglädje.",
      lead: "Starta ett nytt spel eller hoppa tillbaka till ett nyligt.",
      startFresh: "Starta ett spel",
      selectExisting: "Bläddra spel",
      continueCurrent: "Hoppa in igen",
      activeGameLabel: "Livebord",
      noActiveGame: "Inget livebord just nu.",
      recentGames: "Nyliga spel"
    },
    newGame: {
      eyebrow: "Ställ bordet",
      title: "Dela ut ett nytt spel",
      lead: "Välj läge, lägg till spelare och kör igång snabbt.",
      titleLabel: "Bordets namn (valfritt)",
      titlePlaceholder: "Fredagsduellen",
      modeLabel: "Deck / läge",
      winningScoreLabel: "Målpoäng för detta spel",
      playersLabel: "Spelare vid bordet",
      playerPlaceholder: "Skriv en spelare",
      playerHelp: "Tryck Enter eller Next för att lägga till varje spelare snabbt.",
      addedPlayers: "Spelare i kön",
      startGame: "Dela spelet",
      defaultWinningScore: "Standardmål: vinn på 200.",
      noPlayersYet: "Inga spelare ännu.",
      duplicatePlayer: "Den spelaren finns redan."
    },
    existing: {
      eyebrow: "Spelarkiv",
      title: "Hoppa in igen",
      lead: "Tryck på ett spel för att öppna det igen. Svep eller använd menyn för att rensa bort ett.",
      currentSection: "Live spel",
      savedSection: "Spelarkiv",
      continueCard: "Hoppa in igen",
      resumeCard: "Hoppa in igen",
      archiveCard: "Lägg undan",
      deleteCard: "Ta bort",
      lastPlayed: "Senast spelat",
      playersLabel: ({ count }) => `${count} spelare`,
      roundsLabel: ({ count }) => `${count} ${count === 1 ? "omgång" : "omgångar"}`,
      noGames: "Inga sparade spel ännu. Starta ett först."
    },
    current: {
      eyebrow: "Livebord",
      title: "Spela rundan",
      lead: "Skriv in poäng, gå vidare till nästa runda och håll spelet i gång.",
      noGame: "Inget livebord ännu.",
      winningScore: "Mål",
      roundScores: "Omgångspoäng",
      gameDetails: "Speldetaljer & anteckning",
      orderBy: "Ordning",
      enteredOrder: "Inmatad ordning",
      leaderFirst: "Ledaren först",
      roundNumber: "Omgång {{count}}",
      roundNote: "Anteckning för rundan (valfri)",
      saveRound: "Nästa omgång",
      archiveGame: "Lägg undan spel",
      newGame: "Starta ett spel",
      playAgain: "Spela igen",
      confirmTitle: "Fortsätt till nästa omgång?",
      finishedTitle: "Spelet är slut",
      finishedLead: "Någon nådde målet.",
      winnerLabel: "Vinnare",
      askContinue: "Ingen har nått målet ännu. Vill du köra en runda till ändå?",
      continueNextRound: "Fortsätt till nästa omgång",
      currentTotals: "Nuvarande totalsummor",
      leaderboardLabel: "Tabell"
    },
    stats: {
      eyebrow: "Statistik",
      title: "Poängberättelse",
      lead: "En snabb blick på det aktiva spelet eller det senaste avslutade.",
      noStats: "Starta eller fortsätt ett spel för att se siffrorna.",
      leader: "Först",
      highestSingleScore: "Högsta enskilda poäng",
      lowestSingleScore: "Lägsta enskilda poäng",
      totalRounds: "Totalt antal omgångar",
      averageRound: "Genomsnitt per omgång",
      highestRoundTotal: "Högsta omgångssumma",
      lowestRoundTotal: "Lägsta omgångssumma",
      perPlayerTotals: "Totalsumma per spelare",
      roundHistory: "Omgångshistorik",
      winner: "Vinnare",
      roundTotal: "Omgångssumma"
    },
    settings: {
      eyebrow: "Inställningar",
      title: "Bordets inställningar",
      lead: "Ställ in dina standarder och håll spelet i gång.",
      defaultWinningScore: "Standardmål",
      askBeforeNextRound: "Fråga innan du går vidare om ingen har vunnit",
      theme: "Tema",
      language: "Språk",
      light: "Ljus",
      dark: "Mörk",
      system: "System",
      english: "Engelska",
      swedish: "Svenska",
      resetPrefs: "Återställ bordets inställningar",
      keepNote: "Nya spel behåller sitt eget mål."
    },
    celebration: {
      title: "Vinnare!"
    },
    toast: {
      gameStarted: "Spelet är igång.",
      playerAdded: "Spelare tillagd.",
      playerRemoved: "Spelare borttagen.",
      roundSaved: "Rundan är låst.",
      gameFinished: "Spelet är slut.",
      gameArchived: "Spelet är undanlagt.",
      gameResumed: "Spelet är öppnat igen.",
      gameDeleted: "Sparat spel borttaget.",
      preferencesReset: "Bordets inställningar återställda."
    }
  }
};

const state = {
  route: getRouteFromHash(),
  drawerOpen: false,
  menu: null,
  confirmNextRoundOpen: false,
  data: {
    currentGame: null,
    history: []
  },
  settings: loadSettings(),
  draft: {
    newGame: {
      title: "",
      gameMode: "classic",
      winningScore: String(DEFAULT_SETTINGS.defaultWinningScore),
      playerInput: "",
      players: []
    },
    currentGameOrder: "entered",
    roundNote: "",
    roundScores: {}
  },
  homeSwipe: null,
  homeSwipeSuppressClickId: null,
  celebration: {
    rafId: null,
    timeoutId: null,
    burstTimers: []
  },
  loading: true
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
  celebration: document.querySelector("#celebration"),
  celebrationCanvas: document.querySelector("#celebration-canvas"),
  celebrationTitle: document.querySelector("#celebration-title"),
  celebrationName: document.querySelector("#celebration-name"),
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

function loadSettings() {
  const preferredLanguage = getPreferredLanguage();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return getDefaultSettings(preferredLanguage);
    }

    const storedLanguage = parsed.language === "sv" || parsed.language === "en" ? parsed.language : null;

    return {
      theme: parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
        ? parsed.theme
        : DEFAULT_SETTINGS.theme,
      language: storedLanguage || preferredLanguage,
      defaultWinningScore:
        Number.isFinite(Number(parsed.defaultWinningScore)) && Number(parsed.defaultWinningScore) > 0
          ? Number(parsed.defaultWinningScore)
          : DEFAULT_SETTINGS.defaultWinningScore,
      confirmBeforeNextRound:
        typeof parsed.confirmBeforeNextRound === "boolean"
          ? parsed.confirmBeforeNextRound
          : DEFAULT_SETTINGS.confirmBeforeNextRound
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

  return languages.some((language) => language.startsWith("sv")) ? "sv" : "en";
}

function getDefaultSettings(language = getPreferredLanguage()) {
  return {
    ...DEFAULT_SETTINGS,
    language
  };
}

function t(path, vars = {}) {
  const parts = path.split(".");
  let current = TRANSLATIONS[state.settings.language];

  for (const part of parts) {
    current = current?.[part];
  }

  const fallbackParts = path.split(".");
  let fallback = TRANSLATIONS.en;
  for (const part of fallbackParts) {
    fallback = fallback?.[part];
  }

  const value = typeof current === "undefined" ? fallback : current;
  const text = typeof value === "function" ? value(vars) : String(value ?? path);

  return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(vars[key] ?? ""));
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

function pluralLabel(count, singular, plural) {
  return count === 1 ? singular : plural;
}

function gameModeLabel(mode) {
  return t(`modes.${mode}`);
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
  if (!game) {
    return [];
  }

  const totals = Object.fromEntries(game.players.map((player) => [player.id, 0]));

  for (const round of game.rounds || []) {
    for (const score of round.scores || []) {
      totals[score.playerId] = (totals[score.playerId] || 0) + score.points;
    }
  }

  return game.players
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      total: totals[player.id] || 0
    }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
}

function getWinner(game) {
  if (!game) {
    return null;
  }

  const leaderboard = summarizeGame(game);
  const leader = leaderboard[0];
  if (!leader || leader.total < game.winningScore) {
    return null;
  }

  return {
    ...leader,
    threshold: game.winningScore
  };
}

function getActiveStatsGame() {
  return state.data.currentGame || state.data.history[0] || null;
}

function buildGameStats(game) {
  const scoreboard = summarizeGame(game);
  const rounds = game?.rounds || [];
  const roundTotals = rounds.map((round) =>
    round.scores.reduce((sum, score) => sum + score.points, 0)
  );
  const singleScores = rounds.flatMap((round) => round.scores.map((score) => score.points));
  const highestSingleScore = singleScores.length ? Math.max(...singleScores) : 0;
  const lowestSingleScore = singleScores.length ? Math.min(...singleScores) : 0;
  const highestRoundTotal = roundTotals.length ? Math.max(...roundTotals) : 0;
  const lowestRoundTotal = roundTotals.length ? Math.min(...roundTotals) : 0;
  const averageRoundTotal = roundTotals.length
    ? roundTotals.reduce((sum, value) => sum + value, 0) / roundTotals.length
    : 0;

  return {
    scoreboard,
    rounds,
    roundTotals,
    highestSingleScore,
    lowestSingleScore,
    highestRoundTotal,
    lowestRoundTotal,
    averageRoundTotal,
    leader: scoreboard[0] || null,
    winner: getWinner(game)
  };
}

function getCurrentGamePlayers(game) {
  const basePlayers = [...(game?.players || [])];
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

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong.");
  }

  return payload;
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

function setRoute(route, { replace = false } = {}) {
  state.route = route;
  state.drawerOpen = false;
  state.menu = null;
  state.confirmNextRoundOpen = false;

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

function ensureRoundDraft(game) {
  if (!game) {
    state.draft.roundScores = {};
    state.draft.roundNote = "";
    return;
  }

  const nextScores = {};
  for (const player of game.players) {
    nextScores[player.id] = Number.isFinite(Number(state.draft.roundScores[player.id]))
      ? Number(state.draft.roundScores[player.id])
      : 0;
  }

  state.draft.roundScores = nextScores;
}

function syncRouteFromHash() {
  state.route = getRouteFromHash();
  render();
}

async function refresh() {
  const payload = await api("/api/game", { method: "GET" });
  const previousGameId = state.data.currentGame?.id || null;

  state.data.currentGame = payload.game || null;
  state.data.history = payload.history || [];
  state.loading = false;

  if (state.data.currentGame?.id !== previousGameId) {
    ensureRoundDraft(state.data.currentGame);
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

  const drawerLinks = elements.drawer.querySelectorAll("[data-route]");
  drawerLinks.forEach((button) => {
    const route = button.dataset.route;
    if (route === "home") button.textContent = t("nav.home");
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
  const hasExistingGame = recentGames.length > 0;

  const mobileRecentGames =
    recentGames.length === 0
      ? ""
      : `
        <section class="stack home-history-section">
          <p class="eyebrow">${escapeHtml(t("home.recentGames"))}</p>
          <div class="home-history-list">
            ${recentGames
              .map((game) => {
                const modeLabel = game.gameMode ? gameModeLabel(game.gameMode) : "";
                return `
                  <button
                    class="home-history-item"
                    type="button"
                    data-game-card="${escapeHtml(game.id)}"
                    data-home-recent-card
                    data-home-current="${String(Boolean(currentGame && currentGame.id === game.id))}"
                  >
                    <div class="home-history-copy">
                      <strong class="home-history-title">${escapeHtml(game.title)}</strong>
                      <div class="home-history-meta">
                        <span>${escapeHtml(t("existing.playersLabel", { count: game.players.length }))}</span>
                        ${modeLabel ? `<span>${escapeHtml(modeLabel)}</span>` : ""}
                      </div>
                    </div>
                    <span class="home-history-time">${escapeHtml(formatDateTime(game.updatedAt))}</span>
                  </button>
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
        ${
          hasExistingGame
            ? `<button class="secondary-action home-secondary-action" type="button" data-action="go-existing-games">${escapeHtml(
                t("home.selectExisting")
              )}</button>`
            : ""
        }
      </div>
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
              <strong>${escapeHtml(currentGame.title)}</strong>
              <span class="game-card-meta">
                <span class="pill">${escapeHtml(gameModeLabel(currentGame.gameMode))}</span>
                <span>${escapeHtml(t("existing.playersLabel", { count: currentGame.players.length }))}</span>
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
          <input id="new-game-title" name="title" type="text" placeholder="${escapeHtml(
            t("newGame.titlePlaceholder")
          )}" value="${escapeHtml(draft.title)}" />
        </label>
        <div class="field">
          <span class="field-label">${escapeHtml(t("newGame.modeLabel"))}</span>
          <div class="new-game-mode-toggle" role="radiogroup" aria-label="${escapeHtml(
            t("newGame.modeLabel")
          )}">
            ${["classic", "vengeance", "mixed"]
              .map(
                (mode) => `
                  <button
                    type="button"
                    class="mode-option${draft.gameMode === mode ? " is-active" : ""}"
                    data-action="set-new-game-mode"
                    data-mode="${escapeHtml(mode)}"
                    aria-pressed="${draft.gameMode === mode ? "true" : "false"}"
                  >
                    ${escapeHtml(gameModeLabel(mode))}
                  </button>
                `
              )
              .join("")}
          </div>
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
  const statusPillClass = isFinished ? "pill-success" : current ? "" : "pill-muted";
  const menuAction = current ? "archive" : "delete";
  const menuLabel = current ? t("existing.archiveCard") : t("existing.deleteCard");
  const cardAction = current ? "go-current-game" : "resume-game";

  return `
    <article class="game-card ${current ? "game-card-active" : ""}" data-game-card="${escapeHtml(game.id)}">
      <div class="game-card-header">
        <div class="game-card-title">
          <strong>${escapeHtml(game.title)}</strong>
          <div class="game-card-meta">
            <span class="pill">${escapeHtml(gameModeLabel(game.gameMode))}</span>
            <span>${escapeHtml(t("existing.playersLabel", { count: game.players.length }))}</span>
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
          leader
            ? `<span>${escapeHtml(t("stats.leader"))}: ${escapeHtml(leader.name)} ${formatNumber(
                leader.total
              )} ${escapeHtml(t("common.points"))}</span>`
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

function renderCurrentGameScreen() {
  const game = state.data.currentGame;
  const hasSavedGames = state.data.history.length > 0;

  if (!game) {
    return `
      <section class="stack current-game-view">
        <p class="eyebrow">${escapeHtml(t("current.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(t("current.title"))}</h1>
        <p class="helper plain-copy">${escapeHtml(t("current.noGame"))}</p>
        <div class="hero-actions">
          <button class="primary-action" type="button" data-action="go-new-game">${escapeHtml(t("current.newGame"))}</button>
          ${
            hasSavedGames
              ? `<button class="secondary-action" type="button" data-action="go-existing-games">${escapeHtml(
                  t("home.selectExisting")
                )}</button>`
              : ""
          }
        </div>
      </section>
    `;
  }

  ensureRoundDraft(game);
  const leaderboard = summarizeGame(game);
  const winner = getWinner(game);
  const roundNumber = game.rounds.length + 1;
  const orderedPlayers = getCurrentGamePlayers(game);
  const compactMeta = [
    t("current.roundNumber", { count: roundNumber }),
    `${t("current.winningScore")} ${formatNumber(game.winningScore)}`,
    `${game.players.length} ${pluralLabel(game.players.length, t("common.player"), t("common.players"))}`
  ];
  if (winner) {
    compactMeta.push(`${t("current.winnerLabel")}: ${winner.name}`);
  }

  return `
    <section class="stack current-game-view">
      <div class="stack-tight current-game-header">
        <p class="eyebrow">${escapeHtml(t("current.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(game.title)}</h1>
        <div class="current-meta-line">
          ${compactMeta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
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
              >
                ${escapeHtml(t("current.enteredOrder"))}
              </button>
              <button
                class="${state.draft.currentGameOrder === "leader" ? "primary-action" : "secondary-action"}"
                type="button"
                data-action="set-current-order"
                data-order="leader"
              >
                ${escapeHtml(t("current.leaderFirst"))}
              </button>
            </div>
          </div>
        <div class="score-list">
            ${orderedPlayers
              .map((player, index) => {
                const total = leaderboard.find((entry) => entry.playerId === player.id)?.total ?? 0;
                const value = state.draft.roundScores[player.id] ?? 0;
                const nextHint = index < orderedPlayers.length - 1 ? "next" : "done";
                return `
                  <div class="score-row">
                    <label class="field">
                      <span class="player-name">${escapeHtml(player.name)}</span>
                      <span class="muted">${formatNumber(total)} ${escapeHtml(t("common.points"))}</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      inputmode="numeric"
                      enterkeyhint="${nextHint}"
                      data-player-id="${escapeHtml(player.id)}"
                      data-player-index="${index}"
                      value="${escapeHtml(value)}"
                      ${winner ? "disabled" : ""}
                    />
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
        <div class="sticky-actions">
          ${
            winner
              ? `<button class="primary-action" type="button" data-action="play-again">${escapeHtml(
                  t("current.playAgain")
                )}</button>`
              : `<button class="primary-action" type="submit">${escapeHtml(t("current.saveRound"))}</button>`
          }
        </div>
      </form>
      <details class="current-details">
        <summary>
          <span>${escapeHtml(t("current.gameDetails"))}</span>
          <span class="current-details-caret" aria-hidden="true">⌄</span>
        </summary>
        <div class="stack current-details-body">
          <label class="field current-details-note">
            <span class="field-label">${escapeHtml(t("current.roundNote"))}</span>
            <textarea id="round-note" class="round-note" placeholder="${escapeHtml(
              t("current.roundNote")
            )}">${escapeHtml(state.draft.roundNote)}</textarea>
          </label>
          <div class="top-summary-grid current-summary-grid">
            <div class="summary-block">
              <small class="muted">${escapeHtml(t("existing.roundsLabel", { count: game.rounds.length }))}</small>
              <strong>${formatNumber(game.rounds.length)}</strong>
            </div>
            <div class="summary-block">
              <small class="muted">${escapeHtml(t("existing.playersLabel", { count: game.players.length }))}</small>
              <strong>${formatNumber(game.players.length)}</strong>
            </div>
            <div class="summary-block">
              <small class="muted">${escapeHtml(t("current.winningScore"))}</small>
              <strong>${formatNumber(game.winningScore)}</strong>
            </div>
            <div class="summary-block">
              <small class="muted">${escapeHtml(t("current.roundNumber", { count: roundNumber }))}</small>
              <strong>${formatNumber(roundNumber)}</strong>
            </div>
          </div>
          <div class="state-banner">
            <strong>${escapeHtml(gameModeLabel(game.gameMode))}</strong>
            <span class="muted">${escapeHtml(
              winner ? `${t("current.finishedTitle")}: ${winner.name}` : t("current.lead")
            )}</span>
          </div>
          ${
            winner
              ? `
                <div class="state-banner">
                  <p class="eyebrow">${escapeHtml(t("current.winnerLabel"))}</p>
                  <strong>${escapeHtml(winner.name)}</strong>
                  <span>${formatNumber(winner.total)} ${escapeHtml(t("common.players"))}</span>
                  <span class="muted">${escapeHtml(t("current.finishedLead"))}</span>
                </div>
              `
              : ""
          }
          <div class="stack-tight">
            <strong>${escapeHtml(t("current.leaderboardLabel"))}</strong>
            <div class="stats-list">
              ${leaderboard
                .map(
                  (entry) => `
                    <div class="summary-block">
                      <div class="game-card-header">
                        <strong>${escapeHtml(game.players.find((player) => player.id === entry.playerId)?.name || entry.playerId)}</strong>
                        <span>${formatNumber(entry.total)}</span>
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      </details>
      <div class="current-secondary-actions">
        <button class="secondary-action" type="button" data-action="archive-current">${escapeHtml(
          t("current.archiveGame")
        )}</button>
        <button class="secondary-action" type="button" data-action="go-new-game">${escapeHtml(t("current.newGame"))}</button>
      </div>
    </section>
  `;
}

function renderStatsScreen() {
  const game = getActiveStatsGame();

  if (!game) {
    return `
      <section class="stack stats-view">
        <p class="eyebrow">${escapeHtml(t("stats.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(t("stats.title"))}</h1>
        <p class="helper plain-copy">${escapeHtml(t("stats.noStats"))}</p>
      </section>
    `;
  }

  const stats = buildGameStats(game);
  const roundSummaries = stats.rounds.map((round, index) => {
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
              return `${escapeHtml(playerName)}: ${formatNumber(score.points)}`;
            })
            .join(" • ")}
        </div>
      </article>
    `;
  });

  return `
    <section class="stack stats-view">
      <div class="stack-tight">
        <p class="eyebrow">${escapeHtml(t("stats.eyebrow"))}</p>
        <h1 class="screen-title">${escapeHtml(t("stats.title"))}</h1>
        <p class="screen-lead">${escapeHtml(t("stats.lead"))}</p>
      </div>
      <div class="top-summary-grid">
        <div class="summary-block">
          <small class="muted">${escapeHtml(t("stats.leader"))}</small>
          <strong>${escapeHtml(stats.leader?.name || "—")}</strong>
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
          <small class="muted">${escapeHtml(t("current.winningScore"))}</small>
          <strong>${formatNumber(game.winningScore)}</strong>
        </div>
      </div>
      ${
        stats.winner
          ? `
            <div class="state-banner">
              <p class="eyebrow">${escapeHtml(t("stats.winner"))}</p>
              <strong>${escapeHtml(stats.winner.name)}</strong>
              <span>${formatNumber(stats.winner.total)} ${escapeHtml(t("common.players"))}</span>
            </div>
          `
          : ""
      }
      <div class="stack-tight">
        <strong>${escapeHtml(t("stats.perPlayerTotals"))}</strong>
        <div class="stats-list">
          ${stats.scoreboard
            .map(
              (entry) => `
                <div class="summary-block">
                  <div class="game-card-header">
                    <strong>${escapeHtml(entry.name)}</strong>
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
        <label class="toggle-row">
          <span>${escapeHtml(t("settings.askBeforeNextRound"))}</span>
          <input
            id="settings-confirm-next-round"
            type="checkbox"
            ${state.settings.confirmBeforeNextRound ? "checked" : ""}
          />
        </label>
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
          </select>
        </label>
        <button class="button-secondary" type="button" data-action="reset-prefs">${escapeHtml(
          t("settings.resetPrefs")
        )}</button>
      </form>
      <p class="footer-note plain-copy">${escapeHtml(t("settings.keepNote"))}</p>
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

function renderDrawer() {
  elements.drawer.classList.toggle("hidden", !state.drawerOpen);
  elements.appBackdrop.classList.toggle("hidden", !(state.drawerOpen || state.menu || state.confirmNextRoundOpen));
  elements.menuButton.setAttribute("aria-expanded", String(state.drawerOpen));
}

function renderChrome() {
  applyPreferences();
  renderShellText();
  renderDrawer();
  renderMenu();
  renderConfirmModal();
}

function render() {
  if (state.route !== "current-game") {
    hideCelebration();
  }

  renderChrome();

  renderScreen("home", renderHomeScreen());
  renderScreen("newGame", renderNewGameScreen());
  renderScreen("existingGames", renderExistingGamesScreen());
  renderScreen("currentGame", renderCurrentGameScreen());
  renderScreen("stats", renderStatsScreen());
  renderScreen("settings", renderSettingsScreen());

  const routeMap = {
    home: "home",
    "new-game": "newGame",
    "existing-games": "existingGames",
    "current-game": "currentGame",
    stats: "stats",
    settings: "settings"
  };

  Object.entries(routeMap).forEach(([route, screenName]) => {
    const screen = elements.screens[screenName];
    screen.classList.toggle("hidden", state.route !== route);
  });

  requestAnimationFrame(() => {
    if (state.route === "new-game") {
      document.querySelector("#new-player-input")?.focus();
    } else if (state.route === "current-game") {
      focusCurrentScoreInput();
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
  if (elements.celebration) {
    elements.celebration.classList.add("hidden");
    elements.celebration.classList.remove("celebration-pulse");
    elements.celebration.setAttribute("aria-hidden", "true");
  }
}

function startCelebrationFireworks() {
  const surface = resizeCelebrationCanvas();
  if (!surface) {
    return;
  }

  const { context, width, height } = surface;
  const particles = [];
  const palette = ["#ff9d5c", "#ffd166", "#8ecae6", "#b8f2e6", "#f7b267"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const spawnBurst = (x, y) => {
    const color = palette[Math.floor(Math.random() * palette.length)];
    const count = reducedMotion ? 18 : 42;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.14;
      const speed = 1.5 + Math.random() * 5.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        life: 64 + Math.random() * 16,
        maxLife: 64 + Math.random() * 16,
        color,
        size: 1.6 + Math.random() * 2.8,
        gravity: 0.06 + Math.random() * 0.02,
        drag: 0.985
      });
    }
  };

  const launchX = width * 0.5;
  const launchY = height * 0.28;
  const burstPoints = [
    [launchX - width * 0.17, launchY + height * 0.05],
    [launchX + width * 0.16, launchY + height * 0.02],
    [launchX, launchY - height * 0.02]
  ];

  burstPoints.forEach(([x, y], index) => {
    const timerId = window.setTimeout(() => spawnBurst(x, y), index * 180);
    state.celebration.burstTimers.push(timerId);
  });

  const draw = () => {
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "lighter";

    particles.forEach((particle) => {
      particle.life -= 1;
      particle.vx *= particle.drag;
      particle.vy = particle.vy * particle.drag + particle.gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;
    });

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }

      const alpha = Math.max(0, particle.life / particle.maxLife);
      context.beginPath();
      context.fillStyle = `${particle.color}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, "0")}`;
      context.shadowBlur = 16;
      context.shadowColor = particle.color;
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }

    if (particles.length) {
      state.celebration.rafId = window.requestAnimationFrame(draw);
    }
  };

  state.celebration.rafId = window.requestAnimationFrame(draw);
}

function showCelebration(winner) {
  if (!winner || !elements.celebration) {
    return;
  }

  hideCelebration();
  elements.celebration.classList.remove("hidden");
  elements.celebration.classList.add("celebration-pulse");
  elements.celebration.setAttribute("aria-hidden", "false");

  if (elements.celebrationTitle) {
    elements.celebrationTitle.textContent = t("celebration.title");
  }

  if (elements.celebrationName) {
    elements.celebrationName.textContent = winner.name;
  }

  startCelebrationFireworks();
  state.celebration.timeoutId = window.setTimeout(() => {
    hideCelebration();
  }, 2800);
}

function resetNewGameDraft() {
  state.draft.newGame = {
    title: "",
    gameMode: "classic",
    winningScore: String(state.settings.defaultWinningScore),
    playerInput: "",
    players: []
  };
}

function seedNewGameFromPlayers(players, game) {
  state.draft.newGame = {
    title: game?.title ? `${game.title} ${t("common.current")}` : "",
    gameMode: game?.gameMode || "classic",
    winningScore: String(game?.winningScore || state.settings.defaultWinningScore),
    playerInput: "",
    players: players.map((player) => player.name)
  };
}

async function startGame() {
  const players = [...state.draft.newGame.players];
  const title = state.draft.newGame.title.trim();

  if (players.length < 2) {
    showToast(t("newGame.noPlayersYet"), true);
    return;
  }

  try {
    const winningScore = Number(state.draft.newGame.winningScore);
    await api("/api/game", {
      method: "POST",
      body: JSON.stringify({
        title,
        players,
        gameMode: state.draft.newGame.gameMode,
        winningScore: Number.isFinite(winningScore) && winningScore > 0 ? winningScore : state.settings.defaultWinningScore
      })
    });

    resetNewGameDraft();
    await refresh();
    state.route = "current-game";
    window.location.hash = "current-game";
    showToast(t("toast.gameStarted"));
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function playAgain() {
  const game = state.data.currentGame;
  if (!game) {
    return;
  }

  try {
    hideCelebration();
    const payload = await api("/api/game/restart", {
      method: "POST",
      body: JSON.stringify({})
    });

    state.data.currentGame = payload.game || null;
    state.data.history = payload.history || [];
    state.draft.roundNote = "";
    state.draft.roundScores = {};
    state.draft.currentGameOrder = "entered";
    ensureRoundDraft(state.data.currentGame);
    state.route = "current-game";
    window.location.hash = "current-game";
    showToast(t("toast.gameStarted"));
    render();
    focusCurrentScoreInput();
  } catch (error) {
    showToast(error.message, true);
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

  document.querySelector("#round-note")?.focus();
  return false;
}

function focusCurrentScoreInput(target = null) {
  const input =
    target instanceof HTMLInputElement
      ? target
      : document.querySelector('#current-game-form input[data-player-id]');

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.select();
  });
}

function clearHomeSwipeState() {
  const swipe = state.homeSwipe;
  if (swipe?.element instanceof HTMLElement) {
    swipe.element.classList.remove("swiping");
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

  if (target.dataset.homeCurrent === "true") {
    return;
  }

  clearHomeSwipeState();
  state.homeSwipe = {
    gameId: target.dataset.gameCard,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    currentX: event.clientX,
    currentY: event.clientY,
    element: target,
    deleted: false
  };
  target.classList.add("swiping");
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
  const shouldDelete = deltaX < -88 && Math.abs(deltaX) > Math.abs(deltaY) + 10;

  if (shouldDelete && swipe.gameId) {
    swipe.deleted = true;
    clearHomeSwipeState();
    suppressHomeItemClick(swipe.gameId);
    await deleteArchivedGame(swipe.gameId);
    return;
  }

  if (Math.abs(deltaX) > 12) {
    suppressHomeItemClick(swipe.gameId);
  }

  swipe.element.classList.remove("swiping");
  swipe.element.style.transform = "";
  swipe.element.style.opacity = "";
  clearHomeSwipeState();
}

function updateSettingsFromControls(shouldRender = true) {
  const winningScore = Number(document.querySelector("#settings-winning-score")?.value || 200);
  const confirmBeforeNextRound = Boolean(document.querySelector("#settings-confirm-next-round")?.checked);
  const theme = document.querySelector("#settings-theme")?.value || DEFAULT_SETTINGS.theme;
  const language = document.querySelector("#settings-language")?.value || DEFAULT_SETTINGS.language;

  state.settings.defaultWinningScore = Number.isFinite(winningScore) && winningScore > 0 ? winningScore : 200;
  state.settings.confirmBeforeNextRound = confirmBeforeNextRound;
  state.settings.theme = theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
  state.settings.language = language === "sv" ? "sv" : "en";
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
  try {
    state.menu = null;
    const payload = await api(`/api/game/${encodeURIComponent(gameId)}/resume`, { method: "POST" });
    state.data.currentGame = payload.game || null;
    state.data.history = payload.history || [];
    ensureRoundDraft(state.data.currentGame);
    state.route = "current-game";
    window.location.hash = "current-game";
    showToast(t("toast.gameResumed"));
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function archiveCurrentGame() {
  try {
    state.menu = null;
    const payload = await api("/api/game", { method: "DELETE" });
    state.data.currentGame = payload.game || null;
    state.data.history = payload.history || state.data.history;
    ensureRoundDraft(state.data.currentGame);
    state.route = "home";
    window.location.hash = "home";
    showToast(t("toast.gameArchived"));
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function deleteArchivedGame(gameId) {
  try {
    state.menu = null;
    const payload = await api(`/api/history/${encodeURIComponent(gameId)}`, { method: "DELETE" });
    state.data.history = payload.history || [];
    state.menu = null;
    showToast(t("toast.gameDeleted"));
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function saveRound() {
  const game = state.data.currentGame;
  if (!game || game.isFinished) {
    return;
  }

  const scores = game.players.map((player) => ({
    playerId: player.id,
    points: Number(state.draft.roundScores[player.id] ?? 0)
  }));

  try {
    const payload = await api("/api/rounds", {
      method: "POST",
      body: JSON.stringify({
        note: state.draft.roundNote,
        scores
      })
    });

    state.data.currentGame = payload.game || null;
    state.draft.roundNote = "";
    state.draft.roundScores = {};
    ensureRoundDraft(state.data.currentGame);
    state.route = "current-game";
    window.location.hash = "current-game";

    if (payload.game?.isFinished) {
      showCelebration(getWinner(payload.game));
      showToast(t("toast.gameFinished"));
      render();
      return;
    }

    showToast(t("toast.roundSaved"));
    render();
    focusCurrentScoreInput();
  } catch (error) {
    showToast(error.message, true);
  }
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

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const item = target.closest("[data-home-recent-card]");
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
    } else if (target.id === "new-game-winning-score") {
      state.draft.newGame.winningScore = target.value;
    } else if (target.matches('#current-game-form input[data-player-id]')) {
      const playerId = target.dataset.playerId;
      if (playerId) {
        state.draft.roundScores[playerId] = Number(target.value);
      }
    } else if (target.id === "round-note") {
      state.draft.roundNote = target.value;
    } else if (target.id === "settings-winning-score" || target.id === "settings-confirm-next-round" || target.id === "settings-theme" || target.id === "settings-language") {
      updateSettingsFromControls(false);
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.id === "settings-winning-score" || target.id === "settings-confirm-next-round" || target.id === "settings-theme" || target.id === "settings-language") {
      updateSettingsFromControls();
    }
  });

  document.addEventListener("keydown", async (event) => {
    const target = event.target;

    if (target instanceof HTMLInputElement && target.id === "new-player-input" && (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      addDraftPlayer();
      return;
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

    const actionTarget = target.closest("[data-action]");
    if (actionTarget) {
      const action = actionTarget.dataset.action;
      const gameId = actionTarget.dataset.gameId;
      const playerIndex = Number(actionTarget.dataset.playerIndex);

      if (action === "go-new-game") {
        setRoute("new-game");
      } else if (action === "go-existing-games") {
        setRoute("existing-games");
      } else if (action === "go-current-game") {
        setRoute("current-game");
      } else if (action === "set-new-game-mode" && actionTarget.dataset.mode) {
        state.draft.newGame.gameMode = actionTarget.dataset.mode;
        render();
      } else if (action === "add-player") {
        addDraftPlayer();
      } else if (action === "remove-player") {
        removeDraftPlayer(playerIndex);
      } else if (action === "set-current-order" && actionTarget.dataset.order) {
        state.draft.currentGameOrder = actionTarget.dataset.order === "leader" ? "leader" : "entered";
        render();
      } else if (action === "resume-game" && gameId) {
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
      } else if (action === "reset-prefs") {
        resetPreferences();
      } else if (action === "resume-current") {
        setRoute("current-game");
      }
      return;
    }

    const gameCard = target.closest("[data-game-card]");
    if (gameCard && !target.closest(".menu-popover")) {
      const gameId = gameCard.dataset.gameCard;
      if (!gameId) {
        return;
      }

      if (state.homeSwipeSuppressClickId === gameId) {
        state.homeSwipeSuppressClickId = null;
        return;
      }

      if (state.data.currentGame?.id === gameId) {
        setRoute("current-game");
      } else {
        await resumeGame(gameId);
      }
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

render();
wireGlobalEvents();
initSettingsWatchers();
refresh().catch((error) => {
  state.loading = false;
  showToast(error.message, true);
  render();
});
