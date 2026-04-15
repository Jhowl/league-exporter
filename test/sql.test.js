import test from "node:test";
import assert from "node:assert/strict";

import { buildLeaguesSql, buildMatchesSql } from "../src/lib/sql.js";

test("buildLeaguesSql reads leagues via explorer and includes pre-2023 flag", () => {
  const sql = buildLeaguesSql("professional");

  assert.match(sql, /FROM matches m/i);
  assert.match(sql, /JOIN leagues l USING \(leagueid\)/i);
  assert.match(sql, /has_matches_before_2023/i);
  assert.match(sql, /l\.tier = 'professional'/i);
});

test("buildMatchesSql enforces selected league ids and 2023 floor", () => {
  const sql = buildMatchesSql(
    {
      tier: "premium",
      startDate: "2024-01-05",
      endDate: "2024-02-05",
      leagueIds: [12, 34],
    },
    200,
  );

  assert.match(sql, /m\.leagueid IN \(12, 34\)/i);
  assert.match(sql, /l\.tier = 'premium'/i);
  assert.match(sql, /m\.start_time >= extract\(epoch from timestamp '2023-01-01T00:00:00Z'\)/i);
  assert.match(sql, /LIMIT 200/i);
});
