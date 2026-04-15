# League Exporter

Dockerized web app to export Dota 2 league matches into CSV for AI analysis. The UI lets you:

- choose a tier: `professional` or `premium`
- search and select one or more leagues, or use all leagues in the selected tier
- pick a date range starting at `2023-01-01`
- preview matches in a dashboard before exporting
- remove leagues from the current preview using the right sidebar
- download a CSV with this header:

```js
export const matchCsvHeader = [
  "tournament",
  "Radiant (team)",
  "Dire (team)",
  "kill team 1",
  "kill team 2",
  "Mapa (1, 2, 3)",
  "series id",
  "vencedor",
  "data",
  "patch",
];
```

## Data source

- League options are loaded from `https://api.opendota.com/api/explorer?sql=` so the selector can include leagues that started before 2023.
- Match exports also use OpenDota Explorer SQL.
- Exported matches are constrained to dates from `2023-01-01` onward.

## Local run

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

3. Open:

```text
http://localhost:3000
```

## Docker

Build and run:

```bash
docker compose up --build
```

Or with plain Docker:

```bash
docker build -t league-exporter .
docker run --rm -p 3000:3000 league-exporter
```

## Tunnel

The server listens on `0.0.0.0`, so you can point a tunnel at your local port.

Cloudflare Tunnel example:

```bash
cloudflared tunnel --url http://localhost:3000
```

ngrok example:

```bash
ngrok http 3000
```

## Environment variables

- `PORT`: server port, default `3000`
- `HOST`: bind host, default `0.0.0.0`
- `OPENDOTA_API_BASE_URL`: default `https://api.opendota.com/api`
- `OPENDOTA_API_KEY`: optional API key
- `REQUEST_TIMEOUT_MS`: default `20000`
- `LEAGUES_CACHE_TTL_MS`: default `3600000`
- `QUERY_CACHE_TTL_MS`: default `300000`
- `PREVIEW_LIMIT`: default `200`
- `EXPORT_LIMIT`: default `10000`

## Tests

```bash
npm test
```
