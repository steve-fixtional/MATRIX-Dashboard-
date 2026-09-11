/**
 * MATRIX Password Vault - Auto-Lock & Browser Lifecycle Security Service
 * 
 * Manages inactivity detection, strict visibility mode, and lifecycle event handling:
 * - Inactivity Auto-Lock: Default 15 minutes timeout.
 *   Tracks keyboard, mouse, touch, and programmatic vault interactions.
 *   Throttled activity recording prevents performance overhead.
 * - Central Lock Execution: Delegates directly to vaultRuntimeService.lock()
 *   which wipes volatile keys, caches, search buffers, and UI state.
 * - Strict Visibility Mode: Optional setting (default off). When enabled,
 *   switching away from the MATRIX tab (visibilitychange / document.hidden)
 *   immediately locks the vault.
 * - Browser Lifecycle: Listens to pagehide/beforeunload to clear runtime references.
 *   Never persists the Vault Key to survive navigation.
 * 
 * NOTE: JavaScript runtime engines cannot guarantee physical memory destruction
 * due to non-deterministic garbage collection. Runtime references are cleared immediately.
 */

import { vaultRuntimeService, registerVaultActivityHook } from './vaultRuntimeService';
import { cancelPendingClipboardClear } from './vaultClipboardService';

export const DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 15; // 15 minutes default
export const INACTIVITY_TIMEOUT_OPTIONS = [1, 5, 15, 30, 60] as const;

export const STORAGE_KEY_INACTIVITY_TIMEOUT = 'matrix_vault_inactivity_minutes';
export const STORAGE_KEY_STRICT_VISIBILITY = 'matrix_vault_strict_visibility';

class VaultAutoLockService {
  private inactivityTimeoutMinutes: number = DEFAULT_INACTIVITY_TIMEOUT_MINUTES;
  private strictVisibilityEnabled: boolean = false;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private lastActivityTime: number = Date.now();
  private listenersAttached: boolean = false;
  private runtimeUnsubscribe: (() => void) | null = null;

  constructor() {
    this.loadPreferences();
  }

  /**
   * Initializes the auto-lock service, binding to DOM lifecycle and vault runtime state.
   */
  public initialize(): void {
    if (this.listenersAttached) return;

    this.loadPreferences();

    // 1. Subscribe to vault state transitions
    this.runtimeUnsubscribe = vaultRuntimeService.subscribe((state) => {
      if (state === 'unlocked') {
        this.onVaultUnlocked();
      } else {
        this.onVaultLocked();
      }
    });

    // Register activity hook for programmatic vault operations
    registerVaultActivityHook(() => this.recordActivity());

    // 2. Attach browser activity and visibility listeners if running in window environment
    if (typeof window !== 'undefined') {
      const throttledActivity = this.throttle(() => this.recordActivity(), 1000);

      // Keyboard activity
      window.addEventListener('keydown', throttledActivity, { passive: true });
      window.addEventListener('keyup', throttledActivity, { passive: true });

      // Mouse and pointer activity
      window.addEventListener('mousemove', throttledActivity, { passive: true });
      window.addEventListener('pointerdown', throttledActivity, { passive: true });
      window.addEventListener('click', throttledActivity, { passive: true });
      window.addEventListener('wheel', throttledActivity, { passive: true });

      // Touch interactions
      window.addEventListener('touchstart', throttledActivity, { passive: true });
      window.addEventListener('touchend', throttledActivity, { passive: true });

      // Document visibility change (Strict Visibility Mode)
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      // Page lifecycle (pagehide / beforeunload)
      window.addEventListener('pagehide', this.handlePageHide);
      window.addEventListener('beforeunload', this.handleBeforeUnload);

      this.listenersAttached = true;
    }

    // Check if initially unlocked
    if (vaultRuntimeService.isUnlocked()) {
      this.startTimer();
    }
  }

