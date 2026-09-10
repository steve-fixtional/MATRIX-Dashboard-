import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../../domain/types';
import { Plus, X, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, RefreshCw, Bell } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { isGoogleAuthed, getGoogleCalendars, GoogleCalendarListEntry } from '../../services/googleCalendarService';

interface EventCreatorProps {
  initialDate?: Date;
  eventToEdit?: CalendarEvent;
  onSave: (event: Partial<CalendarEvent>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export function EventCreator({ initialDate, eventToEdit, onSave, onCancel, onDelete }: EventCreatorProps) {
  const [title, setTitle] = useState(eventToEdit?.title || '');
  const [description, setDescription] = useState(eventToEdit?.description || '');
  const [location, setLocation] = useState(eventToEdit?.location || '');
  const [allDay, setAllDay] = useState(eventToEdit?.allDay || false);
  
  const [provider, setProvider] = useState<'local' | 'google'>(eventToEdit?.provider || 'local');
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [selectedGoogleCalendarId, setSelectedGoogleCalendarId] = useState<string>('primary');
  
  useEffect(() => {
    if (isGoogleAuthed()) {
      getGoogleCalendars().then(cals => {
        setGoogleCalendars(cals);
        if (!eventToEdit && cals.length > 0 && provider === 'local') {
          // If google is connected, default to it
          setProvider('google');
          const primary = cals.find(c => c.primary) || cals[0];
          if (primary) setSelectedGoogleCalendarId(primary.id);
        }
      });
    }
  }, [eventToEdit, provider]);
  
  const defaultStart = new Date(initialDate || new Date());
  if (!initialDate) {
    defaultStart.setMinutes(0);
    defaultStart.setSeconds(0);
    defaultStart.setMilliseconds(0);
    defaultStart.setHours(defaultStart.getHours() + 1);
  } else if (!eventToEdit && !allDay) {
    // If clicking a date, maybe set time to 9 AM
    defaultStart.setHours(9, 0, 0, 0);
  }

  const defaultEnd = new Date(defaultStart);
  defaultEnd.setHours(defaultStart.getHours() + 1);

  const [startTime, setStartTime] = useState<number>(eventToEdit?.startTime || defaultStart.getTime());
  const [endTime, setEndTime] = useState<number>(eventToEdit?.endTime || defaultEnd.getTime());

  // Simplify string date handling for inputs
  const startObj = new Date(startTime);
  const endObj = new Date(endTime);

  const startDateStr = startObj.toISOString().substring(0, 10);
  const startTimeStr = startObj.toTimeString().substring(0, 5);
  
  const endDateStr = endObj.toISOString().substring(0, 10);
  const endTimeStr = endObj.toTimeString().substring(0, 5);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newD = new Date(e.target.value + 'T' + startTimeStr);
    if (!isNaN(newD.getTime())) setStartTime(newD.getTime());
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newD = new Date(startDateStr + 'T' + e.target.value);
    if (!isNaN(newD.getTime())) setStartTime(newD.getTime());
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newD = new Date(e.target.value + 'T' + endTimeStr);
    if (!isNaN(newD.getTime())) setEndTime(newD.getTime());
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newD = new Date(endDateStr + 'T' + e.target.value);
    if (!isNaN(newD.getTime())) setEndTime(newD.getTime());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Construct a composite ID for new Google events so the service knows which calendar to use
    let targetId = eventToEdit?.id;
    if (!targetId && provider === 'google') {
      targetId = `gcal-${selectedGoogleCalendarId}-new`;
    }

    onSave({
      id: targetId,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      startTime,
      endTime,
      allDay,
      provider,
      reminders: [],
      recurrenceRule: null,
      providerEventId: eventToEdit?.providerEventId || null
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="font-semibold text-lg">{eventToEdit ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onCancel} className="text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 p-1.5 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div>
            <input 
              autoFocus
              type="text" 
              placeholder="Event title"
              className="w-full text-xl font-semibold bg-transparent border-none focus:ring-0 p-0 placeholder:text-neutral-400 dark:text-neutral-100"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {googleCalendars.length > 0 && !eventToEdit && (
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-4 w-4 text-neutral-500 shrink-0" />
                <select 
                  value={provider === 'google' ? selectedGoogleCalendarId : 'local'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'local') {
                      setProvider('local');
                    } else {
                      setProvider('google');
                      setSelectedGoogleCalendarId(val);
                    }
                  }}
                  className="w-full bg-transparent border-none focus:ring-0 p-1.5 text-sm dark:text-neutral-100 cursor-pointer text-neutral-900 font-medium"
                >
                  <option value="local">Local Calendar (Offline)</option>
                  {googleCalendars.map(cal => (
                    <option key={cal.id} value={cal.id}>Google Calendar: {cal.summary}</option>
                  ))}
                </select>
              </div>
            )}
            {eventToEdit && (
              <div className="flex items-center gap-3 py-1 text-sm text-neutral-500 font-medium">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {eventToEdit.provider === 'google' ? 'Google Calendar' : 'Local Calendar'}
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/50">
              <span className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-neutral-500"/> All-day</span>
              <input 
                type="checkbox" 
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 h-4 w-4"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500">Starts</label>
                <div className="flex gap-2">
                  <input type="date" required value={startDateStr} onChange={handleStartDateChange} className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900" />
                  {!allDay && <input type="time" required value={startTimeStr} onChange={handleStartTimeChange} className="w-[100px] bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900" />}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500">Ends</label>
                <div className="flex gap-2">
                  <input type="date" required value={endDateStr} onChange={handleEndDateChange} className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900" />
                  {!allDay && <input type="time" required value={endTimeStr} onChange={handleEndTimeChange} className="w-[100px] bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900" />}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-neutral-500 mt-2 shrink-0" />
              <input 
                type="text"
                placeholder="Add location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 p-1.5 text-sm placeholder:text-neutral-400 dark:text-neutral-100"
              />
            </div>

            <div className="flex items-start gap-3">
              <AlignLeft className="h-4 w-4 text-neutral-500 mt-2 shrink-0" />
              <textarea 
                placeholder="Add description or notes"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-transparent border-none focus:ring-0 p-1.5 text-sm resize-none placeholder:text-neutral-400 dark:text-neutral-100"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-neutral-800">
            {eventToEdit && onDelete ? (
              <Button type="button" variant="ghost" onClick={() => onDelete(eventToEdit.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                Delete
              </Button>
            ) : <div />}
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
              <Button type="submit" disabled={!title.trim()}>Save Event</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
