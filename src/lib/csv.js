import { MATCH_CSV_HEADER } from "./constants.js";

function escapeCsvValue(value) {
  const normalized = value == null ? "" : String(value);

  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replaceAll(`"`, `""`)}"`;
}

function toCsvRow(values) {
  return values.map(escapeCsvValue).join(",");
}

export function matchesToCsv(matches) {
  const rows = [
    toCsvRow(MATCH_CSV_HEADER),
    ...matches.map((match) =>
      toCsvRow([
        match.tournament,
        match.radiantTeam,
        match.direTeam,
        match.killTeam1,
        match.killTeam2,
        match.map,
        match.seriesId,
        match.winner,
        match.date,
        match.patch,
      ]),
    ),
  ];

  return `${rows.join("\n")}\n`;
}
