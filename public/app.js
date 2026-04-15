const state = {
  exportLimit: null,
  previewLimit: null,
  tier: "professional",
  leagues: [],
  selectedLeagueIds: new Set(),
  previewRows: [],
};

const form = document.querySelector("#filters-form");
const startDateInput = document.querySelector("#start-date");
const endDateInput = document.querySelector("#end-date");
const leagueSearchInput = document.querySelector("#league-search");
const leagueList = document.querySelector("#league-list");
const selectedLeagues = document.querySelector("#selected-leagues");
const leagueCount = document.querySelector("#league-count");
const selectionCount = document.querySelector("#selection-count");
const feedback = document.querySelector("#feedback");
const resultsMeta = document.querySelector("#results-meta");
const resultsBody = document.querySelector("#results-body");
const previewButton = document.querySelector("#preview-button");
const exportButton = document.querySelector("#export-button");
const connectionStatus = document.querySelector("#connection-status");

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

function currentFilters() {
  return {
    tier: state.tier,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
    leagueIds: [...state.selectedLeagueIds],
  };
}

function renderSelectedLeagues() {
  const selected = state.leagues.filter((league) => state.selectedLeagueIds.has(league.leagueId));
  selectionCount.textContent = `${selected.length} selected`;

  if (selected.length === 0) {
    selectedLeagues.innerHTML = '<p class="hint">No leagues selected yet.</p>';
    return;
  }

  selectedLeagues.innerHTML = selected
    .map(
      (league) => `
        <span class="chip">
          ${escapeHtml(league.name)}
          <button type="button" data-remove-league="${league.leagueId}" aria-label="Remove ${escapeHtml(league.name)}">
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

  leagueCount.textContent = `${filtered.length} leagues loaded`;

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
          data-league-id="${league.leagueId}"
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

function renderResults(result) {
  resultsMeta.textContent = `Showing ${result.returned} of ${result.total} matches`;

  if (result.matches.length === 0) {
    resultsBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">No matches found for the current filters.</td>
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
  connectionStatus.textContent = `Preview ${payload.previewLimit} · Export ${payload.exportLimit}`;
}

async function loadLeagues() {
  setFeedback("Loading leagues from OpenDota Explorer...");
  const payload = await fetchJson(`/api/leagues?tier=${encodeURIComponent(state.tier)}`);
  state.leagues = payload.items;
  state.selectedLeagueIds.clear();
  renderSelectedLeagues();
  renderLeagueList();
  setFeedback(
    `Loaded ${payload.count} ${state.tier} leagues from OpenDota Explorer.`,
    "success",
  );
}

async function runPreview() {
  const filters = currentFilters();
  setButtonsBusy(true);
  setFeedback("Querying OpenDota for preview data...");

  try {
    const payload = await fetchJson("/api/matches/preview", {
      method: "POST",
      body: JSON.stringify(filters),
    });

    state.previewRows = payload.matches;
    renderResults(payload);
    setFeedback(
      payload.truncated
        ? `Preview limited to ${payload.returned} of ${payload.total} matches. Narrow filters for a tighter slice.`
        : `Preview loaded with ${payload.returned} matches.`,
      payload.matches.length > 0 ? "success" : "",
    );
  } finally {
    setButtonsBusy(false);
  }
}

async function downloadCsv() {
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

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const removeLeagueId = target.getAttribute("data-remove-league");

  if (removeLeagueId) {
    state.selectedLeagueIds.delete(Number(removeLeagueId));
    renderSelectedLeagues();
    renderLeagueList();
    return;
  }

  const leagueButton = target.closest("[data-league-id]");

  if (!leagueButton) {
    return;
  }

  const leagueId = Number(leagueButton.getAttribute("data-league-id"));

  if (state.selectedLeagueIds.has(leagueId)) {
    state.selectedLeagueIds.delete(leagueId);
  } else {
    state.selectedLeagueIds.add(leagueId);
  }

  renderSelectedLeagues();
  renderLeagueList();
});

leagueSearchInput.addEventListener("input", () => {
  renderLeagueList();
});

form.addEventListener("change", async (event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement && target.name === "tier") {
    state.tier = target.value;
    await loadLeagues();
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
}

async function initialize() {
  initializeDefaults();

  try {
    await loadHealth();
    await loadLeagues();
  } catch (error) {
    connectionStatus.textContent = "OpenDota unavailable";
    setFeedback(error instanceof Error ? error.message : "Initialization failed.", "error");
  }
}

initialize();
