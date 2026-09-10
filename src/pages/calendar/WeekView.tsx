import { CalendarEvent } from '../../domain/types';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday } from 'date-fns';
import { Clock } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export function WeekView({ currentDate, events, onEventClick, onDateClick }: WeekViewProps) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (date: Date) => {
    return events.filter(e => isSameDay(new Date(e.startTime), date)).sort((a, b) => a.startTime - b.startTime);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
      <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        {days.map(day => (
          <div key={day.toISOString()} className="py-3 text-center border-r last:border-0 border-neutral-200 dark:border-neutral-800">
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{format(day, 'EEE')}</div>
            <div className={`mt-1 text-lg font-medium w-8 h-8 mx-auto flex items-center justify-center rounded-full ${isToday(day) ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-900 dark:text-neutral-100'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex-1 grid grid-cols-7 overflow-y-auto relative">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          return (
            <div 
              key={day.toISOString()} 
              className="border-r last:border-0 border-neutral-100 dark:border-neutral-800/50 p-2 space-y-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/20"
              onClick={() => onDateClick(day)}
            >
              {dayEvents.map(event => (
                <div 
                  key={event.id}
                  onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                  className={`text-xs p-2 rounded-md font-medium cursor-pointer transition-colors ${event.provider === 'google' ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-300' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200'}`}
                >
                  <div className="font-semibold truncate mb-1">{event.title}</div>
                  {!event.allDay && (
                    <div className="flex items-center gap-1 opacity-70 text-[10px]">
                      <Clock className="h-3 w-3" />
                      {format(event.startTime, 'h:mm')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
