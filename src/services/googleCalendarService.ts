import { CalendarEvent } from '../domain/types';
import firebaseConfig from '../../firebase-applet-config.json';

// Declare globals for GAPI and Google Identity Services
declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  primary?: boolean;
}

let tokenClient: any = null;
let isGapiInitialized = false;
let authStateListeners: ((isAuthed: boolean) => void)[] = [];

// Helper to notify listeners of auth changes
export function notifyAuthChange(isAuthed: boolean) {
  authStateListeners.forEach(listener => listener(isAuthed));
}

export function subscribeToGoogleAuth(listener: (isAuthed: boolean) => void) {
  authStateListeners.push(listener);
  listener(!!window.gapi?.client?.getToken()?.access_token);
  return () => {
    authStateListeners = authStateListeners.filter(l => l !== listener);
  };
}

export function getAccessToken(): string | null {
  return window.gapi?.client?.getToken()?.access_token || null;
}

export async function initGoogleCalendarAuth(): Promise<void> {
  if (tokenClient || isGapiInitialized) return;

  return new Promise((resolve, reject) => {
    const loadGapi = () => {
      return new Promise<void>((res) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client', async () => {
            await window.gapi.client.init({
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            });
            isGapiInitialized = true;
            res();
          });
        };
        script.onerror = () => reject(new Error("Failed to load gapi script"));
        document.body.appendChild(script);
      });
    };

    const loadGis = () => {
      return new Promise<void>((res) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
          const clientId = firebaseConfig.oAuthClientId;
          if (!clientId) {
            console.error("Missing oAuthClientId in firebase config");
            return;
          }
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.readonly',
            callback: (tokenResponse: any) => {
              if (tokenResponse.error !== undefined) {
                console.error(tokenResponse);
                return;
              }
              notifyAuthChange(true);
            },
          });
          res();
        };
        script.onerror = () => reject(new Error("Failed to load GIS script"));
        document.body.appendChild(script);
      });
    };

    Promise.all([loadGapi(), loadGis()]).then(() => resolve()).catch(reject);
  });
}

export function loginGoogle() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }
}

export function logoutGoogle() {
  const token = window.gapi?.client?.getToken();
  if (token && token.access_token) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      window.gapi.client.setToken('');
      notifyAuthChange(false);
    });
  } else {
    window.gapi?.client?.setToken('');
    notifyAuthChange(false);
  }
}

export function isGoogleAuthed(): boolean {
  return !!window.gapi?.client?.getToken()?.access_token;
}

export async function getGoogleCalendars(): Promise<GoogleCalendarListEntry[]> {
  if (!isGoogleAuthed()) return [];
  try {
    const response = await window.gapi.client.calendar.calendarList.list();
    return response.result.items;
  } catch (err: any) {
    console.error('Error fetching Google Calendars', err);
    if (err.status === 401) notifyAuthChange(false);
    return [];
  }
}

// Map Google Event to our internal model
function mapGoogleEvent(gEvent: any, calendarId: string): CalendarEvent {
  const allDay = !!gEvent.start.date;
  const startTime = allDay ? new Date(gEvent.start.date).getTime() : new Date(gEvent.start.dateTime).getTime();
  const endTime = allDay ? new Date(gEvent.end.date).getTime() : new Date(gEvent.end.dateTime).getTime();
  
  return {
    id: `gcal-${calendarId}-${gEvent.id}`, 
    title: gEvent.summary || '(No title)',
    description: gEvent.description || '',
    startTime,
    endTime,
    allDay,
    location: gEvent.location || '',
    recurrenceRule: gEvent.recurrence ? gEvent.recurrence.join(';') : null,
    reminders: gEvent.reminders?.overrides ? gEvent.reminders.overrides.map((r: any) => r.minutes) : [],
    provider: 'google',
    providerEventId: gEvent.id,
    createdAt: gEvent.created ? new Date(gEvent.created).getTime() : Date.now(),
    updatedAt: gEvent.updated ? new Date(gEvent.updated).getTime() : Date.now(),
    deletedAt: null,
    version: 1,
    syncStatus: 'synchronized',
  };
}

export async function getGoogleEvents(calendarIds: string[], start: number, end: number): Promise<CalendarEvent[]> {
  if (!isGoogleAuthed()) return [];
  
  try {
    const promises = calendarIds.map(async (calendarId) => {
      const response = await window.gapi.client.calendar.events.list({
        calendarId,
        timeMin: new Date(start).toISOString(),
        timeMax: new Date(end).toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 250,
        orderBy: 'startTime',
      });
      return response.result.items.map((e: any) => mapGoogleEvent(e, calendarId));
    });
    
    const results = await Promise.allSettled(promises);
    const events: CalendarEvent[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        events.push(...result.value);
      }
    });
    return events;
  } catch (err: any) {
    console.error('Error fetching Google events', err);
    if (err.status === 401) notifyAuthChange(false);
    return [];
  }
}

export async function saveGoogleEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt'> & { id?: string }): Promise<CalendarEvent> {
  if (!isGoogleAuthed()) throw new Error('Not authenticated with Google');

  const gEvent: any = {
    summary: event.title,
    description: event.description,
    location: event.location,
  };

  if (event.allDay) {
    // For all-day events, the end date must be exclusive (the next day)
    const startDateStr = new Date(event.startTime).toISOString().split('T')[0];
    let endDateStr = new Date(event.endTime).toISOString().split('T')[0];
    
    if (endDateStr <= startDateStr) {
      const d = new Date(event.startTime);
      d.setDate(d.getDate() + 1);
      endDateStr = d.toISOString().split('T')[0];
    }
    
    gEvent.start = { date: startDateStr };
    gEvent.end = { date: endDateStr };
  } else {
    gEvent.start = { dateTime: new Date(event.startTime).toISOString() };
    gEvent.end = { dateTime: new Date(event.endTime).toISOString() };
  }

  try {
    let response;
    // We assume saving to the 'primary' calendar for now unless specified
    // A robust app would let the user choose which calendar to save to.
    let targetCalendarId = 'primary';
    
    if (event.providerEventId && event.id && event.id.startsWith('gcal-')) {
      // Extract calendar ID from our composite ID 'gcal-{calendarId}-{eventId}'
      const match = event.id.match(/^gcal-(.+)-(.+)$/);
      if (match) targetCalendarId = match[1];
      
      response = await window.gapi.client.calendar.events.update({
        calendarId: targetCalendarId,
        eventId: event.providerEventId,
        resource: gEvent,
      });
    } else {
      response = await window.gapi.client.calendar.events.insert({
        calendarId: targetCalendarId,
        resource: gEvent,
      });
    }
    return mapGoogleEvent(response.result, targetCalendarId);
  } catch (err: any) {
    console.error('Error saving Google event', err);
    throw err;
  }
}

export async function deleteGoogleEvent(event: CalendarEvent): Promise<void> {
  if (!isGoogleAuthed()) throw new Error('Not authenticated with Google');
  
  if (!event.providerEventId) return;
  
  let targetCalendarId = 'primary';
  if (event.id.startsWith('gcal-')) {
    const match = event.id.match(/^gcal-(.+)-(.+)$/);
    if (match) targetCalendarId = match[1];
  }

  try {
    await window.gapi.client.calendar.events.delete({
      calendarId: targetCalendarId,
      eventId: event.providerEventId,
    });
  } catch (err: any) {
    console.error('Error deleting Google event', err);
    throw err;
  }
}
