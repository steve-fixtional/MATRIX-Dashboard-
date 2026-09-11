import { Task, CalendarEvent } from '../domain/types';
import { getAppSettings } from './settingsService';

interface TriggeredNotification {
  id: string; // task or event ID
  type: 'task' | 'event';
  timestamp: number; // The exact time the reminder was supposed to fire
}

const STORAGE_KEY = 'matrix_notifications_triggered';

export class NotificationService {
  private triggered: TriggeredNotification[] = [];

  constructor() {
    this.loadTriggered();
  }

  private loadTriggered() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.triggered = JSON.parse(stored);
        // Clean up old triggered items (older than 30 days)
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        this.triggered = this.triggered.filter(t => t.timestamp > thirtyDaysAgo);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.triggered));
      }
    } catch (e) {
      console.error('Failed to load triggered notifications', e);
    }
  }

  private saveTriggered() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.triggered));
    } catch (e) {
      console.error('Failed to save triggered notifications', e);
    }
  }

  private hasBeenTriggered(id: string, type: 'task' | 'event', timestamp: number): boolean {
    return this.triggered.some(t => t.id === id && t.type === type && t.timestamp === timestamp);
  }

  private markAsTriggered(id: string, type: 'task' | 'event', timestamp: number) {
    this.triggered.push({ id, type, timestamp });
    this.saveTriggered();
  }

  async showNotification(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      } catch (e) {
        // Fallback if ServiceWorker fails
        new Notification(title, options);
      }
    }
  }

  async checkTasks(tasks: Task[]) {
    const settings = await getAppSettings();
    if (!settings.notificationsEnabled || !settings.tasksNotificationsEnabled) return;
    if (Notification.permission !== 'granted') return;

    const now = Date.now();
    const threshold = 5 * 60 * 1000; // 5 minute window

    for (const task of tasks) {
      if (task.completed || !task.dueDate) continue;

      const reminders = task.reminders && task.reminders.length > 0 ? task.reminders : [0]; // default to at due time

      for (const reminderMinutes of reminders) {
        const targetTime = task.dueDate - reminderMinutes * 60 * 1000;
        
        // If the target time is within the last 5 minutes
        if (now >= targetTime && now <= targetTime + threshold) {
          if (!this.hasBeenTriggered(task.id, 'task', targetTime)) {
            const timeStr = reminderMinutes === 0 ? 'is due now' : `is due in ${reminderMinutes} minutes`;
            this.showNotification(`Task Reminder: ${task.title}`, {
              body: `Your task ${timeStr}.`,
              tag: `task-${task.id}-${targetTime}`,
              icon: '/pwa-192x192.png'
            });
            this.markAsTriggered(task.id, 'task', targetTime);
          }
        }
      }

      // Overdue reminder (e.g., 1 hour after due date)
      const overdueTime = task.dueDate + 60 * 60 * 1000;
      if (now >= overdueTime && now <= overdueTime + threshold) {
        if (!this.hasBeenTriggered(task.id, 'task', overdueTime)) {
          this.showNotification(`Task Overdue: ${task.title}`, {
            body: `Your task was due 1 hour ago.`,
            tag: `task-${task.id}-overdue`,
            icon: '/pwa-192x192.png'
          });
          this.markAsTriggered(task.id, 'task', overdueTime);
        }
      }
    }
  }

  async checkEvents(events: CalendarEvent[]) {
    const settings = await getAppSettings();
    if (!settings.notificationsEnabled || !settings.eventsNotificationsEnabled) return;
    if (Notification.permission !== 'granted') return;

    const now = Date.now();
    const threshold = 5 * 60 * 1000; // 5 minute window

    for (const event of events) {
      if (!event.reminders || event.reminders.length === 0) continue;

      for (const reminderMinutes of event.reminders) {
        const targetTime = event.startTime - reminderMinutes * 60 * 1000;
        
        if (now >= targetTime && now <= targetTime + threshold) {
          if (!this.hasBeenTriggered(event.id, 'event', targetTime)) {
            const timeStr = reminderMinutes === 0 ? 'starts now' : `starts in ${reminderMinutes} minutes`;
            this.showNotification(`Event: ${event.title}`, {
              body: `Your event ${timeStr}.`,
              tag: `event-${event.id}-${targetTime}`,
              icon: '/pwa-192x192.png'
            });
            this.markAsTriggered(event.id, 'event', targetTime);
          }
        }
      }
    }
  }
}

export const notificationService = new NotificationService();
