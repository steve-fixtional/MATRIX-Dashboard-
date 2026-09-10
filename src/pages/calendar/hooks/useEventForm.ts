import { useState, useEffect } from 'react';
import { CalendarEvent } from '../../../domain/types';
import { isExternalCalendarAvailable, getExternalCalendars, ExternalCalendar } from '../../../services/calendarService';

export function useEventForm(initialDate?: Date, eventToEdit?: CalendarEvent) {
  const [title, setTitle] = useState(eventToEdit?.title || '');
  const [description, setDescription] = useState(eventToEdit?.description || '');
  const [location, setLocation] = useState(eventToEdit?.location || '');
  const [allDay, setAllDay] = useState(eventToEdit?.allDay || false);
  
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

  // Simplify string date handling for inputs
  const startObj = new Date(startTime);
  const endObj = new Date(endTime);

  const startDateStr = startObj.toISOString().substring(0, 10);
  const startTimeStr = startObj.toTimeString().substring(0, 5);
  
  const endDateStr = endObj.toISOString().substring(0, 10);
  const endTimeStr = endObj.toTimeString().substring(0, 5);

  const handleStartDateChange = (newDateStr: string) => {
    const newD = new Date(newDateStr + 'T' + startTimeStr);
    if (!isNaN(newD.getTime())) setStartTime(newD.getTime());
  };

  const handleStartTimeChange = (newTimeStr: string) => {
    const newD = new Date(startDateStr + 'T' + newTimeStr);
    if (!isNaN(newD.getTime())) setStartTime(newD.getTime());
  };

  const handleEndDateChange = (newDateStr: string) => {
    const newD = new Date(newDateStr + 'T' + endTimeStr);
    if (!isNaN(newD.getTime())) setEndTime(newD.getTime());
  };

  const handleEndTimeChange = (newTimeStr: string) => {
    const newD = new Date(endDateStr + 'T' + newTimeStr);
    if (!isNaN(newD.getTime())) setEndTime(newD.getTime());
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
      reminders: [],
      recurrenceRule: null,
      providerEventId: eventToEdit?.providerEventId || null
    };
  };

  return {
    title, setTitle,
    description, setDescription,
    location, setLocation,
    allDay, setAllDay,
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
