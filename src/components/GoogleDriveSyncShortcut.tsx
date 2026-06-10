import { AlertTriangle, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { SyncMetadata } from "../domain/types";
import { cn } from "../lib/utils";
import * as repository from "../storage/repository";
import { syncNow } from "../sync/google-drive-sync";
import { useGoogleDriveAccessToken } from "../sync/google-drive-session";

interface SyncShortcutState {
  label: string;
  title: string;
  icon: typeof Cloud;
  className: string;
}

function getShortcutState(
  configured: boolean,
  metadata: SyncMetadata | null,
  accessToken: string | null,
  busy: boolean,
  t: (key: string, options?: Record<string, unknown>) => string,
  language: string,
): SyncShortcutState {
  if (busy || metadata?.status === "syncing") {
    return {
      label: t("driveSync.shortcutSyncing"),
      title: t("driveSync.shortcutSyncingTitle"),
      icon: RefreshCw,
      className: "border-primary/30 bg-primary/10 text-primary",
    };
  }

  if (!configured || !metadata?.enabled) {
    return {
      label: t("driveSync.shortcutLocalOnly"),
      title: configured ? t("driveSync.shortcutOffTitle") : t("driveSync.shortcutNotConfiguredTitle"),
      icon: CloudOff,
      className: "border-line bg-surface-2 text-muted hover:text-ink",
    };
  }

  if (metadata.status === "conflict") {
    return {
      label: t("driveSync.shortcutConflict"),
      title: t("driveSync.shortcutConflictTitle"),
      icon: AlertTriangle,
      className: "border-danger/30 bg-danger/10 text-danger",
    };
  }

  if (metadata.status === "error") {
    return {
      label: t("driveSync.shortcutError"),
      title: metadata.lastError ?? t("driveSync.shortcutErrorTitle"),
      icon: AlertTriangle,
      className: "border-danger/30 bg-danger/10 text-danger",
    };
  }

  if (!accessToken) {
    return {
      label: t("driveSync.shortcutReconnect"),
      title: t("driveSync.shortcutReconnectTitle"),
      icon: Cloud,
      className: "border-line bg-surface-2 text-muted hover:text-ink",
    };
  }

  if (metadata.hasPendingLocalChanges || metadata.status === "idle") {
    return {
      label: t("driveSync.shortcutSyncNeeded"),
      title: t("driveSync.shortcutSyncNeededTitle"),
      icon: Cloud,
      className: "border-primary/30 bg-primary/10 text-primary",
    };
  }

  return {
    label: t("driveSync.shortcutSynced"),
    title: metadata.lastSyncAt
      ? t("driveSync.shortcutLastSyncedTitle", {
          date: new Date(metadata.lastSyncAt).toLocaleString(language),
        })
      : t("driveSync.shortcutEnabledTitle"),
    icon: Cloud,
    className: "border-primary/30 bg-primary/10 text-primary",
  };
}

export function GoogleDriveSyncShortcut({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const configured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const accessToken = useGoogleDriveAccessToken();
  const navigate = useNavigate();
  const [metadata, setMetadata] = useState<SyncMetadata | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshMetadata() {
    setMetadata(await repository.getSyncMetadata());
  }

  useEffect(() => {
    void refreshMetadata();
    const refresh = () => void refreshMetadata();
    window.addEventListener(repository.SYNC_METADATA_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(repository.SYNC_METADATA_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const state = getShortcutState(configured, metadata, accessToken, busy, t, i18n.language);
  const Icon = state.icon;
  const canQuickSync =
    configured &&
    Boolean(accessToken) &&
    Boolean(metadata?.enabled) &&
    metadata?.status === "synced" &&
    !metadata.hasPendingLocalChanges;

  async function handleClick() {
    if (!canQuickSync || !accessToken) {
      navigate("/settings#google-drive-sync");
      return;
    }

    setBusy(true);
    try {
      const result = await syncNow(accessToken);
      await refreshMetadata();
      if (result.type === "conflict" || result.type === "prompt-restore-remote") {
        navigate("/settings#google-drive-sync");
      }
    } catch {
      await refreshMetadata();
      navigate("/settings#google-drive-sync");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      aria-label={state.title}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
        state.className,
        compact && "w-8 px-0",
      )}
      onClick={() => void handleClick()}
      title={state.title}
      type="button"
    >
      <Icon aria-hidden className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
      {!compact && <span>{state.label}</span>}
    </button>
  );
}
