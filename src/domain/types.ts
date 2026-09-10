export type SyncStatus = 'synchronized' | 'pending_create' | 'pending_update' | 'pending_delete' | 'sync_error';

export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  version: number;
  syncStatus: SyncStatus;
  syncError?: string;
  _conflicts?: any[]; // Store conflicting versions here for future resolution
}

export type ClipboardContentType = 'text' | 'url' | 'code' | 'image';

export interface ClipboardItem extends BaseEntity {
  content: string;
  contentType: ClipboardContentType;
  pinned: boolean;
  favorite: boolean;
  source?: string;
}

export interface Note extends BaseEntity {
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  favorite: boolean;
  driveFileIds?: string[]; // Array of attached Google Drive file IDs
}

export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

export interface Task extends BaseEntity {
  title: string;
  notes: string;
  completed: boolean;
  dueDate: number | null;
  priority: TaskPriority;
  tags: string[];
  projectId?: string | null;
  relatedNoteId?: string | null;
  relatedEventId?: string | null;
}

export interface CalendarEvent extends BaseEntity {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  allDay: boolean;
  location: string;
  recurrenceRule: string | null;
  reminders: number[]; // array of minutes before event
  provider: 'local' | 'google';
  providerEventId: string | null;
}

export interface SyncState {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: number | null;
  error?: string;
}

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
