import { useState } from 'react';
import { useSyncState } from '../../store/SyncContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import { RefreshCw, HardDrive, Download, Database } from 'lucide-react';
import { getDB } from '../../services/db';

export function SyncSettings() {
  const { syncStatus, lastSyncedAt, pendingCount, requestSync, isOnline, error } = useSyncState();
  const [exporting, setExporting] = useState(false);

  const getStatusColor = () => {
    if (!isOnline) return 'text-neutral-500';
    if (syncStatus === 'syncing') return 'text-blue-500';
    if (syncStatus === 'sync_failed') return 'text-red-500';
    if (syncStatus === 'auth_required') return 'text-amber-500';
    if (pendingCount > 0) return 'text-amber-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus === 'syncing') return 'Syncing...';
    if (syncStatus === 'sync_failed') return 'Sync Error';
    if (syncStatus === 'auth_required') return 'Sign In Required';
    if (pendingCount > 0) return `${pendingCount} pending changes`;
    return 'Synchronized';
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const db = await getDB();
      const exportData: Record<string, any> = {};
      
      const stores = ['projects', 'notes', 'tasks', 'events', 'clipboard', 'preferences'];
      
      for (const storeName of stores) {
        exportData[storeName] = await db.getAll(storeName as any);
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matrix-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export data', e);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Sync & Data</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage synchronization, backups, and local storage.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Synchronization</CardTitle>
          <CardDescription>MATRIX keeps your data synced securely across devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 ${getStatusColor()}`}>
                <RefreshCw className={`h-5 w-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{getStatusText()}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {lastSyncedAt ? `Last synced: ${format(lastSyncedAt, 'MMM d, h:mm a')}` : 'Never synced'}
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={requestSync} 
              disabled={syncStatus === 'syncing' || !isOnline}
              className="w-full sm:w-auto"
            >
              Sync Now
            </Button>
          </div>
          {error && (
            <div className="mt-3 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
              <span className="font-semibold">Sync notice:</span> {error.message}
              <div className="mt-1 text-neutral-500 dark:text-neutral-400">
                Your local data is fully preserved and accessible in offline storage. Click &quot;Sync Now&quot; to retry anytime.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>Download a complete backup of your local database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                This export includes your notes, tasks, calendar events, clipboard history, and preferences. It does not include external attachments or Google Workspace data.
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={exporting}
              className="w-full sm:w-auto self-start"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export Data (JSON)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local Storage</CardTitle>
          <CardDescription>Information about data stored on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
            <HardDrive className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
            <div className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              MATRIX uses an offline-first architecture. All your data is stored locally in your browser's IndexedDB, allowing you to use the app without an internet connection. Changes are synced to the cloud in the background when you are online.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
