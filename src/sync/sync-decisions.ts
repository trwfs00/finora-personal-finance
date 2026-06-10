import type { BackupData } from "../domain/types";

export type SyncDecision =
  | { type: "noop" }
  | { type: "upload-local" }
  | { type: "prompt-restore-remote" }
  | { type: "conflict" };

export interface SyncDecisionInput {
  localBackup: BackupData;
  localHash: string;
  remoteBackup: BackupData | null;
  remoteHash: string | null;
  metadata: {
    lastLocalHash?: string;
    lastRemoteHash?: string;
  };
}

export function decideSyncAction(input: SyncDecisionInput): SyncDecision {
  if (!input.remoteBackup || !input.remoteHash) {
    return { type: "upload-local" };
  }

  if (
    input.localHash === input.metadata.lastLocalHash &&
    input.remoteHash === input.metadata.lastRemoteHash
  ) {
    return { type: "noop" };
  }

  const localChanged = input.localHash !== input.metadata.lastLocalHash;
  const remoteChanged = input.remoteHash !== input.metadata.lastRemoteHash;

  if (localChanged && remoteChanged) {
    return { type: "conflict" };
  }

  if (remoteChanged) {
    return { type: "prompt-restore-remote" };
  }

  return { type: "upload-local" };
}
