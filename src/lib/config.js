function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export const config = {
  host: process.env.HOST || "0.0.0.0",
  port: toPositiveInt(process.env.PORT, 3000),
  opendotaApiBaseUrl: process.env.OPENDOTA_API_BASE_URL || "https://api.opendota.com/api",
  opendotaApiKey: process.env.OPENDOTA_API_KEY || "",
  requestTimeoutMs: toPositiveInt(process.env.REQUEST_TIMEOUT_MS, 20_000),
  leaguesCacheTtlMs: toPositiveInt(process.env.LEAGUES_CACHE_TTL_MS, 3_600_000),
  queryCacheTtlMs: toPositiveInt(process.env.QUERY_CACHE_TTL_MS, 300_000),
  previewLimit: toPositiveInt(process.env.PREVIEW_LIMIT, 200),
  exportLimit: toPositiveInt(process.env.EXPORT_LIMIT, 10_000),
};
