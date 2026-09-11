import { CalendarEvent } from '../../domain/types';
import { format, isSameDay, isToday, isTomorrow, isPast, isThisYear, startOfDay } from 'date-fns';
import { Clock, MapPin, Calendar as CalendarIcon, AlignLeft } from 'lucide-react';

interface AgendaViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function AgendaView({ events, onEventClick }: AgendaViewProps) {
  // Group events by day
  const groupedEvents = events.reduce((acc, event) => {
    const dayStart = startOfDay(event.startTime).getTime();
    if (!acc[dayStart]) {
      acc[dayStart] = [];
    }
    acc[dayStart].push(event);
    return acc;
  }, {} as Record<number, CalendarEvent[]>);

  const sortedDays = Object.keys(groupedEvents).map(Number).sort((a, b) => a - b);

  if (events.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
          <CalendarIcon className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">Your Schedule</h3>
        <p className="text-sm text-neutral-500 max-w-sm mb-4">
          Events created here are stored offline. You can also connect a cloud calendar in the settings.
        </p>
      </div>
    );
  }

  const renderDateHeader = (timestamp: number) => {
    const date = new Date(timestamp);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisYear(date)) return format(date, 'EEEE, MMMM d');
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const renderTime = (event: CalendarEvent) => {
    if (event.allDay) return 'All Day';
    return `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`;
  };

  return (
    <div className="space-y-8 pb-12">
      {sortedDays.map(dayTimestamp => {
        const dayEvents = groupedEvents[dayTimestamp].sort((a, b) => a.startTime - b.startTime);
        
        return (
          <div key={dayTimestamp}>
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md py-2 border-b border-neutral-100 dark:border-neutral-800 mb-3">
              <h2 className={`text-sm font-semibold tracking-wide uppercase ${isToday(new Date(dayTimestamp)) ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}>
                {renderDateHeader(dayTimestamp)}
              </h2>
            </div>
            
            <div className="space-y-3">
              {dayEvents.map(event => (
                <div 
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="group flex flex-col p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all cursor-pointer relative overflow-hidden"
                >
                  {/* Left accent color based on provider */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${event.provider === 'google' ? 'bg-blue-500' : 'bg-neutral-800 dark:bg-neutral-400'}`} />
                  
                  <div className="flex justify-between items-start gap-4 ml-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{event.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{renderTime(event)}</span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.description && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1.5 truncate">
                          <AlignLeft className="h-3 w-3 shrink-0" />
                          <span className="truncate">{event.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
