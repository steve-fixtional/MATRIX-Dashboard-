import React from 'react';
import { CalendarEvent } from '../../domain/types';
import { Plus, X, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, RefreshCw, Bell } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useEventForm } from './hooks/useEventForm';
import { FileAttachments } from '../../components/ui/FileAttachments';
import { ItemSyncStatus } from '../../components/ui/ItemSyncStatus';

interface EventCreatorProps {
  initialDate?: Date;
  eventToEdit?: CalendarEvent;
  onSave: (event: Partial<CalendarEvent>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export function EventCreator({ initialDate, eventToEdit, onSave, onCancel, onDelete }: EventCreatorProps) {
  const {
    title, setTitle,
    description, setDescription,
    location, setLocation,
    allDay, setAllDay,
    reminders, setReminders,
    provider, setProvider,
    externalCalendars,
    selectedExternalCalendarId, setSelectedExternalCalendarId,
    startDateStr, startTimeStr,
    endDateStr, endTimeStr,
    handleStartDateChange, handleStartTimeChange,
    handleEndDateChange, handleEndTimeChange,
    buildEventData
  } = useEventForm(initialDate, eventToEdit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = buildEventData();
    if (data) {
      onSave(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="font-semibold text-lg">{eventToEdit ? 'Edit Event' : 'New Event'}</h2>
            {eventToEdit && <ItemSyncStatus item={eventToEdit} />}
          </div>
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
            {externalCalendars.length > 0 && !eventToEdit && (
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-4 w-4 text-neutral-500 shrink-0" />
                <select 
                  value={provider === 'google' ? selectedExternalCalendarId : 'local'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'local') {
                      setProvider('local');
                    } else {
                      setProvider('google');
                      setSelectedExternalCalendarId(val);
                    }
                  }}
                  className="w-full bg-transparent border-none focus:ring-0 p-1.5 text-sm dark:text-neutral-100 cursor-pointer text-neutral-900 font-medium"
                >
                  <option value="local">Local Calendar (Offline)</option>
                  {externalCalendars.map(cal => (
                    <option key={cal.id} value={cal.id}>External Calendar: {cal.summary}</option>
                  ))}
                </select>
              </div>
            )}
            {eventToEdit && (
              <div className="flex items-center gap-3 py-1 text-sm text-neutral-500 font-medium">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {eventToEdit.provider === 'google' ? 'External Calendar' : 'Local Calendar'}
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
                  <input type="date" required value={startDateStr} onChange={e => handleStartDateChange(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900" />
                  {!allDay && <input type="time" required value={startTimeStr} onChange={e => handleStartTimeChange(e.target.value)} className="w-[100px] bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900" />}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500">Ends</label>
                <div className="flex gap-2">
                  <input type="date" required value={endDateStr} onChange={e => handleEndDateChange(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900" />
                  {!allDay && <input type="time" required value={endTimeStr} onChange={e => handleEndTimeChange(e.target.value)} className="w-[100px] bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900" />}
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
              <Bell className="h-4 w-4 text-neutral-500 mt-2 shrink-0" />
              <select
                value={reminders.length > 0 ? reminders[0] : -1}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (val === -1) {
                    setReminders([]);
                  } else {
                    setReminders([val]);
                  }
                }}
                className="w-full bg-transparent border-none focus:ring-0 p-1.5 text-sm dark:text-neutral-100 cursor-pointer text-neutral-900"
              >
                <option value="-1">No reminder</option>
                <option value="0">At time of event</option>
                <option value="5">5 minutes before</option>
                <option value="15">15 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
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
            
            {eventToEdit && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 mt-4">
                <FileAttachments entityId={eventToEdit.id} />
              </div>
            )}
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
