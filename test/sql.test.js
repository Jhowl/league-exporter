import test from "node:test";
import assert from "node:assert/strict";

import { buildLeaguesSql, buildMatchesSql, buildPreviewLeaguesSql } from "../src/lib/sql.js";

test("buildLeaguesSql reads leagues via explorer and includes pre-2023 flag", () => {
  const sql = buildLeaguesSql({
    tier: "professional",
    startDate: "2024-01-01",
    endDate: "2024-01-31",
  });

  assert.match(sql, /FROM matches m/i);
  assert.match(sql, /JOIN leagues l USING \(leagueid\)/i);
  assert.match(sql, /has_matches_before_2023/i);
  assert.match(sql, /l\.tier = 'professional'/i);
  assert.match(sql, /m\.start_time >= extract\(epoch from timestamp '2024-01-01T00:00:00Z'\)/i);
});

test("buildMatchesSql enforces selected league ids and 2023 floor", () => {
  const sql = buildMatchesSql(
    {
      tier: "premium",
      startDate: "2024-01-05",
      endDate: "2024-02-05",
      allLeagues: false,
      leagueIds: [12, 34],
      excludedLeagueIds: [],
    },
    200,
  );

  assert.match(sql, /m\.leagueid IN \(12, 34\)/i);
  assert.match(sql, /LEFT JOIN teams rt ON rt\.team_id = m\.radiant_team_id/i);
  assert.match(sql, /l\.tier = 'premium'/i);
  assert.match(sql, /m\.start_time >= extract\(epoch from timestamp '2023-01-01T00:00:00Z'\)/i);
  assert.match(sql, /LIMIT 200/i);
});

test("buildMatchesSql supports all-leagues mode with exclusions", () => {
  const sql = buildMatchesSql(
    {
      tier: "professional",
      startDate: "2024-03-01",
      endDate: "2024-03-31",
      allLeagues: true,
      leagueIds: [],
      excludedLeagueIds: [111, 222],
    },
    100,
  );

  assert.doesNotMatch(sql, /m\.leagueid IN \(/i);
  assert.match(sql, /m\.leagueid NOT IN \(111, 222\)/i);
});

test("buildPreviewLeaguesSql aggregates leagues across the full filtered result set", () => {
  const sql = buildPreviewLeaguesSql({
    tier: "professional",
    startDate: "2024-03-01",
    endDate: "2024-03-31",
    allLeagues: true,
    leagueIds: [],
    excludedLeagueIds: [111],
  });

  assert.match(sql, /GROUP BY league_id, tournament/i);
  assert.match(sql, /COUNT\(\*\)::int AS preview_match_count/i);
  assert.match(sql, /m\.leagueid NOT IN \(111\)/i);
  assert.doesNotMatch(sql, /LIMIT/i);
});
