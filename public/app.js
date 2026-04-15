const state = {
  exportLimit: null,
  previewLimit: null,
  tier: "professional",
  allLeagues: false,
  leagues: [],
  selectedLeagueIds: new Set(),
  excludedLeagueIds: new Set(),
  previewRows: [],
  previewLeagueStats: [],
  hasPreview: false,
};

const form = document.querySelector("#filters-form");
const startDateInput = document.querySelector("#start-date");
const endDateInput = document.querySelector("#end-date");
const leagueSearchInput = document.querySelector("#league-search");
const leagueList = document.querySelector("#league-list");
const leaguePicker = document.querySelector("#league-picker");
const selectedLeagues = document.querySelector("#selected-leagues");
const excludedLeagues = document.querySelector("#excluded-leagues");
const leagueCount = document.querySelector("#league-count");
const selectionCount = document.querySelector("#selection-count");
const excludedCount = document.querySelector("#excluded-count");
const feedback = document.querySelector("#feedback");
const resultsMeta = document.querySelector("#results-meta");
const resultsBody = document.querySelector("#results-body");
const previewButton = document.querySelector("#preview-button");
const exportButton = document.querySelector("#export-button");
const connectionStatus = document.querySelector("#connection-status");
const filterSummary = document.querySelector("#filter-summary");
const previewCap = document.querySelector("#preview-cap");
const exportCap = document.querySelector("#export-cap");
const allLeaguesToggle = document.querySelector("#all-leagues-toggle");
const clearSelectionButton = document.querySelector("#clear-selection");
const clearExclusionsButton = document.querySelector("#clear-exclusions");
const previewLeagueList = document.querySelector("#preview-league-list");
const previewLeagueSummary = document.querySelector("#preview-league-summary");

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function setFeedback(message, variant = "") {
  feedback.textContent = message;
  feedback.className = variant ? `feedback ${variant}` : "feedback";
}

