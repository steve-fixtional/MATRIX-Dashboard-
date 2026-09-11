import { useState, useEffect, useCallback, useRef } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { CalendarEvent } from '../domain/types';
import { getEvents, saveEvent, deleteEvent } from '../services/calendarService';
import { initGoogleCalendarAuth } from '../services/googleCalendarService';
import { AgendaView } from './calendar/AgendaView';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { DayView } from './calendar/DayView';
import { EventCreator } from './calendar/EventCreator';
import { CalendarSettings } from './calendar/CalendarSettings';
import { CalendarHeader } from './calendar/CalendarHeader';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlignJustify, Settings } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, endOfDay } from 'date-fns';
import { getAppSettings } from '../services/settingsService';

type ViewMode = 'agenda' | 'day' | 'week' | 'month';

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Default to agenda on small screens
  const [viewMode, setViewMode] = useState<ViewMode>(window.innerWidth < 768 ? 'agenda' : 'month');
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [projectId, setProjectId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track the currently loaded range to prevent duplicate loading if the date hasn't moved outside the buffer
  const loadedRange = useRef<{start: number, end: number} | null>(null);

  useEffect(() => {
    // Load default view mode from settings
    getAppSettings().then(settings => {
      if (window.innerWidth >= 768 && settings.calendarDefaultView) {
        setViewMode(settings.calendarDefaultView);
      }
    });
  }, []);

  const loadEvents = useCallback(async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Initialize Google Calendar auth when calendar is loaded
      await initGoogleCalendarAuth().catch(console.error);

      let start: number;
      let end: number;

      switch (viewMode) {
        case 'month':
        case 'agenda':
          start = startOfMonth(subMonths(currentDate, 1)).getTime();
          end = endOfMonth(addMonths(currentDate, 1)).getTime();
          break;
        case 'week':
          start = startOfWeek(subWeeks(currentDate, 1)).getTime();
          end = endOfWeek(addWeeks(currentDate, 1)).getTime();
          break;
        case 'day':
          start = startOfDay(subDays(currentDate, 1)).getTime();
          end = endOfDay(addDays(currentDate, 1)).getTime();
          break;
      }

      if (loadedRange.current && loadedRange.current.start === start && loadedRange.current.end === end) {
        setLoading(false);
        return;
      }

      const loadedEvents = await getEvents(start, end);
      setEvents(loadedEvents);
      loadedRange.current = { start, end };
    } catch (err) {
      console.error(err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Check URL params for "new" trigger or "id" selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('projectId');
    if (pid) setProjectId(pid);

    if (params.get('new') === 'true') {
      setIsCreating(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const id = params.get('id');
      if (id && events.length > 0) {
        const found = events.find(e => e.id === id);
        if (found) {
          setSelectedEvent(found);
          setIsCreating(true);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [events]);

  const handlePrev = () => {
    switch (viewMode) {
      case 'month': setCurrentDate(subMonths(currentDate, 1)); break;
      case 'week': setCurrentDate(subWeeks(currentDate, 1)); break;
      case 'day': setCurrentDate(subDays(currentDate, 1)); break;
      case 'agenda': setCurrentDate(subMonths(currentDate, 1)); break; // Agenda jump by month
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'month': setCurrentDate(addMonths(currentDate, 1)); break;
      case 'week': setCurrentDate(addWeeks(currentDate, 1)); break;
      case 'day': setCurrentDate(addDays(currentDate, 1)); break;
      case 'agenda': setCurrentDate(addMonths(currentDate, 1)); break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleChangeDate = (date: Date) => {
    setCurrentDate(date);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    // Inject projectId if this is a new event being created
    if (!eventData.id || eventData.id.startsWith('gcal-')) {
      if (projectId && !eventData.projectId) {
        eventData.projectId = projectId;
      }
    }

    const newEvent = await saveEvent(eventData as any);
    
    // Optimistic update
    if (selectedEvent) {
      setEvents(prev => prev.map(e => e.id === newEvent.id ? newEvent : e));
    } else {
      setEvents(prev => [...prev, newEvent]);
    }

    setIsCreating(false);
    setSelectedEvent(undefined);
    setSelectedDate(undefined);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsCreating(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsCreating(true);
  };

  const handleDeleteEvent = async (id: string) => {
    const eventToDelete = events.find(e => e.id === id);
    if (!eventToDelete) return;
    
    setEvents(prev => prev.filter(e => e.id !== id));
    await deleteEvent(eventToDelete);
    setIsCreating(false);
    setSelectedEvent(undefined);
  };

  return (
    <PageWrapper className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <CalendarHeader 
          currentDate={currentDate}
          viewMode={viewMode}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onChangeDate={handleChangeDate}
        />
        
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center shrink-0"
              title="Calendar Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg shrink-0">
            <button 
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-colors whitespace-nowrap ${viewMode === 'agenda' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              <AlignJustify className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Agenda</span>
            </button>
            <button 
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-colors whitespace-nowrap ${viewMode === 'day' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Day
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`flex px-3 py-1.5 text-xs font-medium rounded-md items-center gap-2 transition-colors whitespace-nowrap ${viewMode === 'week' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Week
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`flex px-3 py-1.5 text-xs font-medium rounded-md items-center gap-2 transition-colors whitespace-nowrap ${viewMode === 'month' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Month
            </button>
          </div>
          <Button size="sm" onClick={() => setIsCreating(true)} className="shrink-0 ml-auto sm:ml-2"> 
             <Plus className="h-4 w-4 mr-1.5" /> Event
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-neutral-900/50 flex items-center justify-center z-10">
            <div className="text-neutral-500 font-medium animate-pulse">Loading events...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-x-4 top-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center font-medium z-10 border border-red-200 dark:border-red-800/50">
            {error}
          </div>
        )}
        {viewMode === 'agenda' && <AgendaView events={events.filter(e => e.endTime >= startOfDay(new Date()).getTime())} onEventClick={handleEventClick} />}
        {viewMode === 'month' && <MonthView currentDate={currentDate} events={events} onEventClick={handleEventClick} onDateClick={handleDateClick} />}
        {viewMode === 'week' && <WeekView currentDate={currentDate} events={events} onEventClick={handleEventClick} onDateClick={handleDateClick} />}
        {viewMode === 'day' && <DayView currentDate={currentDate} events={events} onEventClick={handleEventClick} onDateClick={handleDateClick} />}
      </div>

      {isCreating && (
        <EventCreator 
          initialDate={selectedDate}
          eventToEdit={selectedEvent}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onCancel={() => { setIsCreating(false); setSelectedEvent(undefined); setSelectedDate(undefined); }}
        />
      )}
      {isSettingsOpen && (
        <CalendarSettings 
          onClose={() => setIsSettingsOpen(false)} 
          onSettingsChanged={loadEvents} 
        />
      )}
    </PageWrapper>
  );
}
