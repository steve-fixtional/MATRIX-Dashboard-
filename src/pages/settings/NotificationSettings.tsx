import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { useSettings } from '../../hooks/useSettings';
import { Bell, AlertTriangle } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

export function NotificationSettings() {
  const { settings, saveSettings } = useSettings();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === 'granted') {
      saveSettings({ notificationsEnabled: true });
    } else {
      saveSettings({ notificationsEnabled: false });
    }
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      await requestPermission();
    }
    notificationService.showNotification('Test Notification', {
      body: 'Notifications are working properly!',
      tag: 'test-notification'
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Notifications</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Manage how and when you want to be notified.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-50">Browser Notifications</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Enable notifications to receive timely alerts for tasks and calendar events.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status:</span>
                <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                  permission === 'granted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  permission === 'denied' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not Requested'}
                </span>
              </div>
              {permission !== 'granted' && (
                <div className="mt-2">
                  <button
                    onClick={requestPermission}
                    className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors"
                  >
                    Enable Notifications
                  </button>
                </div>
              )}
              {permission === 'granted' && (
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={handleTestNotification}
                    className="text-sm px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-md font-medium transition-colors"
                  >
                    Send Test Notification
                  </button>
                </div>
              )}
            </div>
            
            {permission === 'denied' && (
              <div className="mt-4 flex gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="text-sm text-red-800 dark:text-red-300">
                  You have blocked notifications in your browser. To enable them, click the lock icon in your browser's address bar and change the notification setting to 'Allow'.
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-50 uppercase tracking-wider">Categories</h3>
        
        <Card className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <div className="p-4 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Tasks</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Receive reminders for upcoming and overdue tasks</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings?.tasksNotificationsEnabled ?? true}
                onChange={(e) => saveSettings({ tasksNotificationsEnabled: e.target.checked })}
                disabled={permission !== 'granted'}
              />
              <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 transition-colors ${
                (settings?.tasksNotificationsEnabled ?? true) && permission === 'granted'
                  ? 'bg-indigo-600'
                  : 'bg-neutral-300 dark:bg-neutral-700'
              } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600`}></div>
            </label>
          </div>
          
          <div className="p-4 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Calendar Events</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Receive reminders before calendar events start</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings?.eventsNotificationsEnabled ?? true}
                onChange={(e) => saveSettings({ eventsNotificationsEnabled: e.target.checked })}
                disabled={permission !== 'granted'}
              />
              <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 transition-colors ${
                (settings?.eventsNotificationsEnabled ?? true) && permission === 'granted'
                  ? 'bg-indigo-600'
                  : 'bg-neutral-300 dark:bg-neutral-700'
              } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600`}></div>
            </label>
          </div>
        </Card>
      </div>

      <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
        <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">Platform Limitations</h4>
        <ul className="text-sm text-neutral-600 dark:text-neutral-400 list-disc pl-5 space-y-1">
          <li>Browsers may throttle notifications when the app is running in the background.</li>
          <li>If the browser is completely closed and MATRIX is not installed as a PWA, background notifications cannot be delivered.</li>
          <li>Ensure MATRIX is installed as an app (PWA) and kept running in the background for reliable delivery.</li>
          <li>Some operating systems have "Focus" or "Do Not Disturb" modes that will silence Web Notifications.</li>
          <li>Duplicate notifications from different synced devices are mitigated locally, but if the app is closed on a device, the background checks are disabled until reopened.</li>
        </ul>
      </div>
    </div>
  );
}
