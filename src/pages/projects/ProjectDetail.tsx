import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Project, Note, Task, CalendarEvent, ClipboardItem } from '../../domain/types';
import { getProject, saveProject, deleteProject, getProjectNotes, getProjectTasks, getProjectEvents, getProjectFiles } from '../../services/projectService';
import { FileAttachments } from '../../components/ui/FileAttachments';
import { ItemSyncStatus } from '../../components/ui/ItemSyncStatus';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Edit3, Trash2, CheckCircle2, Archive, FolderKanban, FileText, CheckSquare, Calendar as CalendarIcon, HardDrive, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '../../components/ui/EmptyState';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Related items
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    const p = await getProject(projectId);
    if (!p) {
      navigate('/projects');
      return;
    }
    setProject(p);
    
    // In parallel load related items
    const [n, t, e, f] = await Promise.all([
      getProjectNotes(projectId),
      getProjectTasks(projectId),
      getProjectEvents(projectId),
      getProjectFiles(projectId) // which currently returns ClipboardItems
    ]);
    
    setNotes(n);
    setTasks(t);
    setEvents(e);
    setClipboardItems(f);
    
    if (p.name === 'New Project' && !p.description) {
      setIsEditing(true);
    }
    
    setLoading(false);
  };

  const handleSave = async (updates: Partial<Project>) => {
    if (!project) return;
    const updated = await saveProject({ ...project, ...updates });
    setProject(updated);
  };

  const handleDelete = async () => {
    if (!project) return;
    const confirm = window.confirm('Are you sure you want to delete this project? Related items will lose their project association but will not be deleted.');
    if (confirm) {
      await deleteProject(project.id);
      navigate('/projects');
    }
  };

  if (loading || !project) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <span className="text-neutral-400 font-medium animate-pulse">Loading project...</span>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex flex-col h-full max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between p-4 sm:p-6 shrink-0 border-b border-neutral-100 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/projects')}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          {isEditing ? (
            <input
              autoFocus
              className="text-xl font-bold tracking-tight bg-transparent border-none focus:ring-0 p-0 text-neutral-900 dark:text-neutral-100 w-full max-w-xs"
              value={project.name}
              onChange={e => handleSave({ name: e.target.value })}
              onBlur={() => setIsEditing(false)}
              onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
            />
          ) : (
            <div className="flex flex-col gap-1">
              <h1 
                onClick={() => setIsEditing(true)}
                className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 cursor-text hover:text-amber-600 transition-colors"
              >
                {project.name}
              </h1>
              <ItemSyncStatus item={project} />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={project.status}
            onChange={e => handleSave({ status: e.target.value as any })}
            className="text-xs font-medium bg-neutral-100 dark:bg-neutral-800 border-none rounded-md py-1.5 pl-3 pr-8 text-neutral-700 dark:text-neutral-300 focus:ring-0 cursor-pointer"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <button onClick={() => setIsEditing(!isEditing)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500">
            <Edit3 className="h-4 w-4" />
          </button>
          <button onClick={handleDelete} className="p-1.5 hover:bg-red-50 text-neutral-500 hover:text-red-500 rounded-md transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-8">
          <section className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Overview</h2>
            {isEditing ? (
              <textarea
                className="w-full text-sm bg-transparent border-none focus:ring-0 p-0 text-neutral-700 dark:text-neutral-300 resize-none min-h-[100px]"
                value={project.description}
                onChange={e => handleSave({ description: e.target.value })}
                placeholder="Add a project description..."
              />
            ) : (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {project.description || <span className="text-neutral-400 italic">No description provided. Click the edit icon to add one.</span>}
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/50 flex text-xs text-neutral-400 gap-4">
              <span>Created {formatDistanceToNow(project.createdAt)} ago</span>
              <span>Updated {formatDistanceToNow(project.updatedAt)} ago</span>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* TASKS */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-neutral-500" /> Tasks
                </h2>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/tasks?projectId=${project.id}&new=true`)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {tasks.length === 0 ? (
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-2">No tasks assigned to this project.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {tasks.map(task => (
                    <div key={task.id} className="p-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/tasks?id=${task.id}`)}>
                      <div className="mt-0.5 shrink-0">
                        {task.completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <div className="h-4 w-4 rounded border-2 border-neutral-300 dark:border-neutral-600" />}
                      </div>
                      <span className={`text-sm ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-700 dark:text-neutral-200'} line-clamp-1`}>{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* NOTES */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-neutral-500" /> Notes
                </h2>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/notes?projectId=${project.id}&new=true`)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {notes.length === 0 ? (
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-2">No notes assigned to this project.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {notes.map(note => (
                    <div key={note.id} className="bg-white dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 transition-colors cursor-pointer" onClick={() => navigate(`/notes?id=${note.id}`)}>
                      <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1 truncate">{note.title || 'Untitled'}</h3>
                      <p className="text-xs text-neutral-500 line-clamp-2">{note.content.substring(0, 100) || 'No content'}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* CALENDAR */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-neutral-500" /> Events
                </h2>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/calendar?projectId=${project.id}&new=true`)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {events.length === 0 ? (
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-2">No events assigned to this project.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {events.map(event => (
                    <div key={event.id} className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/calendar?id=${event.id}`)}>
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate mb-1">{event.title}</div>
                      <div className="text-xs text-neutral-500">
                        {new Date(event.startTime).toLocaleDateString()} {event.allDay ? 'All Day' : new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* FILES / CLIPBOARD */}
            <section className="space-y-6">
              <div>
                <FileAttachments entityId={project.id} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-neutral-500" /> Clipboard Snippets
                  </h2>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/clipboard?projectId=${project.id}&new=true`)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {clipboardItems.length === 0 ? (
                  <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800">
                    <p className="text-xs text-neutral-500 mb-2">No snippets assigned to this project.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {clipboardItems.map(file => (
                      <div key={file.id} className="bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 transition-colors cursor-pointer flex gap-3 items-start" onClick={() => navigate(`/clipboard?id=${file.id}`)}>
                        <div className="shrink-0 mt-1">
                          <HardDrive className="h-4 w-4 text-neutral-400" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 mb-1 uppercase tracking-wider">{file.contentType}</div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-300 truncate">{file.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
