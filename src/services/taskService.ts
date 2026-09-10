import { Task } from '../domain/types';
import { requestSync } from './sync';
import { Repository } from './repository';

const taskRepository = new Repository('tasks');

export async function getTasks(includeDeleted = false): Promise<Task[]> {
  return taskRepository.list(includeDeleted);
}

export async function getTask(id: string): Promise<Task | undefined> {
  return taskRepository.read(id);
}

export async function saveTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt' | 'syncStatus' | 'syncError'> & { id?: string }): Promise<Task> {
  let savedTask: Task;
  if (task.id) {
    const existing = await taskRepository.read(task.id);
    if (existing) {
      savedTask = await taskRepository.update(task.id, task);
    } else {
      savedTask = await taskRepository.create(task);
    }
  } else {
    savedTask = await taskRepository.create(task);
  }
  
  requestSync();
  return savedTask;
}

export async function deleteTask(id: string): Promise<void> {
  await taskRepository.delete(id);
  requestSync();
}
