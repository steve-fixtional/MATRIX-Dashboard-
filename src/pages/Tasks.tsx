import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Task, TaskPriority } from '../domain/types';
import { getTasks, saveTask, deleteTask } from '../services/taskService';
import { crossTabSync } from '../services/crossTabSync';
import { ListTodo, Plus, Inbox, Calendar, CheckCircle2 } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { TaskItem } from './tasks/TaskItem';
import { TaskCreator } from './tasks/TaskCreator';
import { isToday, isPast } from 'date-fns';

type FilterType = 'today' | 'upcoming' | 'completed' | 'all';

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('today');
  const [isCreatingFocus, setIsCreatingFocus] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const loadedTasks = await getTasks();
    setTasks(loadedTasks);
  }, []);

  useEffect(() => {
    loadTasks();
    const unsubscribe = crossTabSync.onDataChange((event) => {
      if (event.storeName === 'tasks') {
        loadTasks();
      }
    });
    return () => unsubscribe();
  }, [loadTasks]);

  // Check URL params for "new" trigger or "id" selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('projectId');
    if (pid) setProjectId(pid);

    if (params.get('new') === 'true') {
      setIsCreatingFocus(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('id')) {
      setActiveFilter('all');
      // We could add logic to scroll to it, but ensuring it's visible is a good start
    }
  }, []);

  const handleCreateTask = async (title: string, priority: TaskPriority, dueDate: number | null, reminders: number[] = []) => {
    // Determine due date based on active filter if not provided
    let finalDueDate = dueDate;
    if (!finalDueDate && activeFilter === 'today') {
      finalDueDate = Date.now();
    }

    const newTask = await saveTask({
      title,
      notes: '',
      completed: false,
      priority,
      dueDate: finalDueDate,
      tags: [],
      reminders,
      projectId
    });
    setTasks(prev => [newTask, ...prev]);
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    const currentTask = tasks.find(t => t.id === id);
    if (!currentTask) return;
    
    // Optimistic update
    const updatedTask = { ...currentTask, ...updates, updatedAt: Date.now() };
    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));

    await saveTask({ ...currentTask, ...updates });
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await deleteTask(id);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (activeFilter === 'completed') return task.completed;
      if (task.completed) return false; // Hide completed in other views

      const date = task.dueDate ? new Date(task.dueDate) : null;
      
      switch (activeFilter) {
        case 'today':
          // Include tasks due today, overdue tasks, or tasks with no due date (inbox behavior)
          if (!date) return true;
          return isToday(date) || isPast(date);
        case 'upcoming':
          if (!date) return false;
          return !isToday(date) && !isPast(date);
        case 'all':
          return true;
        default:
          return true;
      }
    }).sort((a, b) => {
      // Sort priority high -> none
      const pMap = { high: 3, medium: 2, low: 1, none: 0 };
      if (pMap[a.priority] !== pMap[b.priority]) {
        return pMap[b.priority] - pMap[a.priority];
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [tasks, activeFilter]);

  return (
    <PageWrapper className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <Button variant="secondary" size="sm" onClick={() => setIsCreatingFocus(true)}>
           <Plus className="h-4 w-4 mr-2" /> Add task
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        {/* Sidebar Filters */}
        <div className="w-full md:w-48 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          <Button 
            variant={activeFilter === 'today' ? 'secondary' : 'ghost'} 
            className="justify-start shrink-0 h-9"
            onClick={() => setActiveFilter('today')}
          >
            <Inbox className="h-4 w-4 mr-2" /> Today
          </Button>
          <Button 
            variant={activeFilter === 'upcoming' ? 'secondary' : 'ghost'} 
            className="justify-start shrink-0 h-9"
            onClick={() => setActiveFilter('upcoming')}
          >
            <Calendar className="h-4 w-4 mr-2" /> Upcoming
          </Button>
          <Button 
            variant={activeFilter === 'all' ? 'secondary' : 'ghost'} 
            className="justify-start shrink-0 h-9"
            onClick={() => setActiveFilter('all')}
          >
            <ListTodo className="h-4 w-4 mr-2" /> All Active
          </Button>
          <Button 
            variant={activeFilter === 'completed' ? 'secondary' : 'ghost'} 
            className="justify-start shrink-0 h-9"
            onClick={() => setActiveFilter('completed')}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> Completed
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full max-w-3xl space-y-6">
          {activeFilter !== 'completed' && (
            <TaskCreator 
              onSave={handleCreateTask} 
              autoFocus={isCreatingFocus} 
            />
          )}

          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3 px-1">
              {activeFilter === 'today' && 'Today & Overdue'}
              {activeFilter === 'upcoming' && 'Upcoming'}
              {activeFilter === 'all' && 'All Active Tasks'}
              {activeFilter === 'completed' && 'Completed'}
            </h2>
            
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
              {filteredTasks.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-4">
                    {activeFilter === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : <ListTodo className="h-6 w-6" />}
                  </div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                    {activeFilter === 'completed' ? 'No completed tasks' : 'Your Task List'}
                  </h3>
                  <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                    {activeFilter === 'completed' 
                      ? "You haven't completed any tasks yet." 
                      : activeFilter === 'today' 
                      ? "Focus on what matters today. Add your first task above." 
                      : "Tasks created here live securely on your device."}
                  </p>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onUpdate={handleUpdateTask} 
                    onDelete={handleDeleteTask} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
