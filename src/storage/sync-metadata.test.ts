import { beforeEach, describe, expect, it } from "vitest";

import { addTransaction, clearAllData, getBackupData, getSyncMetadata, updateSyncMetadata } from "./repository";

describe("sync metadata repository", () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it("returns a disabled idle default when no sync metadata exists", async () => {
    await expect(getSyncMetadata()).resolves.toMatchObject({
      provider: "google-drive",
      enabled: false,
      status: "idle",
      localRevision: 0,
    });
  });

  it("persists Google Drive sync metadata across normal finance writes", async () => {
    await updateSyncMetadata({
      enabled: true,
      remoteFileId: "drive-file-1",
      lastRemoteHash: "abc",
      status: "synced",
    });

    await addTransaction({
      type: "expense",
      amount: 42,
      date: "2026-06-10",
      categoryId: "cat-expense-food",
      accountId: "acct-cash",
    });

    await expect(getSyncMetadata()).resolves.toMatchObject({
      enabled: true,
      remoteFileId: "drive-file-1",
      lastRemoteHash: "abc",
      status: "idle",
      localRevision: 1,
    });
  });

  it("creates a validated backup snapshot directly from IndexedDB", async () => {
    await addTransaction({
      type: "expense",
      amount: 99,
      date: "2026-06-10",
      categoryId: "cat-expense-food",
      accountId: "acct-cash",
      note: "Snapshot test",
    });

    const backup = await getBackupData();

    expect(backup.appName).toBe("Finora");
    expect(backup.transactions).toHaveLength(1);
    expect(backup.transactions[0]?.note).toBe("Snapshot test");
  });
});
