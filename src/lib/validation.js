import { MIN_EXPORT_DATE, SUPPORTED_TIERS } from "./constants.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value) {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateTier(rawTier) {
  const tier = `${rawTier ?? ""}`.trim().toLowerCase();

  if (!SUPPORTED_TIERS.includes(tier)) {
    throw new Error(`Tier must be one of: ${SUPPORTED_TIERS.join(", ")}`);
  }

  return tier;
}

export function normalizeMatchFilters(rawBody) {
  const body = rawBody && typeof rawBody === "object" ? rawBody : {};
  const tier = validateTier(body.tier);
  const startDate = `${body.startDate ?? ""}`.trim();
  const endDate = `${body.endDate ?? ""}`.trim();

  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    throw new Error("startDate and endDate must be valid YYYY-MM-DD values.");
  }

  if (startDate < MIN_EXPORT_DATE) {
    throw new Error(`startDate cannot be before ${MIN_EXPORT_DATE}.`);
  }

  if (endDate < startDate) {
    throw new Error("endDate cannot be before startDate.");
  }

  const leagueIds = Array.isArray(body.leagueIds)
    ? [...new Set(body.leagueIds.map((value) => Number.parseInt(value, 10)).filter(Number.isInteger))]
    : [];

  if (leagueIds.length === 0) {
    throw new Error("Select at least one league.");
  }

  return {
    tier,
    startDate,
    endDate,
    leagueIds,
  };
}
