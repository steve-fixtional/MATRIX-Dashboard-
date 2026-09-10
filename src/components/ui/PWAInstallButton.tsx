import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Install App"
        className="flex items-center justify-center gap-2 rounded-full lg:rounded-lg bg-cyan-600/20 w-9 h-9 lg:w-auto lg:h-auto lg:px-3 lg:py-1.5 text-xs font-medium text-cyan-500 hover:bg-cyan-600/30 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span className="hidden lg:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Install on iOS"
          className="flex items-center justify-center gap-2 rounded-full lg:rounded-lg bg-cyan-600/20 w-9 h-9 lg:w-auto lg:h-auto lg:px-3 lg:py-1.5 text-xs font-medium text-cyan-500 hover:bg-cyan-600/30 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden lg:inline">Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-xl text-left">
              <h3 className="text-lg font-semibold text-neutral-100">Install on iPhone / iPad</h3>
              <p className="mt-2 text-sm text-neutral-400">
                1. Tap the <strong className="text-neutral-200">Share</strong> button in the Safari toolbar.<br />
                2. Scroll down and tap <strong className="text-neutral-200">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-neutral-800 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
