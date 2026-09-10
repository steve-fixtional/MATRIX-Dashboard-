import { getDB } from './db';
import { BaseEntity, SyncStatus } from '../domain/types';

export type StoreName = 'notes' | 'tasks' | 'events' | 'clipboard';

export class Repository<T extends BaseEntity> {
  constructor(private storeName: StoreName) {}

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt' | 'syncStatus' | 'syncError'> & { id?: string }): Promise<T> {
    const db = await getDB();
    const now = Date.now();
    const id = data.id || crypto.randomUUID();
    
    const entity = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deletedAt: null,
      syncStatus: 'pending_create' as SyncStatus,
    } as unknown as T;

    await db.put(this.storeName, entity as any);
    return entity;
  }

  async read(id: string): Promise<T | undefined> {
    const db = await getDB();
    return db.get(this.storeName, id) as unknown as Promise<T | undefined>;
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt' | 'syncStatus' | 'syncError'>>): Promise<T> {
    const db = await getDB();
    const existing = (await db.get(this.storeName, id)) as unknown as T | undefined;
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    const now = Date.now();
    // If it was already pending_create, keep it pending_create. Otherwise pending_update.
    const newSyncStatus = existing.syncStatus === 'pending_create' ? 'pending_create' : 'pending_update';

    const entity: T = {
      ...existing,
      ...data,
      updatedAt: now,
      version: existing.version + 1,
      syncStatus: newSyncStatus,
    };

    await db.put(this.storeName, entity as any);
    return entity;
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    const existing = (await db.get(this.storeName, id)) as unknown as T | undefined;
    if (!existing || existing.deletedAt) return;

    const now = Date.now();
    const newSyncStatus = existing.syncStatus === 'pending_create' ? 'synchronized' : 'pending_delete';
    
    const deletedEntity: T = {
      ...existing,
      updatedAt: now,
      deletedAt: now,
      version: existing.version + 1,
      syncStatus: newSyncStatus,
    };

    // If it was pending_create and we delete it, we could actually physically delete it or mark it synchronized and deleted.
    // We'll keep it soft deleted but mark it 'synchronized' or just physically delete it if we don't want to sync it.
    if (existing.syncStatus === 'pending_create') {
        await db.delete(this.storeName, id);
    } else {
        await db.put(this.storeName, deletedEntity as any);
    }
  }

  async list(includeDeleted = false): Promise<T[]> {
    const db = await getDB();
    const all = (await db.getAll(this.storeName)) as unknown as T[];
    if (includeDeleted) return all.sort((a, b) => b.updatedAt - a.updatedAt);
    return all.filter(e => !e.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async search(query: string, fieldNames: (keyof T)[]): Promise<T[]> {
    const all = await this.list();
    const lowerQuery = query.toLowerCase();
    return all.filter(item => {
      return fieldNames.some(field => {
        const val = item[field];
        if (typeof val === 'string') {
          return val.toLowerCase().includes(lowerQuery);
        }
        return false;
      });
    });
  }

  async queryByUpdatedAt(since: number): Promise<T[]> {
    const db = await getDB();
    const all = (await db.getAllFromIndex(this.storeName, 'by-updatedAt')) as unknown as T[];
    return all.filter(e => e.updatedAt >= since);
  }

  async queryBySyncStatus(status: SyncStatus): Promise<T[]> {
    const db = await getDB();
    return (await db.getAllFromIndex(this.storeName, 'by-syncStatus', status)) as unknown as T[];
  }
}
