import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { ShieldCheck, Lock, EyeOff, Clock, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { useVault } from '../../store/VaultContext';
import { INACTIVITY_TIMEOUT_OPTIONS } from '../../services/vault/vaultAutoLockService';

export function SecuritySettings() {
  const {
    inactivityTimeout,
    setInactivityTimeout,
    strictVisibility,
    setStrictVisibility,
    clipboardCountdown,
    cancelClipboardClear,
  } = useVault();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Security & Privacy</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure vault auto-lock, visibility protections, and view data privacy.</p>
      </div>

      {/* Vault Auto-Lock & Session Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-neutral-500" />
            Password Vault Session Protections
          </CardTitle>
          <CardDescription>
            Configure automated locking, background tab protection, and clipboard auto-clearing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inactivity Auto-Lock */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label htmlFor="settings-inactivity" className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-neutral-400" />
                Inactivity Auto-Lock
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                Locks the vault and purges runtime decrypted data and volatile key references after keyboard or mouse inactivity.
              </p>
            </div>
            <select
              id="settings-inactivity"
              value={inactivityTimeout}
              onChange={(e) => setInactivityTimeout(Number(e.target.value))}
              className="h-9 px-3 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 text-neutral-900 dark:text-neutral-100 shrink-0"
            >
              {INACTIVITY_TIMEOUT_OPTIONS.map((min) => (
                <option key={min} value={min}>
                  {min} {min === 1 ? 'minute' : 'minutes'} {min === 15 ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

          {/* Strict Visibility Mode */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-neutral-400" />
                Strict Visibility Mode
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                Immediately locks the vault whenever switching away from this browser tab or minimizing the window. Returning requires re-entering your Master Password.
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">
                Disabled by default.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={strictVisibility}
              onClick={() => setStrictVisibility(!strictVisibility)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 ${
                strictVisibility
                  ? 'bg-neutral-900 dark:bg-neutral-100'
                  : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  strictVisibility ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

          {/* Clipboard Security */}
          <div className="flex items-start gap-3">
            <ClipboardCheck className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
              <div>
                <strong>Clipboard Protection (45-second auto-clear):</strong> Passwords copied to your clipboard are automatically cleared after 45 seconds. The clearing mechanism checks current clipboard content before clearing so subsequent copies are not overwritten.
              </div>
              <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
                * Note: Clipboard clearing is best-effort. Browser permissions, background tab limits, or window focus can prevent clearing.
              </div>
              {clipboardCountdown !== null && clipboardCountdown > 0 && (
                <div className="inline-flex items-center gap-2 mt-1 px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-medium">
                  <span>Clearing clipboard in {clipboardCountdown}s</span>
                  <button type="button" onClick={cancelClipboardClear} className="underline text-[11px]">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Accurate Volatile Memory Disclaimer */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60">
            <AlertTriangle className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              <strong>Volatile Memory Lifecycle:</strong> Master keys and decrypted credentials exist only in volatile JavaScript heap during unlocked sessions. Locking the vault dereferences all keys and caches immediately. JavaScript cannot guarantee physical silicon RAM destruction due to browser garbage collection.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Privacy</CardTitle>
          <CardDescription>Understanding your local-first architecture.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                <strong>Authentication:</strong> Authentication is handled securely via Firebase Auth. Your authentication tokens are never exposed to the UI or stored in plaintext in the database.
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                <strong>Sync & Transport:</strong> Data is synchronized over secure HTTPS connections. Passwords and API keys are not stored in the regular synced database.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <EyeOff className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                <strong>Device Data:</strong> Your data is stored locally on this device in the browser's IndexedDB. Anyone with physical access to your unlocked device and this browser profile may be able to access your cached local data.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
