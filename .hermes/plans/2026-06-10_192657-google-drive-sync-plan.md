# Google Drive Sync Implementation Plan for Finora

Created: 2026-06-10 19:26 +07
Project: `/mnt/d/hobbies/finance-local` (`D:\hobbies\finance-local`)

## Goal

Add optional Google Drive sync so a user can sign in with their own Google account, store their Finora data in that account, retrieve it on another browser/device, and keep local IndexedDB data synced without introducing a custom backend.

## Current data/storage/export/restore findings

### App shape

- Vite + React 19 + TypeScript SPA.
- Main data state lives in `src/store/finance-store.ts` as a Zustand store, but persistence is not Zustand persistence; store methods call repository functions directly.
- App initialization happens in `src/components/AppShell.tsx`:
  - `useEffect(() => void initialize(), [initialize])`
  - `initialize()` reads `repository.getFinanceData()` and blocks UI until `initialized` is true.

### Database

- IndexedDB is managed by Dexie in `src/storage/db.ts`.
- Database name: `finos-local`.
- Version: `1`.
- Tables:
  - `transactions`: `&id, date, type, categoryId, accountId, fromAccountId, toAccountId, recurringId`
  - `categories`: `&id, [type+name], isActive, sortOrder`
  - `accounts`: `&id, name, type`
  - `budgets`: `&id, month`
  - `recurringTransactions`: `&id, nextRunDate, isActive`
  - `settings`: `&id`
  - `metadata`: `&key`

### Repository/data flow

`src/storage/repository.ts` is the main persistence boundary.

Important functions:

- `initializeStorage()` seeds defaults and metadata:
  - default categories/accounts/settings from `src/domain/defaults.ts`
  - metadata keys: `initialized`, `schemaVersion`, `demoLoaded`
- `getFinanceData()` returns a `FinanceData` snapshot for the app.
- Mutations (`addTransaction`, `updateTransaction`, `deleteTransaction`, account/category/budget/settings methods) write to Dexie.
- Store helper `mutate()` in `src/store/finance-store.ts` refreshes full data after every repository write.
- `replaceAllData(data: StoredData)` clears core tables and bulk-adds backup data inside one transaction, then sets metadata.
- `clearAllData()` clears everything, then re-initializes defaults.

### Backup/export/restore

Implemented in `src/domain/backup.ts` and `src/pages/SettingsPage.tsx`.

- `createBackup(input)` builds a complete JSON backup:
  - `schemaVersion`
  - `exportedAt`
  - `appName: "Finora"`
  - `transactions`
  - `categories`
  - `accounts`
  - `budgets`
  - `recurringTransactions`
  - `settings`
- `parseBackup(json)` parses JSON and validates via `backupSchema` from `src/domain/schemas.ts`, returning `StoredData`.
- JSON export is a browser download from `SettingsPage.exportJson()` via `src/lib/format.ts:downloadFile()`.
- CSV export is transactions-only via PapaParse (`createTransactionCsv`).
- Restore is file input based:
  - reads selected `.json`
  - `parseBackup(json)`
  - opens confirm dialog
  - `restoreData(pendingRestore)` -> store `restoreData()` -> repository `replaceAllData()`
- Existing restore semantics are full replacement, not merge.

### Validation/schema

- Domain types in `src/domain/types.ts` define `StoredData` and `BackupData`.
- Runtime validation in `src/domain/schemas.ts` validates backup shape.
- Accepted backup `appName`: `"Finora"` or legacy `"FinOS"`.
- `SCHEMA_VERSION` is currently `1` in `src/domain/defaults.ts`.

### Existing UI/privacy text

Current copy explicitly says there is no cloud sync:

- `src/components/AppShell.tsx`: sidebar card uses `shell.localWorkspace` / `shell.noCloudSync`.
- `src/locales/en.json` and `src/locales/th.json`: privacy text says data stays local, no login, no cloud sync, no financial-data network request.

These must be updated when sync exists, but should still make sync optional and transparent.

## Recommended architecture

### Use Google Drive API directly from the browser

Because the app is a static SPA and the requested flow is “user logs in themselves with Google Drive,” use Google Identity Services (GIS) OAuth in the browser and call Google Drive REST APIs with the user's access token.

Do not put a Google OAuth client secret in the frontend. Use a public OAuth Web client ID configured in Google Cloud Console.

Recommended dependency choices:

- Option A: use `@react-oauth/google` for React-friendly GIS token flow.
- Option B: load GIS script manually and wrap `google.accounts.oauth2.initTokenClient` in a small service.

