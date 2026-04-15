import test from "node:test";
import assert from "node:assert/strict";

import { matchesToCsv } from "../src/lib/csv.js";

test("matchesToCsv writes the expected header order", () => {
  const csv = matchesToCsv([]);
  const header = csv.split("\n")[0];

  assert.equal(
    header,
    "tournament,Radiant (team),Dire (team),kill team 1,kill team 2,\"Mapa (1, 2, 3)\",series id,vencedor,data,patch",
  );
});

test("matchesToCsv escapes values that contain commas", () => {
  const csv = matchesToCsv([
    {
      tournament: "DreamLeague, Season 1",
      radiantTeam: "Team A",
      direTeam: "Team B",
      killTeam1: 22,
      killTeam2: 19,
      map: 1,
      seriesId: 2222,
      winner: "Team A",
      date: "2024-02-01T10:00:00.000Z",
      patch: "7.35d",
    },
  ]);

  assert.match(csv, /"DreamLeague, Season 1"/);
});
