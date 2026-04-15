import test from "node:test";
import assert from "node:assert/strict";

import { normalizeLeagueFilters, normalizeMatchFilters } from "../src/lib/validation.js";

test("normalizeMatchFilters removes duplicate league ids", () => {
  const filters = normalizeMatchFilters({
    tier: "professional",
    startDate: "2023-01-01",
    endDate: "2023-01-31",
    allLeagues: false,
    leagueIds: [7, 7, "9"],
  });

  assert.deepEqual(filters.leagueIds, [7, 9]);
});

test("normalizeMatchFilters rejects dates before 2023", () => {
  assert.throws(
    () =>
      normalizeMatchFilters({
        tier: "premium",
        startDate: "2022-12-31",
        endDate: "2023-01-02",
        allLeagues: false,
        leagueIds: [1],
      }),
    /cannot be before 2023-01-01/i,
  );
});

test("normalizeMatchFilters allows all leagues without explicit selections", () => {
  const filters = normalizeMatchFilters({
    tier: "professional",
    startDate: "2023-02-01",
    endDate: "2023-02-03",
    allLeagues: true,
    excludedLeagueIds: [4, "4", 7],
  });

  assert.equal(filters.allLeagues, true);
  assert.deepEqual(filters.leagueIds, []);
  assert.deepEqual(filters.excludedLeagueIds, [4, 7]);
});

test("normalizeLeagueFilters validates date window for league selector", () => {
  const filters = normalizeLeagueFilters({
    tier: "premium",
    startDate: "2024-02-01",
    endDate: "2024-02-29",
  });

  assert.equal(filters.tier, "premium");
  assert.equal(filters.startDate, "2024-02-01");
  assert.equal(filters.endDate, "2024-02-29");
});
