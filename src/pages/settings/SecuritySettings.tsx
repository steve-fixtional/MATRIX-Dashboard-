import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { ShieldCheck, Lock, EyeOff } from 'lucide-react';

export function SecuritySettings() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Security & Privacy</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Information about how your data is protected.</p>
      </div>

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
