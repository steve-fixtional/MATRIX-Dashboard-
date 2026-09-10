import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, Task, CalendarEvent, ClipboardItem } from '../domain/types';

export interface MatrixDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string };
  };
  events: {
    key: string;
    value: CalendarEvent;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string };
  };
  clipboard: {
    key: string;
    value: ClipboardItem;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string };
  };
  syncMeta: {
    key: string;
    value: { key: string; lastSyncedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<MatrixDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MatrixDB>('matrix-db', 3, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore('notes', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
        } else if (oldVersion < 2) {
          const store = transaction.objectStore('notes');
          store.createIndex('by-syncStatus', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('tasks')) {
          const store = db.createObjectStore('tasks', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
        } else if (oldVersion < 2) {
          const store = transaction.objectStore('tasks');
          store.createIndex('by-syncStatus', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
        } else if (oldVersion < 2) {
          const store = transaction.objectStore('events');
          store.createIndex('by-syncStatus', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('clipboard')) {
          const store = db.createObjectStore('clipboard', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}
