import { useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { getTasks } from '../services/taskService';
import { getEvents } from '../services/calendarService';
import { useSettings } from './useSettings';

export function useNotificationPoller() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings || !settings.notificationsEnabled) return;

    const checkNotifications = async () => {
      try {
        if (settings.tasksNotificationsEnabled) {
          const tasks = await getTasks();
          await notificationService.checkTasks(tasks);
        }
        
        if (settings.eventsNotificationsEnabled) {
          const now = Date.now();
          const oneDayMs = 24 * 60 * 60 * 1000;
          // Look at events starting up to 1 day ago (for recently passed ones) and 1 day in the future
          const events = await getEvents(now - oneDayMs, now + oneDayMs);
          await notificationService.checkEvents(events);
        }
      } catch (error) {
        console.error('Error checking notifications', error);
      }
    };

    checkNotifications();

    const interval = setInterval(checkNotifications, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [settings]);
}