I recommend Option A for less custom auth code.

Required Google scope for private app data:

- `https://www.googleapis.com/auth/drive.appdata`

Optional scope for a visible/exportable Drive backup file:

- `https://www.googleapis.com/auth/drive.file`

For MVP, use only `drive.appdata` and store one hidden app-data JSON file. This keeps permissions minimal and avoids the app seeing the user’s whole Drive.

### Store a single encrypted-or-plain JSON snapshot in Drive `appDataFolder`

MVP remote file:

- Name: `finora-backup.json`
- Parent: `appDataFolder`
- MIME type: `application/json`
- Content: current `BackupData` JSON plus sync metadata if needed.

Drive `appDataFolder` is per user and app, hidden from normal Drive UI. It is made for app settings/data sync.

### Add a sync metadata layer

Current data model has no robust per-record sync metadata, tombstones, or category/settings timestamps. Therefore, the safest first version is full-snapshot sync with explicit conflict handling.

Add local sync metadata to IndexedDB `metadata` table or a new Dexie table:

```ts
interface SyncMetadata {
  provider: "google-drive";
  enabled: boolean;
  googleUserEmail?: string;
  remoteFileId?: string;
  remoteModifiedTime?: string;
  lastSyncAt?: string;
  lastUploadAt?: string;
  lastDownloadAt?: string;
  lastLocalHash?: string;
  lastRemoteHash?: string;
  localRevision: number;
  deviceId: string;
  status: "idle" | "syncing" | "error" | "conflict";
  lastError?: string;
}
```

Keep OAuth access tokens in memory only where possible. If token persistence is desired, prefer short-lived session/local storage and clearly explain privacy tradeoff. Do not store refresh tokens in the browser.

### Sync strategy

MVP behavior:

1. User clicks “Connect Google Drive”.
2. Browser obtains a Drive access token.
3. App searches `appDataFolder` for `finora-backup.json`.
4. Cases:
   - No remote file:
     - Upload current local backup.
     - Save remote file ID + modifiedTime to local metadata.
   - Remote file exists and local workspace is empty/default:
     - Download, validate via `parseBackup`, then `replaceAllData` after user confirms.
   - Remote file exists and local workspace has data:
     - Compare remote metadata (`modifiedTime`, backup `exportedAt`, and hash) with local metadata.
     - If remote is clearly newer, prompt: “Restore from Drive / Keep local and overwrite Drive / Cancel.”
     - If local is newer, offer “Upload local to Drive.”
     - If both changed since last sync, show conflict dialog.
5. After connection, after each local mutation, debounce upload a fresh full backup to Drive.
6. On app startup / route shell initialization, if sync is enabled and a valid token exists, check Drive for remote changes before or after loading local data. If no valid token, show “Drive disconnected; sign in to sync.”

Do not silently replace local data from Drive without confirmation unless local metadata proves the remote file is the direct continuation of the same sync chain and there are no unsynced local changes.

## Implementation phases

### Phase 1 — Extract reusable backup snapshot helpers

Files likely to change:

- `src/domain/backup.ts`
- `src/storage/repository.ts`
- `src/store/finance-store.ts`
- `src/storage/repository.test.ts`
- `src/domain/schemas.test.ts`

Tasks:

1. Add repository helper to create a backup from current IndexedDB state:

```ts
export async function getBackupData(): Promise<BackupData> {
  const data = await getFinanceData();
  return createBackup({
    transactions: data.transactions,
    categories: data.categories,
    accounts: data.accounts,
    budgets: data.budgets,
    recurringTransactions: data.recurringTransactions,
    settings: data.settings,
  });
}
```

2. Keep Settings JSON export using this helper instead of assembling from component state.
3. Add a stable hash helper for backup content:
   - create canonical JSON (`JSON.stringify` with deterministic object key order), or hash the exact upload payload.
   - Browser API: `crypto.subtle.digest("SHA-256", ...)`.
4. Add tests proving:
   - backup snapshot includes all domain collections.
   - `parseBackup(JSON.stringify(createBackup(...)))` remains valid.

Reasoning:

- Google Drive upload should use the same canonical backup shape as manual export.
- Centralizing snapshot generation prevents UI/store drift.

### Phase 2 — Add sync metadata persistence

Files likely to change:

- `src/domain/types.ts`
- `src/domain/schemas.ts`
- `src/storage/db.ts`
- `src/storage/repository.ts`
- `src/storage/repository.test.ts`

