/**
 * MATRIX Password Vault - Clipboard Security Service
 * 
 * Provides safe, ephemeral password copying with best-effort auto-clearing:
 * - Copies password strictly via the modern Clipboard API.
 * - Attempts to automatically clear the clipboard after 45 seconds.
 * - Inspects clipboard content before clearing (where technically possible)
 *   to avoid overwriting content the user copied after MATRIX.
 * - Handles browser permission and focus constraints gracefully.
 * - Never logs or persists copied passwords.
 * 
 * NOTE: In web browsers, clipboard clearing is best-effort. Tab focus, permissions,
 * or background tab restrictions may prevent the browser from allowing clipboard writes.
 */

export const DEFAULT_CLIPBOARD_CLEAR_DELAY_MS = 45000; // 45 seconds

let activeCopiedSecret: string | null = null;
let targetClearTimestamp: number | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let tickInterval: ReturnType<typeof setInterval> | null = null;

export type ClipboardCountdownListener = (remainingSeconds: number | null) => void;
const countdownListeners = new Set<ClipboardCountdownListener>();

function notifyCountdown(seconds: number | null): void {
  for (const listener of countdownListeners) {
    try {
      listener(seconds);
    } catch {
      // Ignore listener error
    }
  }
}

/**
 * Copies a sensitive password to the clipboard and attempts to clear it after the delay.
 * Never logs the password value.
 */
export async function copyPasswordWithAutoClear(
  password: string,
  delayMs: number = DEFAULT_CLIPBOARD_CLEAR_DELAY_MS
): Promise<{ success: boolean; error?: string }> {
  if (!password) {
    return { success: false, error: 'Password is empty' };
  }

  // 1. Write to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(password);
    } else {
      return { success: false, error: 'Clipboard API is not available' };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Permission denied to write to clipboard',
    };
  }

  // 2. Clear any prior pending clear timers
  cancelPendingClipboardClear();

  // 3. Store secret in volatile closure to prevent overwriting newer copied content
  activeCopiedSecret = password;
  targetClearTimestamp = Date.now() + delayMs;

  const initialRemaining = Math.max(1, Math.ceil(delayMs / 1000));
  notifyCountdown(initialRemaining);

  // 4. Start countdown interval for UI indicators
  tickInterval = setInterval(() => {
    if (!targetClearTimestamp) {
      cancelPendingClipboardClear();
      return;
    }
    const remaining = Math.max(0, Math.ceil((targetClearTimestamp - Date.now()) / 1000));
    notifyCountdown(remaining);
    if (remaining <= 0 && tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }, 1000);

  // 5. Schedule best-effort clear attempt
  clearTimer = setTimeout(async () => {
    const secretToClear = activeCopiedSecret;
    cancelPendingClipboardClear();

    if (!secretToClear) return;

    await attemptClearClipboard(secretToClear);
  }, delayMs);

  return { success: true };
}

/**
 * Attempts to clear the clipboard if it still contains the specified secret.
 * Avoids overwriting content that the user copied after MATRIX.
 */
export async function attemptClearClipboard(expectedSecret?: string | null): Promise<boolean> {
  const secretToMatch = expectedSecret ?? activeCopiedSecret;
  if (!secretToMatch) return false;

  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return false;
    }

    let currentClipboard: string | null = null;

    // Check if reading clipboard is supported and permitted
    if (typeof navigator.clipboard.readText === 'function') {
      try {
        currentClipboard = await navigator.clipboard.readText();
      } catch {
        // Window might not be focused or user denied permission
        currentClipboard = null;
      }
    }

    if (currentClipboard !== null) {
      // Content was read: ONLY clear if it still equals the secret we copied!
      if (currentClipboard === secretToMatch) {
        await navigator.clipboard.writeText('');
        return true;
      }
      // Content has changed - user copied something else; do not overwrite!
      return false;
    } else {
      // Reading wasn't allowed or failed.
      // Best-effort: only clear if document is currently focused to avoid blind overwrite
      if (typeof document !== 'undefined' && typeof document.hasFocus === 'function' && document.hasFocus()) {
        await navigator.clipboard.writeText('');
        return true;
      }
      return false;
    }
  } catch {
    // Best effort - browser security/permissions may block background operations
    return false;
  } finally {
    if (activeCopiedSecret === secretToMatch) {
      activeCopiedSecret = null;
      notifyCountdown(null);
    }
  }
}

/**
 * Cancels any active clipboard clear timer without overwriting clipboard.
 */
export function cancelPendingClipboardClear(): void {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  activeCopiedSecret = null;
  targetClearTimestamp = null;
  notifyCountdown(null);
}

/**
 * Checks if a clipboard auto-clear operation is currently pending.
 */
export function isClipboardClearPending(): boolean {
  return clearTimer !== null && activeCopiedSecret !== null;
}

/**
 * Returns active copied secret reference (held temporarily in volatile memory).
 */
export function getActiveCopiedSecret(): string | null {
  return activeCopiedSecret;
}

/**
 * Returns remaining seconds until clipboard clear, or null if no timer active.
 */
export function getRemainingClipboardSeconds(): number | null {
  if (!targetClearTimestamp) return null;
  return Math.max(0, Math.ceil((targetClearTimestamp - Date.now()) / 1000));
}

/**
 * Subscribes a listener to clipboard countdown updates.
 */
export function subscribeClipboardCountdown(listener: ClipboardCountdownListener): () => void {
  countdownListeners.add(listener);
  listener(getRemainingClipboardSeconds());
  return () => {
    countdownListeners.delete(listener);
  };
}
