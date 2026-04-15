import express from "express";

import { config } from "./lib/config.js";
import { matchesToCsv } from "./lib/csv.js";
import { getLeagues, getMatches } from "./lib/opendota.js";
import { normalizeMatchFilters, validateTier } from "./lib/validation.js";

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    previewLimit: config.previewLimit,
    exportLimit: config.exportLimit,
  });
});

app.get("/api/leagues", async (request, response, next) => {
  try {
    const tier = validateTier(request.query.tier || "professional");
    const search = `${request.query.search ?? ""}`;
    const leagues = await getLeagues(tier, search);

    response.json({
      tier,
      count: leagues.length,
      items: leagues,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/matches/preview", async (request, response, next) => {
  try {
    const filters = normalizeMatchFilters(request.body);
    const result = await getMatches(filters, config.previewLimit);

    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/matches/export", async (request, response, next) => {
  try {
    const filters = normalizeMatchFilters(request.body);
    const result = await getMatches(filters, config.exportLimit);
    const csv = matchesToCsv(result.matches);
    const fileDate = new Date().toISOString().slice(0, 10);

    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="dota2-league-export-${fileDate}.csv"`,
    );
    response.setHeader("X-Total-Rows", String(result.total));
    response.setHeader("X-Returned-Rows", String(result.returned));
    response.setHeader("X-Truncated", String(result.truncated));
    response.send(csv);
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  const status = /OpenDota request failed/.test(message)
    ? 502
    : /must be|cannot be|Select at least one league/.test(message)
      ? 400
      : 500;

  response.status(status).json({
    error: message,
  });
});

app.listen(config.port, config.host, () => {
  console.log(`League Exporter listening on http://${config.host}:${config.port}`);
});
