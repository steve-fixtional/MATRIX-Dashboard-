import React, { useState, useRef, useEffect } from 'react';
import { TaskPriority } from '../../domain/types';
import { Plus, Flag, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface TaskCreatorProps {
  onSave: (title: string, priority: TaskPriority, dueDate: number | null) => void;
  autoFocus?: boolean;
}

export function TaskCreator({ onSave, autoFocus = false }: TaskCreatorProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), priority, null); // Simplified due date for inline creator
    setTitle('');
    setPriority('none');
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
        <div className="flex items-center justify-between p-2 px-3 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cyclePriority}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${getPriorityColor(priority)}`}
            >
              <Flag className="h-3.5 w-3.5" />
              {priority === 'none' ? 'Priority' : priority.charAt(0).toUpperCase() + priority.slice(1)}
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Today
            </button>
          </div>
          <Button 
            type="submit" 
            size="sm" 
            disabled={!title.trim()}
            className="h-8 text-xs px-4"
          >
            Add
          </Button>
        </div>
      )}
    </form>
  );
}