Tasks:

1. Add `SyncMetadata` type.
2. Add repository methods:
   - `getSyncMetadata()`
   - `updateSyncMetadata(partial)`
   - `clearSyncMetadata()`
   - `bumpLocalRevision()` or update metadata inside every successful mutation.
3. Store sync metadata either:
   - in existing `metadata` table under key `googleDriveSync`, or
   - in a dedicated `syncMetadata` table in Dexie version 2.
4. If using existing `metadata`, no Dexie schema migration is needed; this is the lowest-risk route.
5. Add tests:
   - default metadata is disabled/idle.
   - metadata survives data writes.
   - `clearAllData()` either clears sync metadata only after explicit disconnect, or preserves it depending on UX decision.

Recommendation:

- Preserve sync connection metadata across `clearAllData()` unless user chooses “Disconnect Google Drive,” because clearing local finance data should not necessarily disconnect the app from Drive.
- If user clears all local data while sync is enabled, require confirmation whether to also overwrite Drive with empty/default data.

### Phase 3 — Add Google Drive auth/config

Files likely to add/change:

- `package.json`
- `src/main.tsx`
- `src/integrations/google-drive/auth.ts` or `src/services/google-drive/auth.ts`
- `src/vite-env.d.ts`
- `.env.example` if this repo uses one, otherwise create it.

Tasks:

1. Add dependency:

```bash
npm install @react-oauth/google
```

2. Add Vite env var:

```env
VITE_GOOGLE_CLIENT_ID=your-web-oauth-client-id.apps.googleusercontent.com
```

3. Wrap app with Google OAuth provider in `src/main.tsx`:

```tsx
<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <App />
</GoogleOAuthProvider>
```

4. Add typed env declaration in `src/vite-env.d.ts`.
5. Build auth hook/service:
   - `connectGoogleDrive()` asks for Drive appdata scope.
   - `disconnectGoogleDrive()` clears token/session metadata.
   - expose auth state: signed out, signed in, expired, error.
6. Handle missing `VITE_GOOGLE_CLIENT_ID` with a friendly disabled-state UI, not a crash.

Google Cloud setup needed for the app owner:

1. Create/select Google Cloud project.
2. Enable Google Drive API.
3. Configure OAuth consent screen.
4. Create OAuth 2.0 Client ID of type “Web application”.
5. Add authorized JavaScript origins:
   - local dev origin, e.g. `http://localhost:5173`
   - production origin when deployed.
6. Add test users while OAuth app is in testing.

### Phase 4 — Implement Drive API client

Files likely to add:

- `src/integrations/google-drive/drive-client.ts`
- `src/integrations/google-drive/types.ts`
- `src/integrations/google-drive/errors.ts`
- `src/integrations/google-drive/drive-client.test.ts` if fetch can be mocked in Vitest.

Core API functions:

```ts
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const BACKUP_FILE_NAME = "finora-backup.json";

async function findBackupFile(token: string): Promise<DriveFile | null>;
async function downloadBackupFile(token: string, fileId: string): Promise<BackupData>;
async function createBackupFile(token: string, backup: BackupData): Promise<DriveFile>;
async function updateBackupFile(token: string, fileId: string, backup: BackupData): Promise<DriveFile>;
```

Drive queries:

- Search:

```text
name = 'finora-backup.json' and 'appDataFolder' in parents and trashed = false
```

Endpoint:

```text
GET /drive/v3/files?spaces=appDataFolder&q=...&fields=files(id,name,modifiedTime,md5Checksum,size)
```

- Download content:

```text
GET /drive/v3/files/{fileId}?alt=media
```

- Create file multipart upload:

```text
POST /upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size
```

Metadata:

```json
{
  "name": "finora-backup.json",
  "parents": ["appDataFolder"],
  "mimeType": "application/json"
}
```

- Update content:

```text
PATCH /upload/drive/v3/files/{fileId}?uploadType=media&fields=id,name,modifiedTime,size
```

Error handling:

- `401`: token expired; ask user to reconnect/sign in.
- `403`: missing scope/API not enabled; show setup/error copy.
- `404`: remote file missing; treat as first sync/create flow.
- network failure: keep local data, mark sync error, retry later.

### Phase 5 — Add sync service/orchestrator

Files likely to add/change:

- `src/services/sync/google-drive-sync.ts`
- `src/store/sync-store.ts` or extend `src/store/finance-store.ts`
- `src/store/finance-store.ts`
- `src/storage/repository.ts`

