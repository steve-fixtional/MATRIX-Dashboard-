import { useState, useRef, useEffect } from 'react';
import { format, setMonth, setYear } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: 'agenda' | 'day' | 'week' | 'month';
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeDate: (date: Date) => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onChangeDate,
}: CalendarHeaderProps) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorYear, setSelectorYear] = useState(currentDate.getFullYear());
  const selectorRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    };
    if (isSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelectorOpen]);

  // Sync selector year with current date when opening
  useEffect(() => {
    if (isSelectorOpen) {
      setSelectorYear(currentDate.getFullYear());
    }
  }, [isSelectorOpen, currentDate]);

  const months = [
    'January', 'February', 'March',
    'April', 'May', 'June',
    'July', 'August', 'September',
    'October', 'November', 'December'
  ];

  const handleMonthSelect = (monthIndex: number) => {
    let newDate = setMonth(currentDate, monthIndex);
    newDate = setYear(newDate, selectorYear);
    onChangeDate(newDate);
    setIsSelectorOpen(false);
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
    <div className="flex items-center gap-2 sm:gap-4">
      <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 shrink-0">
        <button
          onClick={onPrev}
          aria-label="Previous period"
          className="p-1.5 hover:bg-white dark:hover:bg-neutral-700 rounded-md text-neutral-600 dark:text-neutral-300 shadow-sm transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="relative" ref={selectorRef}>
          <button
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            aria-label="Open month and year selector"
            className="px-3 sm:px-4 py-1.5 text-base sm:text-lg font-semibold tracking-tight hover:bg-white dark:hover:bg-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 transition-colors flex items-center gap-1.5 min-w-[140px] justify-center"
          >
            {renderHeaderDate()}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>

          {isSelectorOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectorYear(y => y - 1)}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectorYear}
                </span>
                <button
                  onClick={() => setSelectorYear(y => y + 1)}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {months.map((month, idx) => {
                  const isCurrentMonth = currentDate.getMonth() === idx && currentDate.getFullYear() === selectorYear;
                  return (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(idx)}
                      className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                        isCurrentMonth
                          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {month.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onNext}
          aria-label="Next period"
          className="p-1.5 hover:bg-white dark:hover:bg-neutral-700 rounded-md text-neutral-600 dark:text-neutral-300 shadow-sm transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={onToday}
        aria-label="Go to today"
        className="px-3 py-1.5 text-sm font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300 transition-colors"
      >
        Today
      </button>
    </div>
  );
}