function setButtonsBusy(isBusy) {
  previewButton.disabled = isBusy;
  exportButton.disabled = isBusy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function getLeagueById(leagueId) {
  return state.leagues.find((league) => league.leagueId === leagueId) || null;
}

function leagueNameById(leagueId) {
  return (
    getLeagueById(leagueId)?.name ||
    state.previewLeagueStats.find((league) => league.leagueId === leagueId)?.name ||
    `League ${leagueId}`
  );
}

function currentFilters() {
  return {
    tier: state.tier,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
    allLeagues: state.allLeagues,
    leagueIds: [...state.selectedLeagueIds].sort((left, right) => left - right),
    excludedLeagueIds: [...state.excludedLeagueIds].sort((left, right) => left - right),
  };
}

function ensureClientFilters() {
  if (!state.allLeagues && state.selectedLeagueIds.size === 0) {
    throw new Error("Select at least one league or enable all leagues.");
  }
}

function renderTopbar() {
  const scopeLabel = state.allLeagues
    ? `All ${state.tier} leagues${state.excludedLeagueIds.size ? ` minus ${state.excludedLeagueIds.size} excluded` : ""}`
    : state.selectedLeagueIds.size > 0
      ? `${state.selectedLeagueIds.size} ${state.tier} leagues selected`
      : `Choose ${state.tier} leagues`;

  filterSummary.textContent = scopeLabel;
  previewCap.textContent = state.previewLimit == null ? "-" : state.previewLimit.toLocaleString();
  exportCap.textContent = state.exportLimit == null ? "-" : state.exportLimit.toLocaleString();
}

function renderSelectedLeagues() {
  const selected = state.leagues.filter((league) => state.selectedLeagueIds.has(league.leagueId));
  selectionCount.textContent = state.allLeagues
    ? "All leagues active"
    : `${selected.length} selected`;
  clearSelectionButton.disabled = selected.length === 0;

  if (selected.length === 0) {
    selectedLeagues.innerHTML = state.allLeagues
      ? '<p class="hint">All leagues mode is enabled. Manual league selection is optional.</p>'
      : '<p class="hint">No leagues selected yet.</p>';
    return;
  }

  selectedLeagues.innerHTML = selected
    .map(
      (league) => `
        <span class="chip">
          ${escapeHtml(league.name)}
          <button
            type="button"
            data-remove-selected-league="${league.leagueId}"
            aria-label="Remove ${escapeHtml(league.name)}"
          >
            ×
          </button>
        </span>
      `,
    )
    .join("");
}

function renderExcludedLeagues() {
  const excluded = [...state.excludedLeagueIds]
    .map((leagueId) => ({
      leagueId,
      name: leagueNameById(leagueId),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  excludedCount.textContent = `${excluded.length} excluded`;
  clearExclusionsButton.disabled = excluded.length === 0;

  if (excluded.length === 0) {
    excludedLeagues.innerHTML = '<p class="hint">No leagues excluded.</p>';
    return;
  }

  excludedLeagues.innerHTML = excluded
    .map(
      (league) => `
        <span class="chip chip-muted">
          ${escapeHtml(league.name)}
          <button
            type="button"
            data-remove-excluded-league="${league.leagueId}"
            aria-label="Restore ${escapeHtml(league.name)}"
          >
            ×
          </button>
        </span>
      `,
    )
    .join("");
}

function renderLeagueList() {
  const search = leagueSearchInput.value.trim().toLowerCase();
  const filtered = state.leagues.filter((league) =>
    search ? league.name.toLowerCase().includes(search) : true,
  );

  leagueCount.textContent = search
    ? `${filtered.length} of ${state.leagues.length} leagues`
    : `${state.leagues.length} leagues available`;

  leagueSearchInput.disabled = state.allLeagues;
  leaguePicker.classList.toggle("is-disabled", state.allLeagues);

  if (state.allLeagues) {
    leagueList.innerHTML = `
      <div class="mode-hint">
        All ${escapeHtml(state.tier)} leagues are active. Turn this option off to choose leagues manually.
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    leagueList.innerHTML = '<p class="hint">No leagues match this search.</p>';
    return;
  }

  leagueList.innerHTML = filtered
    .map((league) => {
      const selected = state.selectedLeagueIds.has(league.leagueId);
      const lastMatchAt = league.lastMatchAt ? formatDate(league.lastMatchAt) : "Unknown";
      const firstMatchAt = league.firstMatchAt ? formatDate(league.firstMatchAt) : "Unknown";

      return `
        <button
          type="button"
          class="league-item ${selected ? "selected" : ""}"
          data-league-picker-id="${league.leagueId}"
          aria-pressed="${selected ? "true" : "false"}"
        >
          <div class="league-topline">
            <span class="league-name">${escapeHtml(league.name)}</span>
            <span class="league-badge">${escapeHtml(league.tier)}</span>
          </div>
          <div class="league-subline">
            <span class="league-details">League ID ${league.leagueId}</span>
            ${
              league.hasMatchesBefore2023
                ? '<span class="league-badge legacy">started before 2023</span>'
                : ""
            }
          </div>
          <div class="league-details">
            First match: ${firstMatchAt}<br />
            Last match: ${lastMatchAt}<br />
            Matches indexed: ${league.matchCount.toLocaleString()}
          </div>
        </button>
      `;
    })
    .join("");
}

function normalizePreviewLeagueStats(leagues) {
  if (!Array.isArray(leagues)) {
    return [];
  }

  return leagues
    .map((league) => ({
      leagueId: Number(league.leagueId ?? 0),
      name: `${league.name ?? ""}`,
      matches: Number(league.matchCount ?? 0),
    }))
    .filter((league) => Number.isInteger(league.leagueId) && league.leagueId > 0 && league.name)
    .sort((left, right) => {
      if (right.matches !== left.matches) {
        return right.matches - left.matches;
      }

      return left.name.localeCompare(right.name);
    });
}

function renderResults(result, emptyMessage = "Run a preview to inspect matches before export.") {
  if (!result) {
    resultsMeta.textContent = "Run a preview to inspect matches.";
    resultsBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">${escapeHtml(emptyMessage)}</td>
      </tr>
    `;
    return;
  }

  resultsMeta.textContent = result.truncated
    ? `Showing ${result.returned} of ${result.total} matches`
    : `${result.returned} matches loaded`;

  if (result.matches.length === 0) {
    resultsBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">${escapeHtml(emptyMessage)}</td>
      </tr>
    `;
    return;
  }

  resultsBody.innerHTML = result.matches
    .map(
      (match) => `
        <tr>
          <td>${escapeHtml(match.tournament)}</td>
          <td>${escapeHtml(match.radiantTeam)}</td>
          <td>${escapeHtml(match.direTeam)}</td>
          <td>${match.killTeam1} - ${match.killTeam2}</td>
          <td>${match.map}</td>
          <td>${match.seriesId}</td>
          <td>${escapeHtml(match.winner)}</td>
          <td>${formatDate(match.date)}</td>
          <td>${escapeHtml(match.patch)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderPreviewSidebar() {
  previewLeagueSummary.textContent = `${state.previewLeagueStats.length} leagues`;

  if (state.previewLeagueStats.length === 0) {
    previewLeagueList.innerHTML = `
      <p class="hint">Run a preview to list leagues found in the current result set.</p>
    `;
    return;
  }

  const actionLabel = state.allLeagues ? "Exclude" : "Remove";

  previewLeagueList.innerHTML = state.previewLeagueStats
    .map(
      (league) => `
        <article class="preview-league-card">
          <div class="preview-league-copy">
            <strong>${escapeHtml(league.name)}</strong>
            <span>${league.matches} preview matches</span>
          </div>
          <button
            type="button"
            class="inline-action"
            data-sidebar-remove-league="${league.leagueId}"
          >
            ${actionLabel}
          </button>
        </article>
      `,
    )
    .join("");
}

function refreshFilterPanels() {
  renderTopbar();
  renderSelectedLeagues();
  renderExcludedLeagues();
  renderLeagueList();
}

function clearPreviewState(message = "Run a preview to inspect matches before export.") {
  state.previewRows = [];
  state.previewLeagueStats = [];
  state.hasPreview = false;
  renderResults(null, message);
  renderPreviewSidebar();
}

function markPreviewDirty(message = "Filters changed. Run preview again.") {
  if (!state.hasPreview) {
    return;
  }

  clearPreviewState(message);
  setFeedback(message);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string" ? payload : payload?.error || "Request failed unexpectedly.";
    throw new Error(message);
  }

  return payload;
}

async function loadHealth() {
  const payload = await fetchJson("/api/health");
  state.previewLimit = payload.previewLimit;
  state.exportLimit = payload.exportLimit;
  connectionStatus.textContent = "OpenDota ready";
  renderTopbar();
}

async function loadLeagues() {
  setFeedback("Loading leagues from OpenDota Explorer...");
  const query = new URLSearchParams({
    tier: state.tier,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
  });
  const payload = await fetchJson(`/api/leagues?${query.toString()}`);
  state.leagues = payload.items;
  state.selectedLeagueIds.clear();
  state.excludedLeagueIds.clear();
  refreshFilterPanels();
  clearPreviewState();
  setFeedback(`Loaded ${payload.count} ${state.tier} leagues from OpenDota Explorer.`, "success");
}

async function runPreview(options = {}) {
  ensureClientFilters();

  const filters = currentFilters();
  setButtonsBusy(true);
  setFeedback(options.loadingMessage || "Querying OpenDota for preview data...");

  try {
    const payload = await fetchJson("/api/matches/preview", {
      method: "POST",
      body: JSON.stringify(filters),
    });

    state.hasPreview = true;
    state.previewRows = payload.matches;
    state.previewLeagueStats = normalizePreviewLeagueStats(payload.leagues);
    renderResults(payload, "No matches found for the current filters.");
    renderPreviewSidebar();
    setFeedback(
      options.successMessage ||
        (payload.truncated
          ? `Preview limited to ${payload.returned} of ${payload.total} matches. Narrow filters for a tighter slice.`
          : `Preview loaded with ${payload.returned} matches.`),
      payload.matches.length > 0 ? "success" : "",
    );
  } finally {
    setButtonsBusy(false);
  }
}

async function downloadCsv() {
  ensureClientFilters();

  const filters = currentFilters();
  setButtonsBusy(true);
  setFeedback("Generating CSV export...");

  try {
    const response = await fetch("/api/matches/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filters),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "CSV export failed.");
    }

    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filenameHeader = response.headers.get("Content-Disposition") || "";
    const filenameMatch = filenameHeader.match(/filename="(.+)"/);
    const returned = Number(response.headers.get("X-Returned-Rows") || "0");
    const total = Number(response.headers.get("X-Total-Rows") || "0");
    const truncated = response.headers.get("X-Truncated") === "true";

    link.href = href;
    link.download = filenameMatch?.[1] || "dota2-league-export.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);

    setFeedback(
      truncated
        ? `CSV downloaded with ${returned} of ${total} matches because the export limit was reached.`
        : `CSV downloaded with ${returned} matches.`,
      "success",
    );
  } finally {
    setButtonsBusy(false);
  }
}

async function removeLeagueFromPreview(leagueId) {
  const leagueName = leagueNameById(leagueId);

  if (state.allLeagues) {
    state.excludedLeagueIds.add(leagueId);
  } else {
    state.selectedLeagueIds.delete(leagueId);
  }

  refreshFilterPanels();

  if (!state.allLeagues && state.selectedLeagueIds.size === 0) {
    clearPreviewState("No leagues remain in the current filter.");
    setFeedback(`${leagueName} removed. Choose more leagues or enable all leagues.`);
    return;
  }

  await runPreview({
    loadingMessage: `Updating preview after changing ${leagueName}...`,
    successMessage: state.allLeagues
      ? `${leagueName} excluded from the filter.`
      : `${leagueName} removed from the filter.`,
  });
}

document.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const removeSelectedLeagueId = target.getAttribute("data-remove-selected-league");

  if (removeSelectedLeagueId) {
    state.selectedLeagueIds.delete(Number(removeSelectedLeagueId));
    refreshFilterPanels();
    markPreviewDirty();
    return;
  }

  const removeExcludedLeagueId = target.getAttribute("data-remove-excluded-league");

  if (removeExcludedLeagueId) {
    state.excludedLeagueIds.delete(Number(removeExcludedLeagueId));
    refreshFilterPanels();
    markPreviewDirty();
    return;
  }

  const previewSidebarLeagueId = target.getAttribute("data-sidebar-remove-league");

  if (previewSidebarLeagueId) {
    try {
      await removeLeagueFromPreview(Number(previewSidebarLeagueId));
    } catch (error) {
      setButtonsBusy(false);
      setFeedback(error instanceof Error ? error.message : "Unable to update preview.", "error");
    }
    return;
  }

  const leagueButton = target.closest("[data-league-picker-id]");

  if (!leagueButton || state.allLeagues) {
    return;
  }

  const leagueId = Number(leagueButton.getAttribute("data-league-picker-id"));

  if (state.selectedLeagueIds.has(leagueId)) {
    state.selectedLeagueIds.delete(leagueId);
  } else {
    state.selectedLeagueIds.add(leagueId);
  }

  refreshFilterPanels();
  markPreviewDirty();
});

leagueSearchInput.addEventListener("input", () => {
  renderLeagueList();
});

clearSelectionButton.addEventListener("click", () => {
  state.selectedLeagueIds.clear();
  refreshFilterPanels();
  markPreviewDirty();
});

clearExclusionsButton.addEventListener("click", () => {
  state.excludedLeagueIds.clear();
  refreshFilterPanels();
  markPreviewDirty();
});

form.addEventListener("change", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target instanceof HTMLInputElement && target.name === "tier") {
    state.tier = target.value;
    await loadLeagues();
    return;
  }

  if (target instanceof HTMLInputElement && (target.id === "start-date" || target.id === "end-date")) {
    if (!startDateInput.value || !endDateInput.value) {
      return;
    }

    if (endDateInput.value < startDateInput.value) {
      markPreviewDirty("Fix the date range, then run preview again.");
      setFeedback("End date cannot be before start date.", "error");
      return;
    }

    await loadLeagues();
    return;
  }

  if (target instanceof HTMLInputElement && target.id === "all-leagues-toggle") {
    state.allLeagues = target.checked;
    refreshFilterPanels();
    markPreviewDirty();
    setFeedback(
      state.allLeagues
        ? "All leagues mode enabled. You can exclude leagues from the preview sidebar."
        : "Manual league selection enabled.",
    );
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await runPreview();
  } catch (error) {
    setButtonsBusy(false);
    setFeedback(error instanceof Error ? error.message : "Preview failed.", "error");
  }
});

exportButton.addEventListener("click", async () => {
  try {
    await downloadCsv();
  } catch (error) {
    setButtonsBusy(false);
    setFeedback(error instanceof Error ? error.message : "CSV export failed.", "error");
  }
});

function initializeDefaults() {
  startDateInput.value = "2023-01-01";
  endDateInput.value = todayString();
  allLeaguesToggle.checked = false;
}

async function initialize() {
  initializeDefaults();
  renderTopbar();
  renderPreviewSidebar();

  try {
    await loadHealth();
    await loadLeagues();
  } catch (error) {
    connectionStatus.textContent = "OpenDota unavailable";
    setFeedback(error instanceof Error ? error.message : "Initialization failed.", "error");
  }
}

initialize();