Responsibilities:

1. Compute local backup and hash.
2. Discover or create remote file.
3. Download and validate remote backup.
4. Decide action:
   - upload local
   - restore remote
   - conflict
   - no-op
5. Debounce uploads after local mutations.
6. Expose status for UI.

Recommended design:

- Keep `finance-store.ts` focused on finance data.
- Add `sync-store.ts` for auth/sync status and commands.
- Add an event/callback from finance mutations to sync:
  - simplest: after `mutate()` refreshes data, call `queueGoogleDriveUpload()` if enabled.
  - cleaner: repository mutation functions update local revision; sync store watches revision.

Pseudo-flow:

```ts
async function syncNow({ mode }: { mode: "auto" | "manual" }) {
  setStatus("syncing");
  const localBackup = await repository.getBackupData();
  const localHash = await hashBackup(localBackup);
  const metadata = await repository.getSyncMetadata();
  const remoteFile = await drive.findBackupFile(token);

  if (!remoteFile) {
    const created = await drive.createBackupFile(token, localBackup);
    await repository.updateSyncMetadata({ remoteFileId: created.id, lastLocalHash: localHash, ... });
    return;
  }

  const remoteBackup = await drive.downloadBackupFile(token, remoteFile.id);
  const remoteHash = await hashBackup(remoteBackup);

  if (remoteHash === metadata.lastRemoteHash && localHash === metadata.lastLocalHash) return;

  if (localHash !== metadata.lastLocalHash && remoteHash !== metadata.lastRemoteHash) {
    setConflict({ localBackup, remoteBackup, remoteFile });
    return;
  }

  if (remoteHash !== metadata.lastRemoteHash) {
    // Prompt unless safe auto-restore is enabled and no local changes.
    setPendingRemoteRestore(remoteBackup);
    return;
  }

  if (localHash !== metadata.lastLocalHash) {
    await drive.updateBackupFile(token, remoteFile.id, localBackup);
  }
}
```

### Phase 6 — UI in Settings

Files likely to change/add:

- `src/pages/SettingsPage.tsx`
- `src/components/GoogleDriveSyncPanel.tsx` (new, preferred)
- `src/components/ui/*` only if existing components need status UI support
- `src/locales/en.json`
- `src/locales/th.json`
- `src/components/AppShell.tsx`

Add a new panel in Settings near Backup and Restore:

- Title: “Google Drive sync”
- States:
  - not configured (missing client ID)
  - disconnected
  - connecting
  - connected as email (if available)
  - syncing
  - synced, last sync time
  - error
  - conflict
- Actions:
  - Connect Google Drive
  - Sync now
  - Restore from Drive
  - Upload local to Drive
  - Disconnect
- Conflict dialog:
  - “Drive and this device both changed since the last sync.”
  - Buttons: “Use Drive data”, “Keep this device and overwrite Drive”, “Cancel”
  - Show remote modified time and local last changed/sync time.

Update copy:

- `shell.noCloudSync` should become conditional:
  - disconnected: “Local workspace · connect Drive in Settings”
  - connected: “Google Drive sync enabled”
- Privacy text should say:
  - data stays in this browser unless the user enables Google Drive sync.
  - Drive sync sends encrypted/plain JSON backup to the user's Google Drive app data (depending on encryption decision).

### Phase 7 — Optional encryption at rest in Drive

This is optional but important for finance data.

Because appDataFolder data is still readable by Google/account access and by this app’s token, consider client-side encryption before upload.

Options:

1. No encryption MVP:
   - fastest implementation.
   - clear privacy copy: “Your backup is stored as JSON in your Google Drive app data.”
2. Passphrase encryption:
   - use Web Crypto AES-GCM.
   - user sets a sync passphrase.
   - derive key with PBKDF2/Argon2id (PBKDF2 available natively; Argon2 requires dependency/WASM).
   - remote JSON wrapper includes salt/iv/version/ciphertext.
   - downside: if passphrase is lost, Drive backup cannot be restored.
3. Device-local generated key:
   - easier UX but does not solve multi-device restore unless key is exported/transferred.

Recommendation:

- MVP can ship without encryption only if UI explicitly states what is uploaded.
- If this will hold real personal finance data, plan a follow-up passphrase encryption phase before production release.

### Phase 8 — Tests and validation

Current test command attempted:

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm test -- --runInBand
```

Result: failed before running tests because Rollup optional native package is missing:

```text
Error: Cannot find module @rollup/rollup-linux-x64-gnu. npm has a bug related to optional dependencies...
```

Do not treat this as app test failure; dependency install is incomplete/broken. Fix by reinstalling dependencies before implementation validation, for example:

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm install
```

