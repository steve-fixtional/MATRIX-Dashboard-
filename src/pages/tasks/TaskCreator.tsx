import React, { useState, useRef, useEffect } from 'react';
import { TaskPriority } from '../../domain/types';
import { Plus, Flag, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface TaskCreatorProps {
  onSave: (title: string, priority: TaskPriority, dueDate: number | null, reminders: number[]) => void;
  autoFocus?: boolean;
}

export function TaskCreator({ onSave, autoFocus = false }: TaskCreatorProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [showOptions, setShowOptions] = useState(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [reminders, setReminders] = useState<number[]>([0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;
    
    let parsedDate = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (dueTime) {
        const [h, m] = dueTime.split(':').map(Number);
        d.setHours(h, m, 0, 0);
      }
      parsedDate = d.getTime();
    }
    
    // Pass reminders via event or modify the signature
    // Since onSave expects (title, priority, dueDate), let's adjust it
    // Or we can just call it if onSave supports it. Wait, we need to update Tasks.tsx handleCreateTask signature.
    // I will call onSave with 4 arguments.
    (onSave as any)(title.trim(), priority, parsedDate, reminders);
    setTitle('');
    setPriority('none');
    setDueDate('');
    setDueTime('');
    setReminders([0]);
    setShowOptions(false);
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-950/30';
      case 'medium': return 'text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30';
      case 'low': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/30';
      default: return 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800';
    }
  };

  const cyclePriority = () => {
    const priorities: TaskPriority[] = ['none', 'low', 'medium', 'high'];
    const idx = priorities.indexOf(priority);
    setPriority(priorities[(idx + 1) % priorities.length]);
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-neutral-200 dark:focus-within:ring-neutral-700 transition-all"
    >
      <div className="flex items-center p-3 sm:p-4 border-b border-transparent focus-within:border-neutral-100 dark:focus-within:border-neutral-800/50">
        <Plus className="h-5 w-5 text-neutral-400 mr-3 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setShowOptions(true)}
          placeholder="Add a new task..."
          className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm md:text-base outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
        />
        {title && (
          <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={() => setTitle('')}>
            <X className="h-4 w-4 text-neutral-400" />
          </Button>
        )}
      </div>

      {showOptions && (
        <div className="flex flex-col gap-2 p-2 px-3 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800/50">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={cyclePriority}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${getPriorityColor(priority)}`}
            >
              <Flag className="h-3.5 w-3.5" />
              {priority === 'none' ? 'Priority' : priority.charAt(0).toUpperCase() + priority.slice(1)}
            </button>
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5 text-neutral-500" />
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-md text-xs px-1.5 py-1"
              />
            </div>
            {dueDate && (
              <div className="flex items-center gap-1">
                <input 
                  type="time" 
                  value={dueTime} 
                  onChange={(e) => setDueTime(e.target.value)} 
                  className="bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-md text-xs px-1.5 py-1"
                />
              </div>
            )}
            {dueDate && (
              <select
                value={reminders.length > 0 ? reminders[0] : -1}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (val === -1) {
                    setReminders([]);
                  } else {
                    setReminders([val]);
                  }
                }}
                className="bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-md text-xs px-1.5 py-1 max-w-[120px]"
              >
                <option value="-1">No reminder</option>
                <option value="0">At due time</option>
                <option value="5">5 mins before</option>
                <option value="15">15 mins before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
            )}
          </div>
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="sm" 
              disabled={!title.trim()}
              className="h-8 text-xs px-4"
            >
              Add Task
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
