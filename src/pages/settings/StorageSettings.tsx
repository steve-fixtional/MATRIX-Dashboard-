import React, { useState, useEffect } from 'react';
import { Database, Cloud, HardDrive, Check, RefreshCw, AlertCircle, Wifi, Clock, LogOut, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getAllStorageProviders } from '../../services/storage/storageRegistry';
import { getFiles } from '../../services/fileService';
import { useSettings } from '../../hooks/useSettings';
import { cn } from '../../utils';
import { getAuth } from 'firebase/auth';

export function StorageSettings() {
  const { settings, saveSettings } = useSettings();
  
  const storageMode = settings?.storageMode || 'hybrid';
  const defaultStorage = settings?.defaultStorageProvider || 'local';
  const syncEnabled = settings?.syncEnabled ?? true;
  const syncAutomatically = settings?.syncAutomatically ?? true;
  const syncWifiOnly = settings?.syncWifiOnly ?? false;
  const syncFrequency = settings?.syncFrequency || 'realtime';
  
  const [localSize, setLocalSize] = useState(0);
  const [cloudSize, setCloudSize] = useState(0);
  const [localQuota, setLocalQuota] = useState<number | null>(null);
  
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [providerToDisconnect, setProviderToDisconnect] = useState<string | null>(null);
  
  const providers = getAllStorageProviders();

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      setUserEmail(auth.currentUser.email);
    }
  }, []);

  useEffect(() => {
    async function calcStorage() {
      try {
        const files = await getFiles();
        let local = 0;
        let cloud = 0;
        files.forEach(f => {
          if (f.storageProvider === 'cloud') cloud += f.size || 0;
          else local += f.size || 0;
        });
        setLocalSize(local);
        setCloudSize(cloud);
        
        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          if (estimate.quota) {
            setLocalQuota(estimate.quota);
          }
        }
      } catch (e) {
        console.error('Failed to calculate storage size', e);
      }
    }
    calcStorage();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleModeChange = (mode: 'local' | 'cloud' | 'hybrid') => {
    saveSettings({ storageMode: mode });
  };
  
  const toggleSetting = (key: keyof typeof settings) => {
    saveSettings({ [key]: !settings?.[key] });
  };

  const confirmDisconnect = () => {
    // In a real app, you would sign out or disconnect the specific provider auth here
    // But per requirements we don't delete files. We just "disconnect".
    setDisconnectModalOpen(false);
    setProviderToDisconnect(null);
    saveSettings({ storageMode: 'local', syncEnabled: false });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Storage & Sync
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage how and where your data is stored across devices.
        </p>
      </div>

      {/* Storage Mode */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Storage Mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 'local', title: 'Local Only', desc: 'Keep files purely on this device', icon: HardDrive },
            { id: 'cloud', title: 'Cloud Only', desc: 'Store everything in the cloud', icon: Cloud },
            { id: 'hybrid', title: 'Hybrid (Recommended)', desc: 'Store locally and sync to cloud', icon: RefreshCw }
          ].map(mode => {
            const Icon = mode.icon;
            const isActive = storageMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id as any)}
                className={cn(
                  "flex flex-col items-start p-4 text-left rounded-xl border transition-all duration-200",
                  isActive 
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500" 
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg mb-3",
                  isActive ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className={cn("font-medium text-sm mb-1", isActive ? "text-blue-900 dark:text-blue-100" : "text-neutral-900 dark:text-neutral-100")}>{mode.title}</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{mode.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Default Location */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Default Location</h3>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
           <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">New files destination</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Where newly uploaded files are saved by default</p>
              </div>
              <select 
                value={defaultStorage}
                onChange={(e) => saveSettings({ defaultStorageProvider: e.target.value })}
                className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="local">Local Storage</option>
                <option value="cloud">Cloud Storage</option>
              </select>
           </div>
        </div>
      </div>

      {/* Connected Providers & Accounts */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Connected Providers</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {providers.map((provider) => {
            const isLocal = provider.providerType === 'local';
            const isConnected = isLocal ? true : !!userEmail;
            
            return (
              <div
                key={provider.providerType}
                className="flex flex-col p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {isLocal ? <HardDrive className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                        {provider.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-600")} />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  {isConnected && (
                    <div className="text-xs text-neutral-600 dark:text-neutral-300 font-medium bg-neutral-50 dark:bg-neutral-950 rounded-md px-2.5 py-1.5 inline-block mb-4 border border-neutral-100 dark:border-neutral-800">
                      {isLocal ? 'Device Storage' : userEmail}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                   {isLocal ? (
                     <span className="text-xs text-neutral-500 font-mono flex items-center gap-1.5">
                       <Check className="h-3 w-3" /> System Managed
                     </span>
                   ) : (
                     isConnected ? (
                       <Button 
                         variant="secondary" 
                         size="sm" 
                         className="text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 w-full"
                         onClick={() => {
                           setProviderToDisconnect(provider.name);
                           setDisconnectModalOpen(true);
                         }}
                       >
                         Disconnect
                       </Button>
                     ) : (
                       <Button variant="primary" size="sm" className="w-full">
                         Connect
                       </Button>
                     )
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Storage Usage */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Storage Usage</h3>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
          
          <div className="space-y-5">
            {/* Local Usage */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">Local Device</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatSize(localSize)} <span className="text-neutral-400 font-normal">/ {localQuota ? formatSize(localQuota) : 'Available'}</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                  style={{ width: localQuota ? `${Math.max(1, (localSize / localQuota) * 100)}%` : '5%' }} 
                />
              </div>
            </div>

            {/* Cloud Usage */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">Cloud Provider</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatSize(cloudSize)} <span className="text-neutral-400 font-normal">/ Unlimited</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                  style={{ width: cloudSize > 0 ? '5%' : '0%' }} // Mock percentage since unlimited
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Synchronization */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Synchronization</h3>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800">
          
          {/* Enable Sync */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 mt-0.5">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Enable Synchronization</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Keep files updated across all connected devices</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('syncEnabled')}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                syncEnabled ? "bg-blue-600" : "bg-neutral-200 dark:bg-neutral-700"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                syncEnabled ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Sync Automatically */}
          <div className={cn("flex items-center justify-between p-4 transition-opacity", !syncEnabled && "opacity-50 pointer-events-none")}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 mt-0.5">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Sync Automatically</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Run sync engine in the background</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('syncAutomatically')}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                syncAutomatically ? "bg-blue-600" : "bg-neutral-200 dark:bg-neutral-700"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                syncAutomatically ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Sync Wi-Fi Only */}
          <div className={cn("flex items-center justify-between p-4 transition-opacity", !syncEnabled && "opacity-50 pointer-events-none")}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 mt-0.5">
                <Wifi className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Sync on Wi-Fi Only</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Pause syncing when on cellular data</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('syncWifiOnly')}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                syncWifiOnly ? "bg-blue-600" : "bg-neutral-200 dark:bg-neutral-700"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                syncWifiOnly ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Sync Frequency */}
          <div className={cn("flex items-center justify-between p-4 transition-opacity", !syncEnabled && "opacity-50 pointer-events-none")}>
             <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 mt-0.5">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Sync Frequency</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">How often the engine checks for remote changes</p>
              </div>
            </div>
            <select 
              value={syncFrequency}
              onChange={(e) => saveSettings({ syncFrequency: e.target.value as any })}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="realtime">Real-time (Push)</option>
              <option value="15m">Every 15 minutes</option>
              <option value="1h">Every hour</option>
              <option value="12h">Every 12 hours</option>
              <option value="daily">Once a day</option>
            </select>
          </div>

        </div>
      </div>

      {/* Disconnect Modal */}
      {disconnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
            <div className="p-5">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-500">
                  <LogOut className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-center text-neutral-900 dark:text-neutral-100 mb-2">
                Disconnect {providerToDisconnect}?
              </h2>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4 border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-1">What happens when you disconnect:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Synchronization will be paused immediately.</li>
                    <li><strong>Your files will NOT be deleted</strong> from the cloud or your device.</li>
                    <li>You can reconnect at any time to resume syncing.</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setDisconnectModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="bg-red-600 hover:bg-red-700 text-white border-transparent"
                  onClick={confirmDisconnect}
                >
                  Disconnect Provider
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
