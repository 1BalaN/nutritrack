# NutriTrack

NutriTrack is an offline-first React Native nutrition tracker built with Expo.

## What it does

- Daily diary with meal sections (breakfast/lunch/dinner/snack)
- Product catalog (manual + barcode/online search)
- Recipe builder and recipe-to-diary flow
- Analytics (day/period trends, macro distribution, day score, smart insights)
- Offline queue + background sync to Firebase Firestore
- Firebase anonymous auth with user-scoped data sync

## Tech Stack

- **App**: Expo + React Native + Expo Router
- **State/Data**: Zustand, React Query
- **Local DB**: SQLite + Drizzle ORM
- **Sync/Auth**: Firebase Firestore + Firebase Auth
- **Storage**: MMKV
- **Lists/UI performance**: LegendList
- **Testing**: Jest + jest-expo

## Project Structure

- `app/` — screens and navigation routes
- `src/components/` — reusable UI components
- `src/db/` — schema, migrations, repositories
- `src/hooks/` — query/mutation hooks
- `src/lib/` — domain logic (nutrition, analytics, auth, validation, etc.)
- `src/services/` — sync, queue, external service adapters
- `src/store/` — Zustand stores
- `src/__tests__/` — unit/integration tests

## Environment Setup

1. Copy env template:
   - `cp .env.example .env`
2. Fill required Firebase values:
   - `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`
3. Optional: fill FatSecret credentials for online product search.

## Firebase Console Setup

1. Enable **Authentication -> Sign-in method -> Anonymous**
2. Create Firestore database
3. Publish rules from `firestore.rules`

## Local Development

- `yarn start` — start Expo
- `yarn start:tunnel` — start Expo with tunnel
- `yarn android` / `yarn ios`

## Quality Checks

- `yarn typecheck`
- `yarn lint`
- `yarn test`

## Sync Model (high-level)

- Local writes are applied immediately (offline-first)
- Changes are enqueued in `pending_sync`
- Sync manager runs when network is available
- Retry uses exponential backoff
- Conflict policy is **last-write-wins** by `updatedAt`
- Firestore path is user-scoped: `users/{uid}/...`

## Release

- EAS profiles are configured in `eas.json` (`development`, `preview`, `production`)
- Use:
  - `docs/release-checklist.md`
  - `docs/testing-strategy.md`
  - `CHANGELOG.md`

## Notes

- Error boundary is enabled at app root to prevent full-app crash loops.
- Android tab screens include extra bottom inset to avoid clipped content under tab bar.
