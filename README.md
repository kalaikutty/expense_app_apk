# Expense Tracker (Web + Android APK via Capacitor)

Expense Tracker is a Vite + React + Firebase app.
This repo now includes a real Capacitor Android wrapper and CI automation that builds an installable APK from the current web app source.

## What changed

- Real Android wrapper is included in the `android/` folder (Capacitor).
- Install modal downloads a real APK from GitHub Releases (tag: `apk-latest`), not a fake file.
- GitHub Actions workflow builds and publishes APK on every push to `main` or `master`.
- SMS parsing is not active in web mode (and browser SMS reading is not supported by standard web APIs).

## Run web app locally

1. Install dependencies:
	`npm install --legacy-peer-deps`
2. Start dev server:
	`npm run dev`

## Android wrapper workflow

1. Sync latest web build into Android project:
	`npm run cap:sync`
2. Open Android project in Android Studio:
	`npm run cap:open:android`
3. Local debug APK build (Windows):
	`npm run apk:build:debug`

Debug APK output:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Automated APK builds (GitHub)

Workflow file:
`.github/workflows/android-apk.yml`

Trigger:
- Push to `main`
- Push to `master`
- Manual run from Actions tab

Release artifact:
- Tag: `apk-latest`
- Asset: `expense-tracker-debug.apk`

This keeps APK aligned with your latest committed web app source. After web changes are committed and pushed, a new APK is produced automatically.

## Install modal APK configuration

Optional env variables:

- `VITE_GITHUB_REPO` (example: `kalaikutty/remix_expense_tracker`)
- `VITE_APK_DOWNLOAD_URL` (direct override URL)

If `VITE_APK_DOWNLOAD_URL` is set, the Install modal uses it directly.
Otherwise, it resolves the latest release from `VITE_GITHUB_REPO` and downloads the APK asset.
