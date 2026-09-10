import { Note } from '../domain/types';
import { requestSync } from './sync';
import { Repository } from './repository';

const noteRepository = new Repository('notes');

export async function getNotes(includeDeleted = false): Promise<Note[]> {
  return noteRepository.list(includeDeleted);
}

export async function getNote(id: string): Promise<Note | undefined> {
  return noteRepository.read(id);
}

export async function saveNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt' | 'syncStatus' | 'syncError'> & { id?: string }): Promise<Note> {
  let savedNote: Note;
  if (note.id) {
    // try to read first to see if it's an update
    const existing = await noteRepository.read(note.id);
    if (existing) {
      savedNote = await noteRepository.update(note.id, note);
    } else {
      savedNote = await noteRepository.create(note);
    }
  } else {
    savedNote = await noteRepository.create(note);
  }
  
  requestSync();
  return savedNote;
}

export async function deleteNote(id: string): Promise<void> {
  await noteRepository.delete(id);
  requestSync();
}
