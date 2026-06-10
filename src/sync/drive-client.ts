import { parseBackupData } from "../domain/backup";
import type { BackupData } from "../domain/types";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const BACKUP_FILE_NAME = "finora-backup.json";

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
  md5Checksum?: string;
}

export class DriveClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DriveClientError";
  }
}

export async function findBackupFile(token: string): Promise<DriveFile | null> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name = '${BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed = false`,
    fields: "files(id,name,modifiedTime,md5Checksum,size)",
    pageSize: "1",
  });
  const response = await driveFetch(token, `${DRIVE_API}/files?${params.toString()}`);
  const data = (await response.json()) as { files?: DriveFile[] };
  return data.files?.[0] ?? null;
}

export async function downloadBackupFile(token: string, fileId: string): Promise<BackupData> {
  const response = await driveFetch(token, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`);
  const text = await response.text();
  return parseBackupData(text);
}

export async function createBackupFile(token: string, backup: BackupData): Promise<DriveFile> {
  const boundary = `finora-${crypto.randomUUID()}`;
  const metadata = {
    name: BACKUP_FILE_NAME,
    parents: ["appDataFolder"],
    mimeType: "application/json",
  };
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(backup, null, 2),
    `--${boundary}--`,
  ].join("\r\n");

  const response = await driveFetch(
    token,
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,modifiedTime,size`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  return (await response.json()) as DriveFile;
}

export async function updateBackupFile(token: string, fileId: string, backup: BackupData): Promise<DriveFile> {
  const response = await driveFetch(
    token,
    `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,modifiedTime,size`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(backup, null, 2),
    },
  );
  return (await response.json()) as DriveFile;
}

async function driveFetch(token: string, input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });

  if (!response.ok) {
    throw new DriveClientError(await errorMessage(response), response.status);
  }

  return response;
}

async function errorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    return data.error?.message ?? `Google Drive request failed (${response.status})`;
  } catch {
    return `Google Drive request failed (${response.status})`;
  }
}
