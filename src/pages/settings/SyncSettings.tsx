import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useSyncState } from '../../store/SyncContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import { RefreshCw, HardDrive, Download, Database, Upload, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getDB } from '../../services/db';
import { syncEngine, StorageDiagnostics } from '../../services/sync';

export function SyncSettings() {
  const { syncStatus, lastSyncedAt, pendingCount, requestSync, isOnline, error } = useSyncState();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDiagnostics = () => {
    syncEngine.getStorageDiagnostics().then(setDiagnostics).catch(console.error);
  };

  useEffect(() => {
    refreshDiagnostics();
    const interval = setInterval(refreshDiagnostics, 10000);
    return () => clearInterval(interval);
  }, [syncStatus, pendingCount]);

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
      a.download = `matrix-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
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

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportNotice(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const db = await getDB();
      const stores = ['projects', 'notes', 'tasks', 'events', 'clipboard', 'preferences'];
      let importedCount = 0;

      for (const storeName of stores) {
        if (Array.isArray(parsed[storeName])) {
          const tx = db.transaction(storeName as any, 'readwrite');
          const store = tx.objectStore(storeName as any);
          for (const item of parsed[storeName]) {
            if (item && item.id) {
              await store.put(item);
              importedCount++;
            }
          }
          await tx.done;
        }
      }

      setImportNotice(`Successfully imported ${importedCount} items.`);
      requestSync();
      refreshDiagnostics();
    } catch (err: any) {
      console.error('Failed to import backup:', err);
      setImportNotice('Failed to import file. Please verify valid JSON format.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
          <CardDescription>MATRIX keeps your data synced securely across devices and browser tabs.</CardDescription>
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
                  {lastSyncedAt ? `Last synced: ${format(lastSyncedAt, 'MMM d, h:mm a')}` : 'Local storage initialized'}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                requestSync();
                setTimeout(refreshDiagnostics, 500);
              }}
              disabled={syncStatus === 'syncing'}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Sync notice:</span> {error.message}
              <div className="mt-1 text-neutral-500 dark:text-neutral-400">
                Your local data is fully preserved and accessible in offline storage.
              </div>
            </div>
          )}

          {/* Cloud & Local Diagnostics Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Local Database</span>
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                </span>
              </div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                IndexedDB (Browser Persistent)
              </div>
              <div className="mt-2 space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Notes:</span>
                  <span className="font-mono">{diagnostics?.collections?.notes?.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tasks:</span>
                  <span className="font-mono">{diagnostics?.collections?.tasks?.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Projects:</span>
                  <span className="font-mono">{diagnostics?.collections?.projects?.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Events:</span>
                  <span className="font-mono">{diagnostics?.collections?.events?.total ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Cloud Sync Status</span>
                <span className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Standalone / Local
                </span>
              </div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {diagnostics?.cloudReachable ? 'Cloud Connected (Firestore)' : 'Private Local-First Mode'}
              </div>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                All records, notes, and password vault items are stored locally with zero latency and multi-tab synchronization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Backup & Migration</CardTitle>
          <CardDescription>Export or import your complete local command center database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                This export includes your notes, tasks, calendar events, clipboard history, and preferences. You can import this JSON file into any browser instance to restore your data.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export JSON Backup'}
              </Button>

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Importing...' : 'Import Backup File'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            {importNotice && (
              <div className="p-3 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
                {importNotice}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local Storage Architecture</CardTitle>
          <CardDescription>Information about data stored on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
            <HardDrive className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
            <div className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              MATRIX uses an offline-first architecture. All your data is stored locally in your browser&apos;s IndexedDB, allowing you to use the app without an internet connection. Changes are synced across tabs in real time and synced to cloud storage when available.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
