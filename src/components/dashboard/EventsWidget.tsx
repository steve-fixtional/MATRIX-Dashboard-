import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { getEvents } from '../../services/calendarService';
import { CalendarEvent } from '../../domain/types';
import { isToday, format, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function EventsWidget() {
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

  const loadEvents = useCallback(async () => {
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + 7);
    
    const events = await getEvents(startOfDay(now).getTime(), futureLimit.getTime());
    const upNext = events.filter(e => e.endTime > now.getTime()).slice(0, 4);
    setUpcomingEvents(upNext);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <Card 
      className="h-full shadow-sm flex flex-col cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors" 
      onClick={() => navigate('/calendar')}
    >
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2 m-0">
          <CalendarIcon className="h-4 w-4" /> Up Next
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-1 pb-4">
        {upcomingEvents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm font-medium">
            No upcoming events.
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map(event => (
              <div key={event.id} className="group relative flex flex-col p-2 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${event.provider === 'google' ? 'bg-blue-500' : 'bg-neutral-800 dark:bg-neutral-400'}`} />
                <div className="ml-2">
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {event.title}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500 font-medium">
                    {isToday(new Date(event.startTime)) ? 'Today' : format(event.startTime, 'MMM d')}
                    {!event.allDay && (
                      <>
                        <span className="mx-1">•</span>
                        <Clock className="h-3 w-3" />
                        {format(event.startTime, 'h:mm a')}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
