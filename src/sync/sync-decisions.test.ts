import { describe, expect, it } from "vitest";

import type { BackupData } from "../domain/types";
import { decideSyncAction } from "./sync-decisions";

const backup = { appName: "Finora" } as BackupData;

describe("Google Drive sync decisions", () => {
  it("uploads local data when no remote backup exists", () => {
    expect(
      decideSyncAction({
        localBackup: backup,
        localHash: "local",
        remoteBackup: null,
        remoteHash: null,
        metadata: { lastLocalHash: undefined, lastRemoteHash: undefined },
      }),
    ).toEqual({ type: "upload-local" });
  });

  it("does nothing when local and remote match the last synced hashes", () => {
    expect(
      decideSyncAction({
        localBackup: backup,
        localHash: "same",
        remoteBackup: backup,
        remoteHash: "same",
        metadata: { lastLocalHash: "same", lastRemoteHash: "same" },
      }),
    ).toEqual({ type: "noop" });
  });

  it("prompts restore when only Drive changed since last sync", () => {
    expect(
      decideSyncAction({
        localBackup: backup,
        localHash: "base",
        remoteBackup: backup,
        remoteHash: "remote-new",
        metadata: { lastLocalHash: "base", lastRemoteHash: "remote-old" },
      }),
    ).toEqual({ type: "prompt-restore-remote" });
  });

  it("uploads local data when only this device changed since last sync", () => {
    expect(
      decideSyncAction({
        localBackup: backup,
        localHash: "local-new",
        remoteBackup: backup,
        remoteHash: "base",
        metadata: { lastLocalHash: "local-old", lastRemoteHash: "base" },
      }),
    ).toEqual({ type: "upload-local" });
  });

  it("reports a conflict when both local and Drive changed", () => {
    expect(
      decideSyncAction({
        localBackup: backup,
        localHash: "local-new",
        remoteBackup: backup,
        remoteHash: "remote-new",
        metadata: { lastLocalHash: "local-old", lastRemoteHash: "remote-old" },
      }),
    ).toEqual({ type: "conflict" });
  });
});
