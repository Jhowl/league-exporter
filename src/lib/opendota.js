import { config } from "./config.js";
import { readCache, writeCache } from "./cache.js";
import { buildLeaguesSql, buildMatchesSql } from "./sql.js";

function buildUrl(pathname, params = {}) {
  const url = new URL(pathname, `${config.opendotaApiBaseUrl}/`);

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  if (config.opendotaApiKey) {
    url.searchParams.set("api_key", config.opendotaApiKey);
  }

  return url;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(config.requestTimeoutMs),
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenDota request failed (${response.status}): ${details || response.statusText}`);
  }

  return response.json();
}

async function queryExplorer(sql, cacheKey, ttlMs) {
  const cached = readCache(cacheKey);

  if (cached) {
    return cached;
  }

  const data = await fetchJson(buildUrl("explorer", { sql }));
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  writeCache(cacheKey, rows, ttlMs);
  return rows;
}

function toIsoDateTime(epochSeconds) {
  return new Date(Number(epochSeconds) * 1000).toISOString();
}

export async function getLeagues(tier, search = "") {
  const rows = await queryExplorer(
    buildLeaguesSql(tier),
    `leagues:${tier}`,
    config.leaguesCacheTtlMs,
  );

  const normalizedSearch = search.trim().toLowerCase();

  return rows
    .map((row) => ({
      leagueId: Number(row.leagueid),
      name: row.name,
      tier: row.tier,
      matchCount: Number(row.match_count ?? 0),
      firstMatchAt: row.first_match_time ? toIsoDateTime(row.first_match_time) : null,
      lastMatchAt: row.last_match_time ? toIsoDateTime(row.last_match_time) : null,
      hasMatchesBefore2023: Boolean(row.has_matches_before_2023),
    }))
    .filter((league) => league.name && Number.isInteger(league.leagueId))
    .filter((league) =>
      normalizedSearch ? league.name.toLowerCase().includes(normalizedSearch) : true,
    );
}

export async function getMatches(filters, limit) {
  const key = [
    "matches",
    filters.tier,
    filters.startDate,
    filters.endDate,
    filters.leagueIds.join(","),
    limit,
  ].join(":");

  const rows = await queryExplorer(
    buildMatchesSql(filters, limit),
    key,
    config.queryCacheTtlMs,
  );

  const matches = rows.map((row) => ({
    tournament: row.tournament,
    radiantTeam: row.radiant_team,
    direTeam: row.dire_team,
    killTeam1: Number(row.kill_team_1 ?? 0),
    killTeam2: Number(row.kill_team_2 ?? 0),
    map: Number(row.map_number ?? 1),
    seriesId: Number(row.series_id ?? 0),
    winner: row.winner,
    date: toIsoDateTime(row.start_time),
    patch: row.patch == null ? "" : String(row.patch),
  }));

  const total = rows.length > 0 ? Number(rows[0].total_rows ?? rows.length) : 0;

  return {
    total,
    returned: matches.length,
    truncated: total > matches.length,
    matches,
  };
}
