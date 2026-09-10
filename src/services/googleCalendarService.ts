import { CalendarEvent } from '../domain/types';
import firebaseConfig from '../../firebase-applet-config.json';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  primary?: boolean;
}

// Initialize Firebase Auth
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let authStateListeners: ((isAuthed: boolean) => void)[] = [];

export function notifyAuthChange(isAuthed: boolean) {
  authStateListeners.forEach(listener => listener(isAuthed));
}

export function subscribeToGoogleAuth(listener: (isAuthed: boolean) => void) {
  authStateListeners.push(listener);
  listener(!!cachedAccessToken);
  return () => {
    authStateListeners = authStateListeners.filter(l => l !== listener);
  };
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function isGoogleAuthed(): boolean {
  return !!cachedAccessToken;
}

export async function initGoogleCalendarAuth(): Promise<void> {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // Unfortunately, Firebase's onAuthStateChanged doesn't natively give us back the access token
        // if it was loaded from IndexedDB on a page refresh. We only get it directly from signInWithPopup.
        // However, for this preview environment, we can rely on the user having to re-click "Sign in" if the token is lost,
        // or we can silently sign them in if they are already authenticated.
        
        // Wait for token to be available if not already, or just set authed if we have user
        // Note: For full persistence of OAuth tokens, you'd usually store it securely or re-auth silently.
        // For now, if we have a user but no token, we might need them to re-auth, but let's notify anyway.
      } else {
        cachedAccessToken = null;
        notifyAuthChange(false);
      }
      resolve();
    });
  });
}

export async function loginGoogle() {
  if (isSigningIn) return;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      notifyAuthChange(true);
    }
  } catch (error) {
    console.error("Failed to sign in with Google:", error);
  } finally {
    isSigningIn = false;
  }
}

export async function logoutGoogle() {
  try {
    await signOut(auth);
    cachedAccessToken = null;
    notifyAuthChange(false);
  } catch (err) {
    console.error('Error during sign out', err);
  }
}

async function fetchGoogle(url: string, options: RequestInit = {}) {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    notifyAuthChange(false);
    cachedAccessToken = null;
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error(`Google API error: ${res.statusText}`);
  }
  return res;
}

export async function getGoogleCalendars(): Promise<GoogleCalendarListEntry[]> {
  if (!isGoogleAuthed()) return [];
  try {
    const res = await fetchGoogle('https://www.googleapis.com/calendar/v3/users/me/calendarList');
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error('Error fetching Google Calendars', err);
    return [];
  }
}

function mapGoogleEvent(gEvent: any, calendarId: string): CalendarEvent {
  const allDay = !!gEvent.start?.date;
  const startTime = allDay ? new Date(gEvent.start.date).getTime() : new Date(gEvent.start?.dateTime).getTime();
  const endTime = allDay ? new Date(gEvent.end?.date).getTime() : new Date(gEvent.end?.dateTime).getTime();
  
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
      const timeMin = new Date(start).toISOString();
      const timeMax = new Date(end).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&showDeleted=false&singleEvents=true&maxResults=250&orderBy=startTime`;
      const res = await fetchGoogle(url);
      const data = await res.json();
      return (data.items || []).map((e: any) => mapGoogleEvent(e, calendarId));
    });
    
    const results = await Promise.allSettled(promises);
    const events: CalendarEvent[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        events.push(...result.value);
      }
    });
    return events;
  } catch (err) {
    console.error('Error fetching Google events', err);
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
    let targetCalendarId = 'primary';
    let url = '';
    let method = 'POST';

    if (event.providerEventId && event.id && event.id.startsWith('gcal-')) {
      const match = event.id.match(/^gcal-(.+)-(.+)$/);
      if (match) targetCalendarId = match[1];
      url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${encodeURIComponent(event.providerEventId)}`;
      method = 'PUT';
    } else {
      url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`;
    }

    const res = await fetchGoogle(url, {
      method,
      body: JSON.stringify(gEvent)
    });
    const data = await res.json();
    return mapGoogleEvent(data, targetCalendarId);
  } catch (err) {
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
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${encodeURIComponent(event.providerEventId)}`;
    await fetchGoogle(url, { method: 'DELETE' });
  } catch (err) {
    console.error('Error deleting Google event', err);
    throw err;
  }
}
