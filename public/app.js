const state = {
  game: null,
  history: [],
  winnerAnnouncementId: null,
  selectedHistoryGameId: null
};

const elements = {
  newGameForm: document.querySelector("#new-game-form"),
  gameTitle: document.querySelector("#game-title"),
  players: document.querySelector("#players"),
  restartDivider: document.querySelector("#restart-divider"),
  gameMeta: document.querySelector("#game-meta"),
  currentPlayers: document.querySelector("#current-players"),
  addPlayerForm: document.querySelector("#add-player-form"),
  newPlayerName: document.querySelector("#new-player-name"),
  restartGameButton: document.querySelector("#restart-game"),
  archiveButton: document.querySelector("#archive-game"),
  leaderboardEmpty: document.querySelector("#leaderboard-empty"),
  leaderboardTable: document.querySelector("#leaderboard-table"),
  leaderboardBody: document.querySelector("#leaderboard-body"),
  roundCount: document.querySelector("#round-count"),
  roundForm: document.querySelector("#round-form"),
  roundFormStatus: document.querySelector("#round-form-status"),
  roundScoreFields: document.querySelector("#round-score-fields"),
  roundNote: document.querySelector("#round-note"),
  saveRoundButton: document.querySelector("#save-round-button"),
  roundsEmpty: document.querySelector("#rounds-empty"),
  roundsList: document.querySelector("#rounds-list"),
  historyEmpty: document.querySelector("#history-empty"),
  historyList: document.querySelector("#history-list"),
  historyModal: document.querySelector("#history-modal"),
  historyModalBackdrop: document.querySelector("#history-modal-backdrop"),
  historyModalTitle: document.querySelector("#history-modal-title"),
  historyModalMeta: document.querySelector("#history-modal-meta"),
  historyModalScoreboard: document.querySelector("#history-modal-scoreboard"),
  historyModalRounds: document.querySelector("#history-modal-rounds"),
  historyModalClose: document.querySelector("#history-modal-close"),
  toast: document.querySelector("#toast"),
  winnerOverlay: document.querySelector("#winner-overlay"),
  winnerName: document.querySelector("#winner-name"),
  winnerScore: document.querySelector("#winner-score"),
  winnerClose: document.querySelector("#winner-close")
};

const showToast = (message, isError = false) => {
  elements.toast.textContent = message;
  elements.toast.style.background = isError ? "#8f1d1d" : "#23180f";
  elements.toast.classList.remove("hidden");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 3000);
};

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong.");
  }

  return payload;
};

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

const summarizeArchivedGame = (game) => {
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
};

const renderGameMeta = () => {
  if (!state.game) {
    elements.gameMeta.innerHTML = "<p>No game started yet.</p>";
    elements.currentPlayers.innerHTML = "";
    elements.currentPlayers.classList.add("hidden");
    elements.addPlayerForm.classList.add("hidden");
    elements.restartDivider.classList.add("hidden");
    elements.restartGameButton.classList.add("hidden");
    return;
  }

  const playerNames = state.game.players.map((player) => player.name).join(", ");
  const finishedCopy =
    state.game.isFinished && state.game.winner
      ? `<div><strong>Winner:</strong> ${state.game.winner.name} with ${state.game.winner.total} points</div>`
      : "";

  elements.gameMeta.innerHTML = `
    <strong>${state.game.title}</strong>
    <div>Started ${formatDate(state.game.createdAt)}</div>
    <div>${state.game.players.length} players: ${playerNames}</div>
    ${finishedCopy}
  `;
  elements.currentPlayers.innerHTML = state.game.players
    .map(
      (player) => `
        <div class="player-chip">
          <span>${player.name}</span>
          <button
            class="player-remove-button"
            type="button"
            data-player-id="${player.id}"
            aria-label="Remove player ${player.name}"
            title="Remove player"
          >
            ×
          </button>
        </div>
      `
    )
    .join("");
  elements.currentPlayers.classList.remove("hidden");
  elements.addPlayerForm.classList.toggle("hidden", state.game.isFinished);
  elements.restartDivider.classList.remove("hidden");
  elements.restartGameButton.classList.remove("hidden");
};

const renderLeaderboard = () => {
  if (!state.game) {
    elements.leaderboardEmpty.classList.remove("hidden");
    elements.leaderboardTable.classList.add("hidden");
    elements.roundCount.textContent = "0 rounds";
    return;
  }

  elements.roundCount.textContent = `${state.game.rounds.length} round${state.game.rounds.length === 1 ? "" : "s"}`;
  elements.leaderboardBody.innerHTML = state.game.scoreboard
    .map(
      (entry) => `
        <tr>
          <td>${entry.name}</td>
          <td>${entry.total}</td>
        </tr>
      `
    )
    .join("");

  elements.leaderboardEmpty.classList.add("hidden");
  elements.leaderboardTable.classList.remove("hidden");
};

