/** Remembers on this device that the import offer was answered for an account, so it is not repeated. */
const key = (userId: string) => `bridge-import-handled:${userId}`;

export function isImportHandled(userId: string): boolean {
  try {
    return window.localStorage.getItem(key(userId)) === "1";
  } catch {
    return false;
  }
}

export function markImportDone(userId: string): void {
  try {
    window.localStorage.setItem(key(userId), "1");
  } catch {
    // private mode: the offer may come back, which is harmless (the import is idempotent)
  }
}
