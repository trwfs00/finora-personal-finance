import { hashBackup } from "../domain/backup";
import type { BackupData } from "../domain/types";
import * as repository from "../storage/repository";
import {
  createBackupFile,
  downloadBackupFile,
  findBackupFile,
  updateBackupFile,
  type DriveFile,
} from "./drive-client";
import { decideSyncAction, type SyncDecision } from "./sync-decisions";

export type SyncNowResult =
  | { type: "created"; file: DriveFile }
  | { type: "uploaded"; file: DriveFile }
  | { type: "noop" }
  | { type: "prompt-restore-remote"; remoteBackup: BackupData; remoteFile: DriveFile }
  | { type: "conflict"; localBackup: BackupData; remoteBackup: BackupData; remoteFile: DriveFile };

export async function syncNow(token: string): Promise<SyncNowResult> {
  await repository.updateSyncMetadata({ enabled: true, status: "syncing", lastError: undefined });

  try {
    const localBackup = await repository.getBackupData();
    const localHash = await hashBackup(localBackup);
    const metadata = await repository.getSyncMetadata();
    const remoteFile = await findBackupFile(token);

    if (!remoteFile) {
      const created = await createBackupFile(token, localBackup);
      await repository.updateSyncMetadata({
        enabled: true,
        remoteFileId: created.id,
        remoteModifiedTime: created.modifiedTime,
        lastSyncAt: new Date().toISOString(),
        lastUploadAt: new Date().toISOString(),
        lastLocalHash: localHash,
        lastRemoteHash: localHash,
        hasPendingLocalChanges: false,
        status: "synced",
      });
      return { type: "created", file: created };
    }

    const remoteBackup = await downloadBackupFile(token, remoteFile.id);
    const remoteHash = await hashBackup(remoteBackup);
    const decision = decideSyncAction({
      localBackup,
      localHash,
      remoteBackup,
      remoteHash,
      metadata,
    });

    return await applyDecision(token, decision, {
      localBackup,
      localHash,
      remoteBackup,
      remoteHash,
      remoteFile,
    });
  } catch (error) {
    await repository.updateSyncMetadata({
      status: "error",
      lastError: error instanceof Error ? error.message : "Google Drive sync failed",
    });
    throw error;
  }
}

export async function uploadLocalToDrive(token: string, remoteFileId?: string) {
  const localBackup = await repository.getBackupData();
  const localHash = await hashBackup(localBackup);
  const file = remoteFileId
    ? await updateBackupFile(token, remoteFileId, localBackup)
    : await createBackupFile(token, localBackup);

  await repository.updateSyncMetadata({
    enabled: true,
    remoteFileId: file.id,
    remoteModifiedTime: file.modifiedTime,
    lastSyncAt: new Date().toISOString(),
    lastUploadAt: new Date().toISOString(),
    lastLocalHash: localHash,
    lastRemoteHash: localHash,
    hasPendingLocalChanges: false,
    status: "synced",
    lastError: undefined,
  });

  return file;
}

export async function restoreRemoteBackup(remoteBackup: BackupData, remoteFile: DriveFile) {
  await repository.replaceAllData(remoteBackup);
  const localBackup = await repository.getBackupData();
  const localHash = await hashBackup(localBackup);
  const remoteHash = await hashBackup(remoteBackup);

  await repository.updateSyncMetadata({
    enabled: true,
    remoteFileId: remoteFile.id,
    remoteModifiedTime: remoteFile.modifiedTime,
    lastSyncAt: new Date().toISOString(),
    lastDownloadAt: new Date().toISOString(),
    lastLocalHash: localHash,
    lastRemoteHash: remoteHash,
    hasPendingLocalChanges: false,
    status: "synced",
    lastError: undefined,
  });
}

async function applyDecision(
  token: string,
  decision: SyncDecision,
  context: {
    localBackup: BackupData;
    localHash: string;
    remoteBackup: BackupData;
    remoteHash: string;
    remoteFile: DriveFile;
  },
): Promise<SyncNowResult> {
  switch (decision.type) {
    case "noop":
      await repository.updateSyncMetadata({
        enabled: true,
        remoteFileId: context.remoteFile.id,
        remoteModifiedTime: context.remoteFile.modifiedTime,
        lastSyncAt: new Date().toISOString(),
        lastLocalHash: context.localHash,
        lastRemoteHash: context.remoteHash,
        hasPendingLocalChanges: false,
        status: "synced",
      });
      return { type: "noop" };
    case "upload-local": {
      const file = await uploadLocalToDrive(token, context.remoteFile.id);
      return { type: "uploaded", file };
    }
    case "prompt-restore-remote":
      await repository.updateSyncMetadata({ status: "conflict" });
      return {
        type: "prompt-restore-remote",
        remoteBackup: context.remoteBackup,
        remoteFile: context.remoteFile,
      };
    case "conflict":
      await repository.updateSyncMetadata({ status: "conflict" });
      return {
        type: "conflict",
        localBackup: context.localBackup,
        remoteBackup: context.remoteBackup,
        remoteFile: context.remoteFile,
      };
  }
}