  /**
   * Loads user preferences from localStorage if available.
   */
  public loadPreferences(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const storedTimeout = localStorage.getItem(STORAGE_KEY_INACTIVITY_TIMEOUT);
      if (storedTimeout) {
        const parsed = parseInt(storedTimeout, 10);
        if (!isNaN(parsed) && parsed > 0) {
          this.inactivityTimeoutMinutes = parsed;
        }
      }

      const storedVisibility = localStorage.getItem(STORAGE_KEY_STRICT_VISIBILITY);
      if (storedVisibility !== null) {
        this.strictVisibilityEnabled = storedVisibility === 'true';
      }
    } catch {
      // Ignore localStorage access failures
    }
  }

  /**
   * Updates inactivity timeout duration (in minutes).
   */
  public setInactivityTimeout(minutes: number): void {
    if (minutes <= 0) return;
    this.inactivityTimeoutMinutes = minutes;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_INACTIVITY_TIMEOUT, minutes.toString());
      }
    } catch {
      // Ignore
    }

    // If currently unlocked, reset timer with new duration
    if (vaultRuntimeService.isUnlocked()) {
      this.startTimer();
    }
  }

  /**
   * Returns current inactivity timeout in minutes.
   */
  public getInactivityTimeout(): number {
    return this.inactivityTimeoutMinutes;
  }

  /**
   * Enables or disables Strict Visibility Mode.
   * When enabled, switching away from the tab immediately locks the vault.
   */
  public setStrictVisibility(enabled: boolean): void {
    this.strictVisibilityEnabled = enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_STRICT_VISIBILITY, enabled ? 'true' : 'false');
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Returns whether Strict Visibility Mode is currently enabled.
   */
  public getStrictVisibility(): boolean {
    return this.strictVisibilityEnabled;
  }

  /**
   * Records meaningful user activity and resets the inactivity timer if vault is unlocked.
   */
  public recordActivity(): void {
    this.lastActivityTime = Date.now();
    if (vaultRuntimeService.isUnlocked()) {
      this.startTimer();
    }
  }

  /**
   * Called when vault unlocks: starts auto-lock timer.
   */
  public onVaultUnlocked(): void {
    this.lastActivityTime = Date.now();
    this.startTimer();
  }

  /**
   * Called when vault locks: stops auto-lock timer and pending clipboard clearing.
   */
  public onVaultLocked(): void {
    this.stopTimer();
    cancelPendingClipboardClear();
  }

  /**
   * Starts or resets the auto-lock inactivity timer.
   */
  public startTimer(customDelayMs?: number): void {
    this.stopTimer();

    const delayMs = customDelayMs ?? this.inactivityTimeoutMinutes * 60 * 1000;

    this.timerId = setTimeout(() => {
      this.triggerInactivityLock();
    }, delayMs);
  }

  /**
   * Stops any pending inactivity timer.
   */
  public stopTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Triggers central vault lock due to inactivity.
   */
  public triggerInactivityLock(): void {
    this.stopTimer();
    if (vaultRuntimeService.isUnlocked()) {
      // Central lock: clears activeVaultKey, caches, search buffers, and notifies UI
      vaultRuntimeService.lock({ broadcast: true });
    }
  }

  /**
   * Handles visibilitychange: if Strict Visibility Mode is enabled and document is hidden, locks vault.
   */
  private handleVisibilityChange = (): void => {
    if (!this.strictVisibilityEnabled) return;

    const isHidden = typeof document !== 'undefined' && (document.hidden || document.visibilityState === 'hidden');
    if (isHidden && vaultRuntimeService.isUnlocked()) {
      vaultRuntimeService.lock({ broadcast: true });
    }
  };

  /**
   * Handles pagehide lifecycle event safely.
   */
  private handlePageHide = (): void => {
    if (vaultRuntimeService.isUnlocked()) {
      // Immediately wipe runtime session without broadcasting cross-tab lock needlessly
      vaultRuntimeService.lock({ broadcast: false });
    }
  };

  /**
   * Handles beforeunload event safely.
   */
  private handleBeforeUnload = (): void => {
    if (vaultRuntimeService.isUnlocked()) {
      vaultRuntimeService.lock({ broadcast: false });
    }
  };

  /**
   * Helper to throttle high-frequency events.
   */
  private throttle<T extends (...args: any[]) => void>(fn: T, waitMs: number): (...args: Parameters<T>) => void {
    let lastCalled = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCalled >= waitMs) {
        lastCalled = now;
        fn(...args);
      }
    };
  }

  /**
   * Cleans up all listeners and timers (useful in tests or unmounting).
   */
  public destroy(): void {
    this.stopTimer();

    registerVaultActivityHook(null);

    if (this.runtimeUnsubscribe) {
      this.runtimeUnsubscribe();
      this.runtimeUnsubscribe = null;
    }

    if (typeof window !== 'undefined' && this.listenersAttached) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('pagehide', this.handlePageHide);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      this.listenersAttached = false;
    }
  }
}

export const vaultAutoLockService = new VaultAutoLockService();

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  vaultAutoLockService.initialize();
}
