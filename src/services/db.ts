import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, Task, CalendarEvent, ClipboardItem, DashboardPreference, AppSettings, Project, MatrixFile } from '../domain/types';
import { StoredVaultRecord, StoredVaultMeta } from '../domain/vaultTypes';

export interface MatrixDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string, 'by-projectId': string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string, 'by-projectId': string };
  };
  events: {
    key: string;
    value: CalendarEvent;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string, 'by-projectId': string };
  };
  clipboard: {
    key: string;
    value: ClipboardItem;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string, 'by-projectId': string };
  };
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string };
  };
  files: {
    key: string;
    value: MatrixFile;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string, 'by-relatedEntityIds': string };
  };
  fileBlobs: {
    key: string;
    value: { id: string; data: Blob };
  };
  preferences: {
    key: string;
    value: DashboardPreference | AppSettings;
    indexes: { 'by-updatedAt': number, 'by-syncStatus': string };
  };
  syncMeta: {
    key: string;
    value: { key: string; lastSyncedAt: number };
  };
  vaultItems: {
    key: string;
    value: StoredVaultRecord;
    indexes: { 'by-updatedAt': number; 'by-syncStatus': string };
  };
  vaultMeta: {
    key: string;
    value: StoredVaultMeta;
    indexes: { 'by-updatedAt': number; 'by-syncStatus': string };
  };
}

let dbPromise: Promise<IDBPDatabase<MatrixDB>> | null = null;

export function resetDBPromise() {
  dbPromise = null;
}

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MatrixDB>('matrix-db', 7, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore('notes', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
          store.createIndex('by-projectId', 'projectId');
        } else {
          const store = transaction.objectStore('notes');
          if (oldVersion < 2 && !store.indexNames.contains('by-syncStatus')) store.createIndex('by-syncStatus', 'syncStatus');
          if (oldVersion < 5 && !store.indexNames.contains('by-projectId')) store.createIndex('by-projectId', 'projectId');
        }

        if (!db.objectStoreNames.contains('tasks')) {
          const store = db.createObjectStore('tasks', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
          store.createIndex('by-projectId', 'projectId');
        } else {
          const store = transaction.objectStore('tasks');
          if (oldVersion < 2 && !store.indexNames.contains('by-syncStatus')) store.createIndex('by-syncStatus', 'syncStatus');
          if (oldVersion < 5 && !store.indexNames.contains('by-projectId')) store.createIndex('by-projectId', 'projectId');
        }

        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
          store.createIndex('by-projectId', 'projectId');
        } else {
          const store = transaction.objectStore('events');
          if (oldVersion < 2 && !store.indexNames.contains('by-syncStatus')) store.createIndex('by-syncStatus', 'syncStatus');
          if (oldVersion < 5 && !store.indexNames.contains('by-projectId')) store.createIndex('by-projectId', 'projectId');
        }

        if (!db.objectStoreNames.contains('clipboard')) {
          const store = db.createObjectStore('clipboard', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
          store.createIndex('by-projectId', 'projectId');
        } else {
          const store = transaction.objectStore('clipboard');
          if (oldVersion < 5 && !store.indexNames.contains('by-projectId')) store.createIndex('by-projectId', 'projectId');
        }
        
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
          store.createIndex('by-relatedEntityIds', 'relatedEntityIds', { multiEntry: true });
        } else {
          const store = transaction.objectStore('files');
          if (oldVersion < 6 && !store.indexNames.contains('by-relatedEntityIds')) store.createIndex('by-relatedEntityIds', 'relatedEntityIds', { multiEntry: true });
        }

        if (!db.objectStoreNames.contains('fileBlobs')) {
          db.createObjectStore('fileBlobs', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('preferences')) { 
          const store = db.createObjectStore('preferences', { keyPath: 'id' }); 
          store.createIndex('by-updatedAt', 'updatedAt'); 
          store.createIndex('by-syncStatus', 'syncStatus'); 
        } 
        
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('vaultItems')) {
          const store = db.createObjectStore('vaultItems', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('vaultMeta')) {
          const store = db.createObjectStore('vaultMeta', { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
          store.createIndex('by-syncStatus', 'syncStatus');
        }
      },
    });
  }
  return dbPromise;
}