const renderRoundForm = () => {
  if (!state.game) {
    elements.roundFormStatus.classList.add("hidden");
    elements.roundScoreFields.innerHTML = "<p class='hint'>Start a game to enter scores.</p>";
    elements.saveRoundButton.disabled = false;
    elements.roundNote.disabled = false;
    return;
  }

  if (state.game.isFinished && state.game.winner) {
    elements.roundFormStatus.textContent = `${state.game.winner.name} ended the game with ${state.game.winner.total} points. Start a new game to play again.`;
    elements.roundFormStatus.classList.remove("hidden");
  } else {
    elements.roundFormStatus.classList.add("hidden");
  }

  elements.roundScoreFields.innerHTML = state.game.players
    .map(
      (player) => `
        <label class="score-field">
          <span>${player.name}</span>
          <input type="number" step="1" name="score-${player.id}" data-player-id="${player.id}" value="0" required ${state.game.isFinished ? "disabled" : ""} />
        </label>
      `
    )
    .join("");

  elements.saveRoundButton.disabled = Boolean(state.game.isFinished);
  elements.roundNote.disabled = Boolean(state.game.isFinished);
};

const renderRounds = () => {
  if (!state.game || state.game.rounds.length === 0) {
    elements.roundsEmpty.classList.remove("hidden");
    elements.roundsList.innerHTML = "";
    return;
  }

  const playerMap = Object.fromEntries(state.game.players.map((player) => [player.id, player.name]));
  elements.roundsEmpty.classList.add("hidden");
  elements.roundsList.innerHTML = [...state.game.rounds]
    .reverse()
    .map((round, index) => {
      const summary = round.scores
        .map((score) => `${playerMap[score.playerId]}: ${score.points}`)
        .join(" | ");

      return `
        <article class="round-entry">
          <strong>Round ${state.game.rounds.length - index}</strong>
          <div>${summary}</div>
          <div>${round.note ? `${round.note} · ` : ""}${formatDate(round.createdAt)}</div>
        </article>
      `;
    })
    .join("");
};

const renderHistory = () => {
  if (state.history.length === 0) {
    elements.historyEmpty.classList.remove("hidden");
    elements.historyList.innerHTML = "";
    return;
  }

  elements.historyEmpty.classList.add("hidden");
  elements.historyList.innerHTML = state.history
    .map((game) => {
      const rounds = game.rounds?.length ?? 0;
      return `
        <article class="history-entry history-entry-clickable" data-history-open-id="${game.id}">
          <div class="history-header">
            <strong>${game.title}</strong>
            <button
              class="icon-button delete-history-button"
              type="button"
              data-history-id="${game.id}"
              aria-label="Delete archived game ${game.title}"
              title="Delete archived game"
            >
              <span aria-hidden="true">🗑</span>
            </button>
          </div>
          <div>${game.players.length} players · ${rounds} rounds</div>
          <div>Started ${formatDate(game.createdAt)}</div>
        </article>
      `;
    })
    .join("");
};

const render = () => {
  renderGameMeta();
  renderLeaderboard();
  renderRoundForm();
  renderRounds();
  renderHistory();
  renderHistoryModal();
  renderWinnerOverlay();
};

