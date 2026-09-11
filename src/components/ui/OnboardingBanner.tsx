import { useState, useEffect } from 'react';
import { X, Shield, Cloud, Smartphone, Sparkles } from 'lucide-react';
import { Button } from './Button';

export function OnboardingBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem('matrix_onboarding_completed');
    if (!hasCompleted) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('matrix_onboarding_completed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
        aria-label="Dismiss welcome message"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Welcome to MATRIX
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
          Your personal, offline-first command center. Everything you create here is securely stored on this device first. You can connect a cloud account later to sync your data across devices, but it's completely optional.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Private by Design</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Your notes, tasks, and calendar events never leave your device unless you sign in and enable sync.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Smartphone className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Works Offline</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Install MATRIX as an app and use it anywhere. Changes will sync automatically when you reconnect.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Cloud className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Optional Integrations</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Connect Google Calendar or Google Drive from Settings. We only request permissions when you turn these features on.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <Button onClick={handleDismiss}>
            Got it, let's start
          </Button>
        </div>
      </div>
    </div>
  );
}
