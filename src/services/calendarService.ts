import { CalendarEvent } from '../domain/types';
import { requestSync } from './sync';
import { getGoogleEvents, saveGoogleEvent, deleteGoogleEvent, isGoogleAuthed } from './googleCalendarService';
import { Repository } from './repository';

const eventRepository = new Repository('events');

// Manage selected Google calendars
export function getSelectedGoogleCalendars(): string[] {
  const stored = localStorage.getItem('selectedGoogleCalendars');
  if (stored) return JSON.parse(stored);
  return ['primary']; // default
}

export function setSelectedGoogleCalendars(calendarIds: string[]) {
  localStorage.setItem('selectedGoogleCalendars', JSON.stringify(calendarIds));
}

export async function getEvents(start: number, end: number, includeDeleted = false): Promise<CalendarEvent[]> {
  const allLocalEvents = await eventRepository.list(includeDeleted);
  
  // Filter by time range
  let localEvents = allLocalEvents.filter(e => {
    return e.startTime <= end && e.endTime >= start;
  });
  
  let googleEvents: CalendarEvent[] = [];
  if (isGoogleAuthed()) {
    try {
      const selectedCalendars = getSelectedGoogleCalendars();
      if (selectedCalendars.length > 0) {
        googleEvents = await getGoogleEvents(selectedCalendars, start, end);
      }
    } catch (e) {
      console.warn('Failed to fetch Google events, working offline.', e);
    }
  }

  const combined = [...localEvents, ...googleEvents];
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
