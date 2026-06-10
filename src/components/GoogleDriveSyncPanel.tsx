import { useGoogleLogin } from "@react-oauth/google";
import { Cloud, CloudOff, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { BackupData } from "../domain/types";
import * as repository from "../storage/repository";
import type { DriveFile } from "../sync/drive-client";
import { restoreRemoteBackup, syncNow, uploadLocalToDrive } from "../sync/google-drive-sync";
import { setGoogleDriveAccessToken, useGoogleDriveAccessToken } from "../sync/google-drive-session";
import { Button } from "./ui/button";

interface PendingRemoteAction {
  kind: "restore" | "conflict";
  remoteBackup: BackupData;
  remoteFile: DriveFile;
}

export function GoogleDriveSyncPanel() {
  const { i18n, t } = useTranslation();
  const configured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const accessToken = useGoogleDriveAccessToken();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [status, setStatus] = useState(t("driveSync.statusLoading"));
  const [busy, setBusy] = useState(false);
  const [pendingRemote, setPendingRemote] = useState<PendingRemoteAction | null>(null);
  const [remoteFileId, setRemoteFileId] = useState<string | undefined>();

  useEffect(() => {
    void repository.getSyncMetadata().then((metadata) => {
      setRemoteFileId(metadata.remoteFileId);
      setSyncEnabled(metadata.enabled);
      if (!metadata.enabled) {
        setStatus(t("driveSync.statusOff"));
        return;
      }
      if (metadata.status === "synced" && metadata.lastSyncAt) {
        setStatus(
          t("driveSync.statusEnabledLastSynced", {
            date: new Date(metadata.lastSyncAt).toLocaleString(i18n.language),
          }),
        );
        return;
      }
      setStatus(t("driveSync.statusGeneric", { status: metadata.status }));
    });
  }, [i18n.language, t]);

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/drive.appdata",
    onSuccess: (response) => {
      setGoogleDriveAccessToken(response.access_token);
      setSyncEnabled(true);
      void runSync(response.access_token);
    },
    onError: () => {
      setStatus(t("driveSync.statusSignInFailed"));
    },
  });

  async function runSync(token = accessToken) {
    if (!token) {
      login();
      return;
    }

    setBusy(true);
    setPendingRemote(null);
    setStatus(t("driveSync.statusSyncing"));
    try {
      const result = await syncNow(token);
      if (result.type === "prompt-restore-remote" || result.type === "conflict") {
        setPendingRemote({
          kind: result.type === "conflict" ? "conflict" : "restore",
          remoteBackup: result.remoteBackup,
          remoteFile: result.remoteFile,
        });
        setRemoteFileId(result.remoteFile.id);
        setStatus(
          result.type === "conflict"
            ? t("driveSync.statusConflictFound")
            : t("driveSync.statusRemoteNewer"),
        );
        return;
      }
      if (result.type === "created") {
        setRemoteFileId(result.file.id);
        setSyncEnabled(true);
        setStatus(t("driveSync.statusCreated"));
        return;
      }
      if (result.type === "uploaded") {
        setRemoteFileId(result.file.id);
        setSyncEnabled(true);
        setStatus(t("driveSync.statusUploaded"));
        return;
      }
      setSyncEnabled(true);
      setStatus(t("driveSync.statusAlreadySynced"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("driveSync.statusFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleUseDriveData() {
    if (!pendingRemote) return;
    setBusy(true);
    try {
      await restoreRemoteBackup(pendingRemote.remoteBackup, pendingRemote.remoteFile);
      setRemoteFileId(pendingRemote.remoteFile.id);
      setSyncEnabled(true);
      setPendingRemote(null);
      setStatus(t("driveSync.statusRestored"));
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("driveSync.statusRestoreFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function keepThisDevice() {
    if (!accessToken) {
      login();
      return;
    }
    setBusy(true);
    try {
      const file = await uploadLocalToDrive(accessToken, remoteFileId ?? pendingRemote?.remoteFile.id);
      setRemoteFileId(file.id);
      setSyncEnabled(true);
      setPendingRemote(null);
      setStatus(t("driveSync.statusKeptDevice"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("driveSync.statusUploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await repository.updateSyncMetadata({ enabled: false, status: "paused" });
    setGoogleDriveAccessToken(null);
    setSyncEnabled(false);
    setPendingRemote(null);
    setStatus(t("driveSync.statusDisconnected"));
  }

  if (!configured) {
    return (
      <div className="panel p-5">
        <div className="flex items-start gap-3">
          <CloudOff aria-hidden className="mt-0.5 h-5 w-5 text-muted" />
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("driveSync.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {t("driveSync.notConfigured")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Cloud aria-hidden className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("driveSync.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {t("driveSync.description")}
            </p>
            <p className="mt-2 text-sm text-muted">{status}</p>
          </div>
        </div>
      </div>

      {pendingRemote ? (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex gap-3">
            <ShieldAlert aria-hidden className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-ink">
                {pendingRemote.kind === "conflict"
                  ? t("driveSync.conflictTitle")
                  : t("driveSync.backupFoundTitle")}
              </p>
              <p className="mt-1 text-sm text-muted">
                {t("driveSync.conflictDescription")}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void handleUseDriveData()} variant="primary">
              {t("driveSync.useDriveData")}
            </Button>
            <Button disabled={busy} onClick={() => void keepThisDevice()} variant="secondary">
              {t("driveSync.keepThisDevice")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {accessToken ? (
          <Button disabled variant="secondary">
            <Cloud aria-hidden className="h-4 w-4" />
            {t("driveSync.connected")}
          </Button>
        ) : (
          <Button disabled={busy} onClick={() => login()} variant="primary">
            <Cloud aria-hidden className="h-4 w-4" />
            {syncEnabled ? t("driveSync.reconnect") : t("driveSync.connect")}
          </Button>
        )}
        <Button disabled={busy} onClick={() => void runSync()} variant="secondary">
          <RefreshCw aria-hidden className="h-4 w-4" />
          {t("driveSync.syncNow")}
        </Button>
        <Button disabled={busy || !syncEnabled} onClick={() => void disconnect()} variant="ghost">
          {t("driveSync.disconnect")}
        </Button>
      </div>
    </div>
  );
}
