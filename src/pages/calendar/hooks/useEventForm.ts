import { useState, useEffect } from 'react';
import { CalendarEvent } from '../../../domain/types';
import { isExternalCalendarAvailable, getExternalCalendars, ExternalCalendar } from '../../../services/calendarService';

export function useEventForm(initialDate?: Date, eventToEdit?: CalendarEvent) {
  const [title, setTitle] = useState(eventToEdit?.title || '');
  const [description, setDescription] = useState(eventToEdit?.description || '');
  const [location, setLocation] = useState(eventToEdit?.location || '');
  const [allDay, setAllDay] = useState(eventToEdit?.allDay || false);
  const [reminders, setReminders] = useState<number[]>(eventToEdit?.reminders || [15]); // default 15 min

  const [provider, setProvider] = useState<'local' | 'google'>(eventToEdit?.provider || 'local');
  const [externalCalendars, setExternalCalendars] = useState<ExternalCalendar[]>([]);
  const [selectedExternalCalendarId, setSelectedExternalCalendarId] = useState<string>('primary');
  
  useEffect(() => {
    if (isExternalCalendarAvailable()) {
      getExternalCalendars().then(cals => {
        setExternalCalendars(cals);
        if (!eventToEdit && cals.length > 0 && provider === 'local') {
          // If external calendar is connected, default to it
          setProvider('google');
          const primary = cals.find(c => c.primary) || cals[0];
          if (primary) setSelectedExternalCalendarId(primary.id);
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

  const startObj = new Date(startTime);
  const endObj = new Date(endTime);

  const startDateStr = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`;
  const startTimeStr = `${String(startObj.getHours()).padStart(2, '0')}:${String(startObj.getMinutes()).padStart(2, '0')}`;
  
  const endDateStr = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}-${String(endObj.getDate()).padStart(2, '0')}`;
  const endTimeStr = `${String(endObj.getHours()).padStart(2, '0')}:${String(endObj.getMinutes()).padStart(2, '0')}`;

  const handleStartDateChange = (newDateStr: string) => {
    const [y, m, d] = newDateStr.split('-').map(Number);
    const newD = new Date(startObj);
    newD.setFullYear(y, m - 1, d);
    setStartTime(newD.getTime());
  };

  const handleStartTimeChange = (newTimeStr: string) => {
    const [h, min] = newTimeStr.split(':').map(Number);
    const newD = new Date(startObj);
    newD.setHours(h, min, 0, 0);
    setStartTime(newD.getTime());
  };

  const handleEndDateChange = (newDateStr: string) => {
    const [y, m, d] = newDateStr.split('-').map(Number);
    const newD = new Date(endObj);
    newD.setFullYear(y, m - 1, d);
    setEndTime(newD.getTime());
  };

  const handleEndTimeChange = (newTimeStr: string) => {
    const [h, min] = newTimeStr.split(':').map(Number);
    const newD = new Date(endObj);
    newD.setHours(h, min, 0, 0);
    setEndTime(newD.getTime());
  };

  const buildEventData = (): Partial<CalendarEvent> | null => {
    if (!title.trim()) return null;
    
    // Construct a composite ID for new Google events so the service knows which calendar to use
    let targetId = eventToEdit?.id;
    if (!targetId && provider === 'google') {
      targetId = `gcal-${selectedExternalCalendarId}-new`;
    }

    return {
      id: targetId,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      startTime,
      endTime,
      allDay,
      provider,
      reminders,
      recurrenceRule: null,
      providerEventId: eventToEdit?.providerEventId || null
    };
  };

  return {
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
    buildEventData,
  };
}
