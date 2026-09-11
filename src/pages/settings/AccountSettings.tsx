import { useAuth } from '../../store/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { User, LogOut, LogIn, AlertCircle } from 'lucide-react';

export function AccountSettings() {
  const { user, logout, login, isSigningIn, error } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Account</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage your connected profile and authentication.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your connected Google account details.</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'Profile'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <User className="h-6 w-6 text-neutral-400" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-50">{user.displayName || 'Anonymous User'}</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">{user.email || 'No email provided'}</div>
                </div>
              </div>
              <Button variant="outline" onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                <User className="h-6 w-6 text-neutral-400" />
              </div>
              <div className="text-sm text-neutral-500 mb-6">You are not currently signed in.</div>
              <Button 
                onClick={login} 
                disabled={isSigningIn}
                className="w-full sm:w-auto"
              >
                {isSigningIn ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In with Google
                  </span>
                )}
              </Button>
              {error && (
                <div className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900/50 max-w-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-left">{error.message}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
