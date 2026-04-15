import { MIN_EXPORT_DATE, SUPPORTED_TIERS } from "./constants.js";

function tierSql(tier) {
  if (!SUPPORTED_TIERS.includes(tier)) {
    throw new Error(`Unsupported tier: ${tier}`);
  }

  return `'${tier}'`;
}

function sqlDateTimestamp(dateString) {
  return `timestamp '${dateString}T00:00:00Z'`;
}

function addOneDay(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function leagueIdsSql(leagueIds) {
  return leagueIds.join(", ");
}

export function buildLeaguesSql(tier) {
  return `
    SELECT
      m.leagueid,
      l.name,
      l.tier,
      MIN(m.start_time) AS first_match_time,
      MAX(m.start_time) AS last_match_time,
      COUNT(*)::int AS match_count,
      CASE
        WHEN MIN(m.start_time) < extract(epoch from ${sqlDateTimestamp(MIN_EXPORT_DATE)})
        THEN TRUE
        ELSE FALSE
      END AS has_matches_before_2023
    FROM matches m
    JOIN leagues l USING (leagueid)
    WHERE TRUE
      AND m.leagueid IS NOT NULL
      AND COALESCE(l.name, '') <> ''
      AND l.tier = ${tierSql(tier)}
    GROUP BY m.leagueid, l.name, l.tier
    ORDER BY last_match_time DESC NULLS LAST, l.name ASC
    LIMIT 1500
  `;
}

export function buildMatchesSql(filters, limit) {
  const endExclusive = addOneDay(filters.endDate);

  return `
    WITH filtered_matches AS (
      SELECT
        m.match_id,
        l.name AS tournament,
        COALESCE(NULLIF(m.radiant_name, ''), CONCAT('Radiant #', COALESCE(m.radiant_team_id::text, 'unknown'))) AS radiant_team,
        COALESCE(NULLIF(m.dire_name, ''), CONCAT('Dire #', COALESCE(m.dire_team_id::text, 'unknown'))) AS dire_team,
        COALESCE(m.radiant_score, 0) AS kill_team_1,
        COALESCE(m.dire_score, 0) AS kill_team_2,
        CASE
          WHEN COALESCE(m.series_id, 0) = 0 THEN 1
          ELSE ROW_NUMBER() OVER (PARTITION BY m.series_id ORDER BY m.start_time ASC, m.match_id ASC)
        END AS map_number,
        COALESCE(NULLIF(m.series_id, 0), m.match_id) AS series_id,
        CASE
          WHEN m.radiant_win IS TRUE THEN COALESCE(NULLIF(m.radiant_name, ''), 'Radiant')
          WHEN m.radiant_win IS FALSE THEN COALESCE(NULLIF(m.dire_name, ''), 'Dire')
          ELSE 'Unknown'
        END AS winner,
        m.start_time,
        mp.patch,
        COUNT(*) OVER () AS total_rows
      FROM matches m
      JOIN leagues l USING (leagueid)
      JOIN match_patch mp USING (match_id)
      WHERE TRUE
        AND m.leagueid IN (${leagueIdsSql(filters.leagueIds)})
        AND l.tier = ${tierSql(filters.tier)}
        AND m.start_time >= extract(epoch from ${sqlDateTimestamp(MIN_EXPORT_DATE)})
        AND m.start_time >= extract(epoch from ${sqlDateTimestamp(filters.startDate)})
        AND m.start_time < extract(epoch from ${sqlDateTimestamp(endExclusive)})
    )
    SELECT
      tournament,
      radiant_team,
      dire_team,
      kill_team_1,
      kill_team_2,
      map_number,
      series_id,
      winner,
      start_time,
      patch,
      total_rows
    FROM filtered_matches
    ORDER BY start_time DESC, series_id DESC, map_number ASC
    LIMIT ${limit}
  `;
}
