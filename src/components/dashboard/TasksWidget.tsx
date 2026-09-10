import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ListTodo, Square, CheckSquare } from 'lucide-react';
import { getTasks, saveTask } from '../../services/taskService';
import { Task } from '../../domain/types';
import { isToday, isPast } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function TasksWidget() {
  const navigate = useNavigate();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);

  const loadTasks = useCallback(async () => {
    const allTasks = await getTasks();
    const activeToday = allTasks.filter(task => {
      if (task.completed) return false;
      const date = task.dueDate ? new Date(task.dueDate) : null;
      if (!date) return true; // Inbox/undated tasks show in Today
      return isToday(date) || isPast(date);
    });
    setTodayTasks(activeToday.slice(0, 5));
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggleTask = async (task: Task) => {
    // Optimistic update
    setTodayTasks(prev => prev.filter(t => t.id !== task.id));
    await saveTask({ ...task, completed: true });
  };

  return (
    <Card 
      className="h-full shadow-sm flex flex-col cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors" 
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) {
          navigate('/tasks');
        }
      }}
    >
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2 m-0">
          <ListTodo className="h-4 w-4" /> Today's Focus
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-1 pb-4">
        {todayTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm font-medium">
            All caught up.
          </div>
        ) : (
          <div className="space-y-1">
            {todayTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2 border-b last:border-0 border-neutral-100 dark:border-neutral-800">
                <button 
                  onClick={() => handleToggleTask(task)}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors focus:outline-none rounded-sm shrink-0"
                >
                  <Square className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
