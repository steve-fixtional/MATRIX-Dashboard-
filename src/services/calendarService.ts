import { CalendarEvent } from '../domain/types';
import { requestSync } from './sync';
import { getGoogleEvents, saveGoogleEvent, deleteGoogleEvent, isGoogleAuthed, getGoogleCalendars, loginGoogle, logoutGoogle, subscribeToGoogleAuth } from './googleCalendarService';
import { Repository } from './repository';

const eventRepository = new Repository('events');

export interface ExternalCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

export function isExternalCalendarAvailable(): boolean {
  return isGoogleAuthed();
}

export async function getExternalCalendars(): Promise<ExternalCalendar[]> {
  if (!isGoogleAuthed()) return [];
  const cals = await getGoogleCalendars();
  return cals.map(c => ({
    id: c.id,
    summary: c.summary,
    primary: c.primary
  }));
}

export function loginExternalProvider() {
  return loginGoogle();
}

export function logoutExternalProvider() {
  return logoutGoogle();
}

export function subscribeToExternalProviderAuth(callback: (authed: boolean) => void) {
  return subscribeToGoogleAuth(callback);
}

// Manage selected external calendars
export function getSelectedExternalCalendars(): string[] {
  const stored = localStorage.getItem('selectedExternalCalendars');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // fallback
    }
  }
  return ['primary']; // default
}

export function setSelectedExternalCalendars(calendarIds: string[]) {
  localStorage.setItem('selectedExternalCalendars', JSON.stringify(calendarIds));
}

export async function getEvents(start: number, end: number, includeDeleted = false): Promise<CalendarEvent[]> {
  const allLocalEvents = await eventRepository.list(includeDeleted);
  
  // Filter by time range
  let localEvents = allLocalEvents.filter(e => {
    return e.startTime <= end && e.endTime >= start;
  });
  
  let externalEvents: CalendarEvent[] = [];
  if (isExternalCalendarAvailable()) {
    try {
      const selectedCalendars = getSelectedExternalCalendars();
      if (selectedCalendars.length > 0) {
        externalEvents = await getGoogleEvents(selectedCalendars, start, end);
      }
    } catch (e) {
      console.warn('Failed to fetch external events, working offline.', e);
    }
  }

  const combined = [...localEvents, ...externalEvents];
  return combined.sort((a, b) => a.startTime - b.startTime);
}

export async function getEvent(id: string): Promise<CalendarEvent | undefined> {
  // We only lookup local events directly by ID for now.
  // Google events are retrieved via list in getEvents.
  if (id.startsWith('gcal-')) {
    // We could implement a direct fetch, but for now this is usually called from an already-loaded context
    return undefined; 
  }
  return eventRepository.read(id);
}

export async function saveEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt' | 'syncStatus' | 'syncError'> & { id?: string }): Promise<CalendarEvent> {
  if (event.provider === 'google') {
    return saveGoogleEvent(event as any); // cast for now as google events handle metadata internally 
  }

  // Local Save
  let savedEvent: CalendarEvent;
  if (event.id && !event.id.startsWith('gcal-')) {
    const existing = await eventRepository.read(event.id);
    if (existing) {
      savedEvent = await eventRepository.update(event.id, event);
    } else {
      savedEvent = await eventRepository.create(event);
    }
  } else {
    savedEvent = await eventRepository.create(event);
  }

  requestSync();

  return savedEvent;
}

export async function deleteEvent(event: CalendarEvent): Promise<void> {
  if (event.provider === 'google') {
    return deleteGoogleEvent(event);
  }

  await eventRepository.delete(event.id);
  requestSync();
}
