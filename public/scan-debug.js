(function () {
  const byId = (...ids) => ids.map((id) => document.getElementById(id)).find(Boolean) || null;

  const fileInput = byId("scan-debug-file-input", "scan-debug-file");
  const pickButton = byId("scan-debug-pick", "scan-debug-capture");
  const runButton = byId("scan-debug-run");
  const clearButton = document.getElementById("scan-debug-clear");
  const modelInput = document.getElementById("scan-debug-model");
  const dropzone = document.getElementById("scan-debug-dropzone");
  const previewImage = byId("scan-debug-preview-image", "scan-debug-preview");
  const dropzoneCopy =
    document.getElementById("scan-debug-dropzone-copy") || document.querySelector(".scan-debug-dropzone-copy");
  const fileMeta = document.getElementById("scan-debug-file-meta");
  const statusPill = document.getElementById("scan-debug-status");
  const scoreNode = document.getElementById("scan-debug-score");
  const confidenceNode = document.getElementById("scan-debug-confidence");
  const tokenCountNode = document.getElementById("scan-debug-token-count");
  const tokenList = byId("scan-debug-token-list", "scan-debug-tokens");
  const numberTotalNode = document.getElementById("scan-debug-number-total");
  const modifierTotalNode = document.getElementById("scan-debug-modifier-total");
  const bonusNode = document.getElementById("scan-debug-bonus");
  const multiplierNode = document.getElementById("scan-debug-multiplier");
  const usageTotalNode = document.getElementById("scan-debug-usage-total");
  const monthUsedNode = document.getElementById("scan-debug-month-used");
  const monthRemainingNode = document.getElementById("scan-debug-month-remaining");
  const estimateImageNode = document.getElementById("scan-debug-estimate-image");
  const estimateImageCostNode = document.getElementById("scan-debug-estimate-image-cost");
  const estimate100Node = document.getElementById("scan-debug-estimate-100");
  const estimate100CostNode = document.getElementById("scan-debug-estimate-100-cost");
  const estimate200Node = document.getElementById("scan-debug-estimate-200");
  const estimate200CostNode = document.getElementById("scan-debug-estimate-200-cost");
  const estimateMonthNode = document.getElementById("scan-debug-estimate-month");
  const estimateMonthCostNode = document.getElementById("scan-debug-estimate-month-cost");
  const uploadSizeNode = document.getElementById("scan-debug-upload-size");
  const latencyNode = document.getElementById("scan-debug-latency");
  const warningsNode = document.getElementById("scan-debug-warnings");
  const consoleNode = document.getElementById("scan-debug-console");
  const rawNode = byId("scan-debug-raw", "scan-debug-response");
  const copyRawButton = byId("scan-debug-copy-raw", "scan-debug-copy");

  let currentFile = null;
  let currentImageDataUrl = "";
  let currentPreparedImage = null;
  let currentPreviewUrl = "";
  let currentRawResponse = null;
  let currentLogs = 0;

  const FLIP7_BONUS_POINTS = 15;
  const MODEL_PRICING = {
    "gpt-5.4": { input: 2.5, output: 15 },
    "gpt-5.4-mini": { input: 0.75, output: 4.5 },
    "gpt-5.4-nano": { input: 0.2, output: 1.25 },
    "gpt-5.2": { input: 1.75, output: 14 },
    "gpt-5.1": { input: 1.25, output: 10 },
    "gpt-5": { input: 1.25, output: 10 },
    "gpt-5-mini": { input: 0.25, output: 2 },
    "gpt-5-nano": { input: 0.05, output: 0.4 },
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-5.4-pro": { input: 2.5, output: 15 },
    "gpt-5-pro": { input: 15, output: 120 }
  };

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) {
      return "0 KB";
    }

    if (value >= 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
    }

    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  function formatLatency(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value < 0) {
      return "0 ms";
    }

    if (value < 1000) {
      return `${Math.round(value)} ms`;
    }

    return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} s`;
  }

  function formatNumber(value) {
    const count = Number(value);
    if (!Number.isFinite(count)) {
      return "0";
    }

    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: count >= 1000 ? 1 : 0
    }).format(count);
  }

  function formatTokenCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count)) {
      return "—";
    }

    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: count >= 1000 ? 1 : 0
    }).format(count);
  }

  function formatCurrency(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      return "—";
    }

    const fractionDigits = amount >= 1 ? 2 : amount >= 0.1 ? 2 : amount >= 0.01 ? 3 : 4;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(amount);
  }

  function formatPercent(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      return "—";
    }

    return `${amount.toFixed(amount >= 100 ? 0 : amount >= 10 ? 1 : 2)}%`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function log(level, message, detail = "") {
    if (!consoleNode) {
      return;
    }

    const entry = document.createElement("div");
    entry.className = `scan-debug-log is-${level}`;
    entry.innerHTML = `
      <span class="scan-debug-log-time">${escapeHtml(formatTime())}</span>
      <span class="scan-debug-log-level">${escapeHtml(level)}</span>
      <span class="scan-debug-log-message">${escapeHtml(message)}</span>
      ${detail ? `<span class="scan-debug-log-detail">${escapeHtml(detail)}</span>` : ""}
    `;
    consoleNode.appendChild(entry);
    currentLogs += 1;
    consoleNode.scrollTop = consoleNode.scrollHeight;
  }

  function setStatus(label, tone = "muted") {
    if (!statusPill) {
      return;
    }

    statusPill.textContent = label;
    statusPill.className = `pill pill-${tone}`;
  }

  function updateFileMeta(file) {
    if (!fileMeta) {
      return;
    }

    if (!file) {
      fileMeta.textContent = "No image selected";
      return;
    }

    const sizeMb = file.size / (1024 * 1024);
    fileMeta.textContent = `${file.name} · ${sizeMb.toFixed(sizeMb >= 10 ? 1 : 2)} MB`;
  }

  function setPreview(dataUrl) {
    if (!dataUrl) {
      previewImage?.classList.add("hidden");
      previewImage?.removeAttribute("src");
      dropzoneCopy?.classList.remove("hidden");
      return;
    }

    if (previewImage) {
      previewImage.src = dataUrl;
      previewImage.classList.remove("hidden");
    }
    dropzoneCopy?.classList.add("hidden");
  }

  function clearWarnings() {
    if (!warningsNode) {
      return;
    }

    warningsNode.innerHTML = "";
    warningsNode.textContent = "No warnings yet.";
    warningsNode.classList.remove("hidden");
  }

  function renderWarnings(warnings) {
    clearWarnings();

    if (!warningsNode) {
      return;
    }

    if (!Array.isArray(warnings) || warnings.length === 0) {
      return;
    }

    warningsNode.classList.remove("hidden");
    warningsNode.innerHTML = warnings.map((warning) => `<div>${escapeHtml(warning)}</div>`).join("");
  }

  function renderTokens(tokens) {
    if (!tokenList) {
      return;
    }

    tokenList.innerHTML = "";

    if (!Array.isArray(tokens) || tokens.length === 0) {
      tokenList.innerHTML = '<div class="scan-debug-empty">No tokens detected.</div>';
      if (tokenCountNode) {
        tokenCountNode.textContent = "0";
      }
      return;
    }

    if (tokenCountNode) {
      tokenCountNode.textContent = String(tokens.length);
    }
    tokenList.innerHTML = tokens
      .map((token) => {
        const label = token.startsWith("number:") ? token.slice("number:".length) : token.slice("modifier:".length);
        return `<span class="scan-token">${escapeHtml(label)}</span>`;
      })
      .join("");
  }

  function calculateStats(tokens) {
    const selectedTokens = Array.isArray(tokens) ? tokens.filter((token) => typeof token === "string") : [];
    const uniqueNumbers = new Set();
    let numberTotal = 0;
    let modifierTotal = 0;
    let hasMultiplier = false;

    for (const token of selectedTokens) {
      if (token.startsWith("number:")) {
        const value = Number(token.slice("number:".length));
        if (!Number.isFinite(value) || uniqueNumbers.has(value)) {
          continue;
        }

        uniqueNumbers.add(value);
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

    const flip7Bonus = uniqueNumbers.size === 7 ? FLIP7_BONUS_POINTS : 0;
    const numberScore = hasMultiplier ? numberTotal * 2 : numberTotal;
    const total = numberScore + modifierTotal + flip7Bonus;

    return {
      selectedTokens,
      numberCount: uniqueNumbers.size,
      numberTotal,
      modifierTotal,
      hasMultiplier,
      flip7Bonus,
      total
    };
  }

  function renderStats(tokens, confidence) {
    const stats = calculateStats(tokens);
    if (scoreNode) {
      scoreNode.textContent = String(stats.total);
    }
    if (confidenceNode) {
      confidenceNode.textContent = `${Math.round((confidence ?? 0) * 100)}%`;
    }
    if (numberTotalNode) {
      numberTotalNode.textContent = String(stats.numberTotal);
    }
    if (modifierTotalNode) {
      modifierTotalNode.textContent = String(stats.modifierTotal);
    }
    if (bonusNode) {
      bonusNode.textContent = String(stats.flip7Bonus);
    }
    if (multiplierNode) {
      multiplierNode.textContent = stats.hasMultiplier ? "On" : "Off";
    }
    return stats;
  }

  function getUsage(payload) {
    const usage = payload?.usage || payload?.rawResponse?.usage || null;
    if (!usage || typeof usage !== "object") {
      return null;
    }

    const input = usage.input_tokens ?? usage.inputTokens ?? usage.prompt_tokens ?? usage.promptTokens ?? null;
    const output = usage.output_tokens ?? usage.outputTokens ?? usage.completion_tokens ?? usage.completionTokens ?? null;
    const total = usage.total_tokens ?? usage.totalTokens ?? null;

    return {
      input: Number.isFinite(Number(input)) ? Number(input) : null,
      output: Number.isFinite(Number(output)) ? Number(output) : null,
      total: Number.isFinite(Number(total)) ? Number(total) : null
    };
  }

  function getBudget(payload) {
    const budget = payload?.budget || payload?.rawResponse?.budget || null;
    if (!budget || typeof budget !== "object") {
      return null;
    }

    const limit = Number(budget.limit);
    const used = Number(budget.used);
    const remaining = Number(budget.remaining);

    return {
      monthStart: typeof budget.monthStart === "string" ? budget.monthStart : "",
      limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null,
      used: Number.isFinite(used) && used >= 0 ? Math.floor(used) : null,
      remaining: Number.isFinite(remaining) && remaining >= 0 ? Math.floor(remaining) : null
    };
  }

  function getCurrentModelName(payload) {
    const model = typeof payload?.model === "string" ? payload.model.trim() : "";
    return model || modelInput?.value?.trim() || "unknown";
  }

  function getModelPricing(modelName) {
    const model = (modelName || "").trim();
    return MODEL_PRICING[model] || null;
  }

  function estimateImageCost(tokens, modelName) {
    const usage = getUsage(tokens);
    if (!usage) {
      return null;
    }

    const pricing = getModelPricing(modelName);
    if (!pricing || !Number.isFinite(usage.input ?? NaN) || !Number.isFinite(usage.output ?? NaN)) {
      return null;
    }

    const inputCost = ((usage.input || 0) / 1_000_000) * pricing.input;
    const outputCost = ((usage.output || 0) / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  function renderEstimateTile(valueNode, costNode, tokenTotal, cost, suffix = "") {
    if (valueNode) {
      valueNode.textContent =
        tokenTotal === null || tokenTotal === undefined
          ? "—"
          : `${formatTokenCount(tokenTotal)} tokens${suffix}`;
    }

    if (costNode) {
      costNode.textContent = cost === null ? "—" : `${formatCurrency(cost)}`;
    }
  }

  function renderEstimates(payload) {
    const usage = getUsage(payload);
    const budget = getBudget(payload);
    const modelName = getCurrentModelName(payload);
    const perImageTokens = usage?.total ?? null;
    const perImageCost = estimateImageCost(payload, modelName);

    if (perImageTokens !== null) {
      renderEstimateTile(estimateImageNode, estimateImageCostNode, perImageTokens, perImageCost);
      renderEstimateTile(
        estimate100Node,
        estimate100CostNode,
        perImageTokens * 100,
        perImageCost === null ? null : perImageCost * 100
      );
      renderEstimateTile(
        estimate200Node,
        estimate200CostNode,
        perImageTokens * 200,
        perImageCost === null ? null : perImageCost * 200
      );
    } else {
      renderEstimateTile(estimateImageNode, estimateImageCostNode, null, null);
      renderEstimateTile(estimate100Node, estimate100CostNode, null, null);
      renderEstimateTile(estimate200Node, estimate200CostNode, null, null);
    }

    if (estimateMonthNode || estimateMonthCostNode) {
      if (!budget || budget.limit === null || perImageTokens === null) {
        if (estimateMonthNode) {
          estimateMonthNode.textContent = budget?.limit === null ? "Unlimited" : "—";
        }
        if (estimateMonthCostNode) {
          estimateMonthCostNode.textContent = budget?.limit === null ? "No monthly cap set" : "—";
        }
        return;
      }

      const imageShare = (perImageTokens / budget.limit) * 100;
      const hundredShare = ((perImageTokens * 100) / budget.limit) * 100;
      const twoHundredShare = ((perImageTokens * 200) / budget.limit) * 100;
      if (estimateMonthNode) {
        estimateMonthNode.textContent = `${formatPercent(imageShare)} of cap`;
      }
      if (estimateMonthCostNode) {
        const hundredCost = perImageCost === null ? null : perImageCost * 100;
        const twoHundredCost = perImageCost === null ? null : perImageCost * 200;
        estimateMonthCostNode.textContent = [
          `100 images: ${formatPercent(hundredShare)} · ${hundredCost === null ? "—" : formatCurrency(hundredCost)}`,
          `200 images: ${formatPercent(twoHundredShare)} · ${twoHundredCost === null ? "—" : formatCurrency(twoHundredCost)}`
        ].join(" | ");
      }
    }
  }

  function renderUsage(payload) {
    const usage = getUsage(payload);
    const total = usage?.total ?? "—";
    if (usageTotalNode) {
      usageTotalNode.textContent = formatTokenCount(total);
    }

    if (usage) {
      log(
        "info",
        "API token usage",
        `input ${usage.input ?? "?"} · output ${usage.output ?? "?"} · total ${total}`
      );
    }
  }

  function renderBudget(payload) {
    const budget = getBudget(payload);

    if (!budget) {
      if (monthUsedNode) {
        monthUsedNode.textContent = "0";
      }
      if (monthRemainingNode) {
        monthRemainingNode.textContent = "Unlimited";
      }
      return;
    }

    if (monthUsedNode) {
      monthUsedNode.textContent = String(budget.used ?? 0);
    }

    if (monthRemainingNode) {
      monthRemainingNode.textContent =
        budget.limit === null ? "Unlimited" : String(budget.remaining ?? 0);
    }

    const remainingLabel = budget.limit === null ? "unlimited" : `${budget.remaining ?? 0} left`;
    log(
      "info",
      "Monthly budget",
      budget.limit === null
        ? `unlimited · used ${budget.used ?? 0}`
        : `used ${budget.used ?? 0} / ${budget.limit} · ${remainingLabel}`
    );
  }

  function showRawResponse(value) {
    currentRawResponse = value;
    if (rawNode) {
      rawNode.textContent = JSON.stringify(value, null, 2);
    }
    if (copyRawButton) {
      copyRawButton.disabled = false;
    }
  }

  function resetResponseState() {
    setStatus("Idle", "muted");
    if (scoreNode) scoreNode.textContent = "0";
    if (confidenceNode) confidenceNode.textContent = "0%";
    if (tokenCountNode) tokenCountNode.textContent = "0";
    if (numberTotalNode) numberTotalNode.textContent = "0";
    if (modifierTotalNode) modifierTotalNode.textContent = "0";
    if (bonusNode) bonusNode.textContent = "0";
    if (multiplierNode) multiplierNode.textContent = "Off";
    if (usageTotalNode) usageTotalNode.textContent = "0";
    if (monthUsedNode) monthUsedNode.textContent = "0";
    if (monthRemainingNode) monthRemainingNode.textContent = "Unlimited";
    if (estimateImageNode) estimateImageNode.textContent = "—";
    if (estimateImageCostNode) estimateImageCostNode.textContent = "—";
    if (estimate100Node) estimate100Node.textContent = "—";
    if (estimate100CostNode) estimate100CostNode.textContent = "—";
    if (estimate200Node) estimate200Node.textContent = "—";
    if (estimate200CostNode) estimate200CostNode.textContent = "—";
    if (estimateMonthNode) estimateMonthNode.textContent = "—";
    if (estimateMonthCostNode) estimateMonthCostNode.textContent = "—";
    if (uploadSizeNode) uploadSizeNode.textContent = "0 KB";
    if (latencyNode) latencyNode.textContent = "0 ms";
    if (tokenList) tokenList.innerHTML = '<div class="scan-debug-empty">Select an image to begin.</div>';
    renderWarnings([]);
    if (rawNode) rawNode.textContent = "{}";
    if (copyRawButton) copyRawButton.disabled = true;
    currentRawResponse = null;
  }

  async function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      log("error", "Unsupported file", "Choose an image file.");
      return;
    }

    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = "";
    }

    currentFile = file;
    currentImageDataUrl = "";
    currentPreparedImage = null;
    updateFileMeta(file);

    currentPreviewUrl = URL.createObjectURL(file);
    setPreview(currentPreviewUrl);
    resetResponseState();

    log("info", "Image selected", `${file.name} · ${Math.round(file.size / 1024)} KB`);
    if (runButton) {
      runButton.disabled = false;
    } else {
      void recognizeCurrentImage();
    }
  }

  async function recognizeCurrentImage() {
    if (!currentFile) {
      log("warn", "No image selected", "Choose or capture an image first.");
      return;
    }

    if (runButton) runButton.disabled = true;
    if (pickButton) pickButton.disabled = true;
    if (clearButton) clearButton.disabled = true;

    const startedAt = performance.now();

    try {
      setStatus("Uploading", "primary");
      clearWarnings();
      log("info", "Preparing image", currentFile.name);

      let imageDataUrl = currentImageDataUrl;
      if (!imageDataUrl) {
        const preparedImage = await window.Flip7ScanImage.prepareScanImageForUpload(currentFile);
        currentPreparedImage = preparedImage;
        imageDataUrl = preparedImage.imageDataUrl;
        currentImageDataUrl = imageDataUrl;

        if (uploadSizeNode) {
          uploadSizeNode.textContent = formatBytes(preparedImage.uploadBytes);
        }

        log(
          "info",
          "Image compressed",
          `${formatBytes(preparedImage.originalBytes)} -> ${formatBytes(preparedImage.uploadBytes)}${
            preparedImage.width && preparedImage.height ? ` · ${preparedImage.width}x${preparedImage.height}` : ""
          }`
        );

        if (preparedImage.warning) {
          log("warn", "Compression fallback", preparedImage.warning);
        }
      }

      log("info", "Sending request", "/api/scan/recognize");

      const response = await fetch("/api/scan/recognize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageDataUrl,
          model: modelInput?.value?.trim() || undefined,
          imageMeta: currentPreparedImage
            ? {
                originalBytes: currentPreparedImage.originalBytes,
                uploadBytes: currentPreparedImage.uploadBytes,
                width: currentPreparedImage.width,
                height: currentPreparedImage.height,
                originalType: currentPreparedImage.originalType,
                outputType: currentPreparedImage.outputType,
                resized: currentPreparedImage.resized
              }
            : undefined,
          includeRawResponse: true
        })
      });

      const payload = await response.json().catch(() => ({}));
      const latency = performance.now() - startedAt;
      showRawResponse(payload);
      renderUsage(payload);
      renderBudget(payload);
      renderEstimates(payload);
      if (latencyNode) {
        latencyNode.textContent = formatLatency(latency);
      }

      if (!response.ok) {
        const errorMessage = typeof payload.error === "string" ? payload.error : "Recognition failed.";
        setStatus("Failed", "danger");
        renderWarnings([errorMessage]);
        log("error", "Recognition failed", `${errorMessage} · ${formatLatency(latency)}`);
        return;
      }

      const tokens = Array.isArray(payload.tokens) ? payload.tokens : [];
      const confidence = typeof payload.confidence === "number" ? payload.confidence : 0;
      const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
      const stats = renderStats(tokens, confidence);

      renderTokens(tokens);
      renderWarnings(warnings);
      setStatus("Ready", "success");
      log(
        "success",
        "Recognition complete",
        `${tokens.length} tokens · score ${stats.total} · ${formatLatency(latency)}`
      );
      log("info", "Model", String(payload.model || "unknown"));
    } catch (error) {
      const latency = performance.now() - startedAt;
      const message = error instanceof Error ? error.message : "Unexpected recognition error.";
      setStatus("Failed", "danger");
      renderWarnings([message]);
      showRawResponse({ error: message });
      if (latencyNode) {
        latencyNode.textContent = formatLatency(latency);
      }
      log("error", "Request error", `${message} · ${formatLatency(latency)}`);
    } finally {
      if (pickButton) pickButton.disabled = false;
      if (clearButton) clearButton.disabled = false;
      if (runButton) runButton.disabled = !currentFile;
    }
  }

  function clearCurrentImage() {
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = "";
    }

    currentFile = null;
    currentImageDataUrl = "";
    currentPreparedImage = null;
    updateFileMeta(null);
    setPreview("");
    resetResponseState();
    if (fileInput) fileInput.value = "";
    if (runButton) runButton.disabled = true;
    log("info", "Cleared state", "Ready for a new image.");
  }

  pickButton?.addEventListener("click", () => fileInput?.click());
  dropzone?.addEventListener("click", () => fileInput?.click());
  runButton?.addEventListener("click", () => {
    void recognizeCurrentImage();
  });
  clearButton?.addEventListener("click", clearCurrentImage);

  fileInput?.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    void handleFile(file);
  });

  dropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");
  });

  dropzone?.addEventListener("dragleave", () => {
    dropzone.classList.remove("is-dragover");
  });

  dropzone?.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
    const [file] = event.dataTransfer?.files || [];
    if (file) {
      void handleFile(file);
    }
  });

  copyRawButton?.addEventListener("click", async () => {
    if (!currentRawResponse) {
      return;
    }

    const rawText = JSON.stringify(currentRawResponse, null, 2);
    try {
      await navigator.clipboard.writeText(rawText);
      log("success", "Copied raw JSON", "Placed the latest response on the clipboard.");
    } catch {
      log("warn", "Clipboard blocked", "Could not copy the response automatically.");
    }
  });

  resetResponseState();
  log("info", "Debug page ready", "Choose an image to start.");
})();
