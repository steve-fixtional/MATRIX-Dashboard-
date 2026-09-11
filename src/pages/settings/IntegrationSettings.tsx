import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Layers, Calendar } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { initGoogleCalendarAuth, loginGoogle, subscribeToGoogleAuth } from '../../services/googleCalendarService';

export function IntegrationSettings() {
  const { user } = useAuth();
  const [isGoogleConnected, setIsGoogleConnected] = useState(
    user?.providerData.some(p => p.providerId === 'google.com') ?? false
  );
  
  useEffect(() => {
    initGoogleCalendarAuth().catch(console.error);
    
    const unsubscribe = subscribeToGoogleAuth((isAuthed) => {
      // It's possible the user is connected via Firebase Auth but we don't have the token.
      // We rely on the firebase providerData as the source of truth for "connected".
    });
    
    return () => unsubscribe();
  }, []);

  const connectGoogle = async () => {
    try {
      await loginGoogle();
      // Ensure local state updates if user's providerData takes a moment
      setIsGoogleConnected(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Integrations</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect external services and manage permissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Google Workspace</CardTitle>
          <CardDescription>Connect Google services for deeper integration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                   <Layers className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">Google Account</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {isGoogleConnected ? 'Connected. This grants access to your calendar if requested.' : 'Not connected. Connect to unlock cloud integrations.'}
                  </div>
                </div>
              </div>
              
              {!isGoogleConnected && (
                <Button variant="outline" size="sm" onClick={connectGoogle}>
                  Connect
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                   <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">Google Calendar</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Required to display your schedule in the MATRIX calendar.
                  </div>
                </div>
              </div>
              
              <Button variant="outline" size="sm" onClick={() => window.open('https://myaccount.google.com/permissions', '_blank')}>
                Manage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