Then run:

```bash
PATH=/home/freshy/.hermes/node/bin:$PATH npm test
PATH=/home/freshy/.hermes/node/bin:$PATH npm run typecheck
PATH=/home/freshy/.hermes/node/bin:$PATH npm run build
```

Add/extend tests:

1. Backup/hash tests:
   - stable hash for same backup content.
   - hash changes after a transaction is added.
2. Repository sync metadata tests:
   - default disabled state.
   - remote file id persists.
   - sync status/error can be saved and cleared.
3. Drive client tests with mocked `fetch`:
   - finds file in `appDataFolder`.
   - creates file with correct metadata/parent.
   - updates file content.
   - maps 401/403/404 errors to user-facing errors.
4. Sync service tests:
   - no remote -> upload local.
   - remote newer and local unchanged -> pending restore.
   - local newer and remote unchanged -> upload.
   - both changed -> conflict.
5. Settings UI tests:
   - connect button shown when disconnected.
   - sync status text shown when connected.
   - conflict actions call correct sync service methods.

Manual validation:

1. Start app locally with `VITE_GOOGLE_CLIENT_ID`.
2. Connect a Google test account.
3. Confirm Drive OAuth prompt asks only for app-data permission.
4. Add transaction, wait for sync, reload app.
5. Clear IndexedDB in browser devtools, reconnect, restore from Drive.
6. Open app in another browser profile, connect same Google account, restore data.
7. Simulate conflict:
   - Browser A syncs.
   - Browser B restores and edits offline.
   - Browser A edits and syncs.
   - Browser B syncs and sees conflict prompt.
8. Disconnect Drive and confirm local data remains.

## Key risks/tradeoffs

### Browser OAuth token lifetime

A pure frontend app cannot safely hold a long-lived refresh token. Access tokens expire. The user may need to reconnect/sign in periodically. Silent refresh may work only while Google session/browser policy allows it.

Mitigation:

- Show clear disconnected/expired status.
- Keep app fully usable offline/local.
- Queue local changes for next manual/automatic sync.

### Full-snapshot sync conflicts

Current domain lacks per-record modification metadata for all entities and lacks tombstones for deletes. Full-snapshot sync is safe and simple but conflicts are coarse.

Mitigation:

- MVP uses explicit conflict dialog.
- Later phase can add per-record sync metadata and tombstones if true multi-device concurrent editing is required.

### Privacy/security

Financial data uploaded as plain JSON is sensitive.

Mitigation:

- Use minimal `drive.appdata` scope.
- Consider passphrase encryption before production.
- Update privacy copy accurately.

### Demo/default data interactions

`replaceAllData()` sets `demoLoaded` false. Syncing demo data may upload sample records; restoring from Drive disables demoLoaded even if records are demo IDs.

Mitigation:

- Decide whether demo data should be syncable.
- If restored data contains only `demo-` records, optionally preserve/demo-detect metadata.

### Clear-all semantics

Today `clearAllData()` wipes local data and reinitializes defaults. If sync is enabled, it could accidentally upload an empty/default backup and erase Drive data.

Mitigation:

- When sync enabled, clear-all must ask whether to:
  - clear only this device and pause sync, or
  - clear this device and overwrite Drive.

## Open decisions before implementation

1. Should Google Drive backup be plain JSON or passphrase-encrypted?
2. Should sync be fully automatic after every mutation, manual-only, or automatic with a “Sync now” fallback?
3. Should Drive data live only in hidden `appDataFolder`, or should users also be able to export a visible Drive backup file?
4. Should “Clear all data” also clear remote Drive backup, pause sync, or prompt each time?
5. Should demo data be allowed to sync?

## Recommended MVP scope

Implement this first:

1. Browser Google sign-in with `drive.appdata` only.
2. Hidden `finora-backup.json` in `appDataFolder`.
3. Full-snapshot upload/download using existing backup schema.
4. Sync metadata stored in existing Dexie `metadata` table.
5. Manual “Sync now” plus debounced upload after local mutations while connected.
6. Explicit conflict dialog; no silent destructive restore.
7. Update Settings + shell/locales to make cloud sync optional and transparent.

Defer:

- Per-record merge.
- Background refresh-token style sync.
- Visible Google Drive folder picker.
- Encryption, unless this is intended to be production-ready for real finance data immediately.
