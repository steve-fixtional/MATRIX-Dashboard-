import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskPriority } from '../../domain/types';
import { CheckSquare, Square, Calendar, Flag, MoreVertical, Trash2 } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isThisYear } from 'date-fns';

interface TaskItemProps {
  key?: React.Key | string | number;
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (localTitle.trim() !== task.title) {
      if (localTitle.trim()) {
        onUpdate(task.id, { title: localTitle.trim() });
      } else {
        setLocalTitle(task.title);
      }
    }
    setIsEditing(false);
  };

  const toggleCompleted = () => onUpdate(task.id, { completed: !task.completed });

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-neutral-400';
    }
  };

  const renderDueDate = () => {
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
    let label = '';
    let colorClass = 'text-neutral-500';

    if (isToday(date)) {
      label = 'Today';
      colorClass = 'text-green-600 dark:text-green-500 font-medium';
    } else if (isTomorrow(date)) {
      label = 'Tomorrow';
    } else if (isPast(date) && !isToday(date)) {
      label = format(date, 'MMM d');
      colorClass = 'text-red-500 font-medium';
    } else if (isThisYear(date)) {
      label = format(date, 'MMM d');
    } else {
      label = format(date, 'MMM d, yyyy');
    }

    return (
      <span className={`flex items-center gap-1 text-[11px] ${colorClass}`}>
        <Calendar className="h-3 w-3" />
        {label}
      </span>
    );
  };

  return (
    <div className={`group flex items-start gap-3 p-3 sm:p-4 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors ${task.completed ? 'opacity-60' : ''}`}>
      <button 
        onClick={toggleCompleted}
        className="mt-0.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 rounded-sm shrink-0"
      >
        {task.completed ? <CheckSquare className="h-5 w-5 text-neutral-900 dark:text-neutral-100" /> : <Square className="h-5 w-5" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setLocalTitle(task.title);
                setIsEditing(false);
              }
            }}
            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium outline-none text-neutral-900 dark:text-neutral-100"
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className={`text-sm font-medium truncate cursor-pointer ${task.completed ? 'line-through text-neutral-500' : 'text-neutral-900 dark:text-neutral-100'}`}
          >
            {task.title}
          </div>
        )}
        
        {(task.dueDate || task.notes || task.priority !== 'none') && (
          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 flex-wrap">
            {renderDueDate()}
            
            {task.priority !== 'none' && (
              <span className={`flex items-center gap-1 text-[11px] font-medium ${getPriorityColor(task.priority)}`}>
                <Flag className="h-3 w-3" />
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
            )}
            
            {task.notes && (
              <span className="truncate max-w-[200px] text-neutral-400">
                {task.notes}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onDelete(task.id)}
          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
