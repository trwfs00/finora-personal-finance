import { useSyncExternalStore } from "react";

let accessToken: string | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function getGoogleDriveAccessToken() {
  return accessToken;
}

export function setGoogleDriveAccessToken(token: string | null) {
  accessToken = token;
  emitChange();
}

export function clearGoogleDriveAccessToken() {
  setGoogleDriveAccessToken(null);
}

export function subscribeToGoogleDriveAccessToken(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGoogleDriveAccessToken() {
  return useSyncExternalStore(
    subscribeToGoogleDriveAccessToken,
    getGoogleDriveAccessToken,
    getGoogleDriveAccessToken,
  );
}