const renderHistoryModal = () => {
  const game = state.history.find((entry) => entry.id === state.selectedHistoryGameId);

  if (!game) {
    elements.historyModal.classList.add("hidden");
    return;
  }

  const scoreboard = summarizeArchivedGame(game);
  const playerMap = Object.fromEntries(game.players.map((player) => [player.id, player.name]));

  elements.historyModalTitle.textContent = game.title;
  elements.historyModalMeta.textContent = `${game.players.length} players · ${game.rounds.length} rounds · Started ${formatDate(game.createdAt)}`;
  elements.historyModalScoreboard.innerHTML = scoreboard
    .map(
      (entry, index) => `
        <div class="summary-row">
          <span>${index === 0 ? "Winner" : `#${index + 1}`} · ${entry.name}</span>
          <strong>${entry.total}</strong>
        </div>
      `
    )
    .join("");

  elements.historyModalRounds.innerHTML =
    game.rounds.length === 0
      ? "<p class='hint'>No rounds were recorded for this game.</p>"
      : game.rounds
          .map((round, index) => {
            const scores = round.scores
              .map((score) => `${playerMap[score.playerId]}: ${score.points}`)
              .join(" | ");

            return `
              <article class="round-entry">
                <strong>Round ${index + 1}</strong>
                <div>${scores}</div>
                <div>${round.note ? `${round.note} · ` : ""}${formatDate(round.createdAt)}</div>
              </article>
            `;
          })
          .join("");

  elements.historyModal.classList.remove("hidden");
};

const renderWinnerOverlay = () => {
  if (!state.game?.isFinished || !state.game?.winner || state.winnerAnnouncementId !== state.game.id) {
    elements.winnerOverlay.classList.add("hidden");
    return;
  }

  elements.winnerName.textContent = state.game.winner.name;
  elements.winnerScore.textContent = `${state.game.winner.total} points`;
  const winnerCopy = elements.winnerOverlay.querySelector(".winner-copy");
  if (winnerCopy) {
    winnerCopy.textContent = `${state.game.winner.name} crossed 200 and took the game.`;
  }
  elements.winnerOverlay.classList.remove("hidden");
};

const refresh = async () => {
  const payload = await api("/api/game", { method: "GET" });
  state.game = payload.game;
  state.history = payload.history || [];
  if (!state.game || !state.game.isFinished) {
    state.winnerAnnouncementId = null;
  }
  render();
};

elements.newGameForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const players = elements.players.value
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

  try {
    const payload = await api("/api/game", {
      method: "POST",
      body: JSON.stringify({
        title: elements.gameTitle.value,
        players
      })
    });

    state.game = payload.game;
    await refresh();
    elements.newGameForm.reset();
    state.winnerAnnouncementId = null;
    showToast("New game started.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.addPlayerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = await api("/api/players", {
      method: "POST",
      body: JSON.stringify({ name: elements.newPlayerName.value })
    });

    state.game = payload.game;
    render();
    elements.addPlayerForm.reset();
    showToast("Player added.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.roundForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.game) {
    showToast("Start a game first.", true);
    return;
  }

  const scores = [...elements.roundScoreFields.querySelectorAll("input[data-player-id]")].map((input) => ({
    playerId: input.dataset.playerId,
    points: Number(input.value)
  }));

  try {
    const payload = await api("/api/rounds", {
      method: "POST",
      body: JSON.stringify({
        note: elements.roundNote.value,
        scores
      })
    });

    state.game = payload.game;
    if (state.game?.isFinished) {
      state.winnerAnnouncementId = state.game.id;
    }
    render();
    elements.roundForm.reset();
    renderRoundForm();
    showToast(state.game?.isFinished ? "Game finished." : "Round saved.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.archiveButton.addEventListener("click", async () => {
  try {
    await api("/api/game", { method: "DELETE" });
    await refresh();
    state.winnerAnnouncementId = null;
    showToast("Game archived.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.restartGameButton.addEventListener("click", async () => {
  try {
    const payload = await api("/api/game/restart", {
      method: "POST",
      body: JSON.stringify({ title: state.game?.title || "" })
    });

    state.game = payload.game;
    state.history = payload.history || [];
    state.winnerAnnouncementId = null;
    render();
    showToast("New game started with the same players.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.currentPlayers.addEventListener("click", async (event) => {
  const button = event.target.closest(".player-remove-button");

  if (!button) {
    return;
  }

  const playerId = button.dataset.playerId;

  if (!playerId) {
    return;
  }

  try {
    const payload = await api(`/api/players/${playerId}`, { method: "DELETE" });
    state.game = payload.game;
    render();
    showToast("Player removed.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.historyList.addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-history-button");

  if (!button) {
    const historyEntry = event.target.closest("[data-history-open-id]");

    if (!historyEntry) {
      return;
    }

    state.selectedHistoryGameId = historyEntry.dataset.historyOpenId;
    renderHistoryModal();
    return;
  }

  const historyId = button.dataset.historyId;

  if (!historyId) {
    return;
  }

  try {
    const payload = await api(`/api/history/${historyId}`, { method: "DELETE" });
    state.history = payload.history || [];
    if (state.selectedHistoryGameId === historyId) {
      state.selectedHistoryGameId = null;
    }
    renderHistory();
    renderHistoryModal();
    showToast("Archived game deleted.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.historyModalClose.addEventListener("click", () => {
  state.selectedHistoryGameId = null;
  renderHistoryModal();
});

elements.historyModalBackdrop.addEventListener("click", () => {
  state.selectedHistoryGameId = null;
  renderHistoryModal();
});

elements.winnerClose.addEventListener("click", () => {
  state.winnerAnnouncementId = null;
  renderWinnerOverlay();
});

refresh().catch((error) => showToast(error.message, true));
