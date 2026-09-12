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

export type ProjectStatus = 'active' | 'completed' | 'archived';

export type StorageProvider = 'local' | 'cloud' | 'google_drive' | 'remote' | string;

export interface MatrixFileThumbnail {
  url?: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

export type FileSyncState = 'synced' | 'uploading' | 'downloading' | 'pending' | 'offline' | 'conflict' | 'error';

export interface MatrixFile extends BaseEntity {
  filename: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageProvider: StorageProvider;
  storageReference: string; // ID in local blob store, cloud key, or Google Drive ID
  storagePath?: string;
  parentFolderId: string | null;
  externalUrl?: string; // e.g. webViewLink
  iconUrl?: string; // e.g. iconLink
  thumbnail?: MatrixFileThumbnail;
  thumbnailUrl?: string;
  isAvailableOffline: boolean;
  relatedEntityIds: string[]; // Polymorphic relations to projects, notes, tasks, events
  favorite: boolean;
  fileSyncState?: FileSyncState;
  localModifiedAt?: number;
  remoteModifiedAt?: number;
  fileHash?: string;
  lastOpenedAt?: number;
  tags: string[];
  metadata?: Record<string, any>;
  userId: string | null;
  favorite?: boolean;
  modifiedAt?: number;
}

export interface MatrixFolder extends BaseEntity {
  name: string;
  parentFolderId: string | null;
  userId: string | null;
  favorite?: boolean;
  color?: string;
  icon?: string;
  modifiedAt?: number;
}

export interface Project extends BaseEntity {
  name: string;
  description: string;
  color?: string;
  icon?: string;
  status: ProjectStatus;
}

export type ClipboardContentType = 'text' | 'url' | 'code' | 'image';

export interface ClipboardItem extends BaseEntity {
  content: string;
  contentType: ClipboardContentType;
  pinned: boolean;
  favorite: boolean;
  source?: string;
  projectId?: string | null;
}

export interface Note extends BaseEntity {
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  favorite: boolean;
  driveFileIds?: string[]; // Array of attached Google Drive file IDs
  projectId?: string | null;
}

export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

export interface Task extends BaseEntity {
  title: string;
  notes: string;
  completed: boolean;
  dueDate: number | null;
  priority: TaskPriority;
  tags: string[];
  reminders?: number[]; // array of minutes before task due date
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
  projectId?: string | null;
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

export interface DashboardPreference extends BaseEntity {
  widgetVisibility: Record<string, boolean>;
  widgetOrder: Record<string, number>;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type TempUnit = 'celsius' | 'fahrenheit';
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';
export type WeekStart = 'sunday' | 'monday';

export interface AppSettings extends BaseEntity {
  theme: ThemePreference;
  weatherUnit: TempUnit;
  calendarDefaultView: CalendarView;
  calendarWeekStart: WeekStart;
  manualLat?: number | null;
  manualLon?: number | null;
  manualLocationName?: string | null;
  notificationsEnabled?: boolean;
  tasksNotificationsEnabled?: boolean;
  eventsNotificationsEnabled?: boolean;
  defaultStorageProvider?: string;
  storageMode?: 'local' | 'cloud' | 'hybrid';
  syncEnabled?: boolean;
  syncAutomatically?: boolean;
  syncWifiOnly?: boolean;
  syncFrequency?: 'realtime' | '15m' | '1h' | '12h' | 'daily';
}
