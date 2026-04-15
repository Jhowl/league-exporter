import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMatchFilters } from "../src/lib/validation.js";

test("normalizeMatchFilters removes duplicate league ids", () => {
  const filters = normalizeMatchFilters({
    tier: "professional",
    startDate: "2023-01-01",
    endDate: "2023-01-31",
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
        leagueIds: [1],
      }),
    /cannot be before 2023-01-01/i,
  );
});
