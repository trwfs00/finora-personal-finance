import { afterEach, describe, expect, it, vi } from "vitest";

import { createBackup } from "../domain/backup";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "../domain/defaults";
import { createBackupFile, downloadBackupFile, findBackupFile, updateBackupFile } from "./drive-client";

const token = "access-token";
const backup = createBackup({
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  accounts: DEFAULT_ACCOUNTS,
  budgets: [],
  recurringTransactions: [],
  savingsGoals: [],
  debts: [],
  settings: DEFAULT_SETTINGS,
});

describe("Google Drive client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("finds the hidden appDataFolder backup file", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          files: [{ id: "file-1", name: "finora-backup.json", modifiedTime: "2026-06-10T00:00:00.000Z" }],
        }),
      ),
    );

    await expect(findBackupFile(token)).resolves.toMatchObject({ id: "file-1" });
    expect(fetchMock.mock.calls[0]?.[0]?.toString()).toContain("spaces=appDataFolder");
    expect(fetchMock.mock.calls[0]?.[0]?.toString()).toContain("finora-backup.json");
  });

  it("returns null when Drive has no backup file", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ files: [] })));

    await expect(findBackupFile(token)).resolves.toBeNull();
  });

  it("downloads and validates a Drive backup", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(backup)));

    await expect(downloadBackupFile(token, "file-1")).resolves.toMatchObject({ appName: "Finora" });
  });

  it("creates the backup file in appDataFolder", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "file-1", name: "finora-backup.json" })));

    await expect(createBackupFile(token, backup)).resolves.toMatchObject({ id: "file-1" });
    const body = fetchMock.mock.calls[0]?.[1]?.body?.toString() ?? "";
    expect(body).toContain('"parents":["appDataFolder"]');
  });

  it("updates an existing Drive backup file", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "file-1", name: "finora-backup.json" })));

    await expect(updateBackupFile(token, "file-1", backup)).resolves.toMatchObject({ id: "file-1" });
    expect(fetchMock.mock.calls[0]?.[0]?.toString()).toContain("/upload/drive/v3/files/file-1");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
  });
});
