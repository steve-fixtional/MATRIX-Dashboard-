import { CalendarEvent } from '../../domain/types';
import { format, isSameDay } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export function DayView({ currentDate, events, onEventClick, onDateClick }: DayViewProps) {
  const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), currentDate)).sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[500px]" onClick={() => onDateClick(currentDate)}>
      <div className="py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-center">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {dayEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
            No events scheduled for this day.
          </div>
        ) : (
          dayEvents.map(event => (
            <div 
              key={event.id}
              onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
              className={`p-4 rounded-xl cursor-pointer transition-colors border ${event.provider === 'google' ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border-blue-800 text-blue-900 dark:text-blue-100' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{event.title}</h3>
                <div className="text-xs font-medium uppercase tracking-wider opacity-60">
                  {event.provider}
                </div>
              </div>
              
              <div className="space-y-1.5 text-sm opacity-80">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {event.allDay ? 'All Day' : `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
              
              {event.description && (
                <div className="mt-3 text-sm opacity-80 border-t border-black/10 dark:border-white/10 pt-3">
                  {event.description}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
