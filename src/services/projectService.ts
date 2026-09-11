import { Project, Note, Task, CalendarEvent, ClipboardItem } from '../domain/types';
import { requestSync } from './sync';
import { Repository } from './repository';
import { getNotes } from './noteService';
import { getTasks } from './taskService';
import { getEvents } from './calendarService';
import { getClipboardItems } from './clipboardService';

const projectRepository = new Repository('projects');

export async function getProjects(includeDeleted = false): Promise<Project[]> {
  return projectRepository.list(includeDeleted);
}

export async function getProject(id: string): Promise<Project | undefined> {
  return projectRepository.read(id);
}

export async function saveProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt' | 'syncStatus' | 'syncError'> & { id?: string }): Promise<Project> {
  let savedProject: Project;
  if (project.id) {
    const existing = await projectRepository.read(project.id);
    if (existing) {
      savedProject = await projectRepository.update(project.id, project);
    } else {
      savedProject = await projectRepository.create(project);
    }
  } else {
    savedProject = await projectRepository.create(project);
  }
  
  requestSync();
  return savedProject;
}

export async function deleteProject(id: string): Promise<void> {
  // Fix orphaned records by removing projectId from related items
  const relatedTasks = await tasksRepo.queryByProjectId(id);
  for (const task of relatedTasks) {
    await tasksRepo.update(task.id, { ...task, projectId: null });
  }

  const relatedNotes = await notesRepo.queryByProjectId(id);
  for (const note of relatedNotes) {
    await notesRepo.update(note.id, { ...note, projectId: null });
  }

  const relatedEvents = await eventsRepo.queryByProjectId(id);
  for (const event of relatedEvents) {
    await eventsRepo.update(event.id, { ...event, projectId: null });
  }

  const relatedFiles = await clipboardRepo.queryByProjectId(id);
  for (const file of relatedFiles) {
    await clipboardRepo.update(file.id, { ...file, projectId: null });
  }

  await projectRepository.delete(id);
  requestSync();
}

// Helpers to get related items
const notesRepo = new Repository('notes');
const tasksRepo = new Repository('tasks');
const eventsRepo = new Repository('events');
const clipboardRepo = new Repository('clipboard');

export async function getProjectNotes(projectId: string): Promise<Note[]> {
  return notesRepo.queryByProjectId(projectId);
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  return tasksRepo.queryByProjectId(projectId);
}

export async function getProjectEvents(projectId: string): Promise<CalendarEvent[]> {
  return eventsRepo.queryByProjectId(projectId);
}

export async function getProjectFiles(projectId: string): Promise<ClipboardItem[]> {
  return clipboardRepo.queryByProjectId(projectId);
}
