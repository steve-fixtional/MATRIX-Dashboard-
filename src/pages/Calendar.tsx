import { useState, useEffect, useCallback } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { CalendarEvent } from '../domain/types';
import { getEvents, saveEvent, deleteEvent } from '../services/calendarService';
import { AgendaView } from './calendar/AgendaView';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { DayView } from './calendar/DayView';
import { EventCreator } from './calendar/EventCreator';
import { CalendarSettings } from './calendar/CalendarSettings';
import { Button } from '../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlignJustify, Settings } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay } from 'date-fns';

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

  const loadEvents = useCallback(async () => {
    // Load a wide range of events for simplicity right now
    const start = new Date(currentDate.getFullYear() - 1, 0, 1).getTime();
    const end = new Date(currentDate.getFullYear() + 1, 11, 31).getTime();
    
    const loadedEvents = await getEvents(start, end);
    setEvents(loadedEvents);
  }, [currentDate]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Check URL params for "new" trigger or "id" selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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

  // Handle responsive resize view mode change
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode !== 'agenda' && viewMode !== 'day') {
        setViewMode('agenda');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

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

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
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

  const renderHeaderDate = () => {
    switch (viewMode) {
      case 'month': return format(currentDate, 'MMMM yyyy');
      case 'week': return `${format(currentDate, 'MMM')} ${currentDate.getFullYear()}`;
      case 'day': return format(currentDate, 'MMMM d, yyyy');
      case 'agenda': return 'Upcoming';
    }
  };

  return (
    <PageWrapper className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight w-48 truncate">{renderHeaderDate()}</h1>
          
          <div className="hidden sm:flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-md p-1">
            <button onClick={handlePrev} className="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300 shadow-sm"><ChevronLeft className="h-4 w-4"/></button>
            <button onClick={handleToday} className="px-3 py-1 text-sm font-medium hover:bg-white dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300">Today</button>
            <button onClick={handleNext} className="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300 shadow-sm"><ChevronRight className="h-4 w-4"/></button>
          </div>
        </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors hidden sm:flex items-center"
              title="Calendar Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg shrink-0">
            <button 
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-colors ${viewMode === 'agenda' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              <AlignJustify className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Agenda</span>
            </button>
            <button 
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-colors ${viewMode === 'day' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Day
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`hidden md:flex px-3 py-1.5 text-xs font-medium rounded-md items-center gap-2 transition-colors ${viewMode === 'week' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Week
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`hidden md:flex px-3 py-1.5 text-xs font-medium rounded-md items-center gap-2 transition-colors ${viewMode === 'month' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Month
            </button>
          </div>

          <Button size="sm" onClick={() => setIsCreating(true)} className="shrink-0 ml-auto sm:ml-2">
             <Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">New Event</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
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
