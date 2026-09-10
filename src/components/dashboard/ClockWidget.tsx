import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-1 p-2">
      <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-900 dark:text-white">
        {format(time, 'h:mm a')}
      </h1>
      <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 font-medium">
        {format(time, 'EEEE, MMMM d, yyyy')}
      </p>
    </div>
  );
}
