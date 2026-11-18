import type { UserStore } from "@/lib/data/types";

/** The three store methods the "memory off" sequence needs (so tests can pass a small stub). */
export type ConsentStore = Pick<UserStore, "clearConversations" | "savePreferences" | "getPreferences">;

export interface MemoryOffResult {
  /** Both steps worked. */
  ok: boolean;
  /** The saved conversations were erased. */
  cleared: boolean;
  /** The preference "memory off" was written. */
  prefSaved: boolean;
  /** What is really stored now (re-read), or null when it could not be read. The toggle must show this. */
  consent: boolean | null;
}

/**
 * Turning chat memory off, in the safe order: erase the saved conversations FIRST, then write the preference.
 * If the erase fails the preference is left as it was (still "on"), so the screen can say so honestly and the
 * person can try again. If only the save fails, nothing is kept any more but the preference is unchanged.
 * Never throws. The caller shows a visible error whenever `ok` is false and sets the toggle to `consent`.
 */
export async function turnMemoryOff(store: ConsentStore): Promise<MemoryOffResult> {
  let cleared = false;
  let prefSaved = false;
  try {
    await store.clearConversations();
    cleared = true;
  } catch {
    // keep the preference as it was; the caller shows the error
  }
  if (cleared) {
    try {
      await store.savePreferences({ memoryConsent: false });
      prefSaved = true;
    } catch {
      // the conversations are already gone; the caller shows the error
    }
  }
  let consent: boolean | null = null;
  try {
    consent = (await store.getPreferences()).memoryConsent;
  } catch {
    // unreadable: the caller treats it as unknown
  }
  return { ok: cleared && prefSaved, cleared, prefSaved, consent };
}
