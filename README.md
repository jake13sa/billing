# Billing Tracker

## Local development

Install the dependencies and run the Vue app with the existing JSON Server:

```sh
npm install
npm run dev
```

The local JSON Server is only for development. The deployed API uses PostgreSQL and requires `DATABASE_URL`, `APP_PASSWORD` (at least 12 characters), and `SESSION_SECRET` (at least 32 characters). `FRONTEND_ORIGIN` must match the deployed frontend origin.

## Deploy on Render

1. Push this repository to a Git provider and create a Render Blueprint from it using `render.yaml`.
2. Enter a strong `APP_PASSWORD` when prompted. Render generates `SESSION_SECRET` and creates the PostgreSQL database, API, and static frontend.
3. Open the frontend URL shown by Render. Sign in with `APP_PASSWORD`.

The frontend is an installable PWA. On Android, open its HTTPS URL in Chrome, open the browser menu, and tap **Install app** (or **Add to Home screen**). The installed icon launches in a standalone window. The app shell can load offline, but saving and loading payments still requires an internet connection to the API.

The API creates its `payments` table on startup. It exposes `GET`, `POST`, `PUT`, and `DELETE /payments`; all payment routes require a signed session obtained from `POST /auth/login`. The `/health` route checks database connectivity.

## Import existing `db.json` entries

The local `db.json` is intentionally not deployed with the frontend. To copy its current `payments` into the hosted database, use the PostgreSQL **external** connection URL from Render and run the import command from this repository. Keep the URL private and do not commit it.

PowerShell:

```powershell
$env:DATABASE_URL = Read-Host 'Render PostgreSQL external URL'
$env:NODE_ENV = 'production'
npm run db:import-json
Remove-Item Env:DATABASE_URL
Remove-Item Env:NODE_ENV
```

The importer keeps existing IDs and skips records whose IDs are already present, so it can be safely rerun. It does not delete or modify `db.json`.

## Build and lint

```sh
npm run build
npm run lint
```
