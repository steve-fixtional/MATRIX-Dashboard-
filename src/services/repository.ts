import { getDB, MatrixDB } from './db';
import { BaseEntity, SyncStatus } from '../domain/types';

export type StoreName = 'notes' | 'tasks' | 'events' | 'clipboard';

export type EntityFor<K extends StoreName> = MatrixDB[K]['value'] & BaseEntity;

export class Repository<K extends StoreName, T extends EntityFor<K> = EntityFor<K>> {
  constructor(private storeName: K) {}

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt' | 'syncStatus' | 'syncError' | '_conflicts'> & { id?: string }): Promise<T> {
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
    } as T;

    await db.put(this.storeName, entity);
    return entity;
  }

  async read(id: string): Promise<T | undefined> {
    const db = await getDB();
    return db.get(this.storeName, id) as Promise<T | undefined>;
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt' | 'syncStatus' | 'syncError' | '_conflicts'>>): Promise<T> {
    const db = await getDB();
    const existing = (await db.get(this.storeName, id)) as T | undefined;
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    const now = Date.now();
    // If it was already pending_create, keep it pending_create. Otherwise pending_update.
    const newSyncStatus = existing.syncStatus === 'pending_create' ? 'pending_create' : 'pending_update';

    const entity = {
      ...existing,
      ...data,
      updatedAt: now,
      version: existing.version + 1,
      syncStatus: newSyncStatus,
    } as T;

    await db.put(this.storeName, entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    const existing = (await db.get(this.storeName, id)) as T | undefined;
    if (!existing || existing.deletedAt) return;

    const now = Date.now();
    const newSyncStatus = existing.syncStatus === 'pending_create' ? 'synchronized' : 'pending_delete';
    
    const deletedEntity = {
      ...existing,
      updatedAt: now,
      deletedAt: now,
      version: existing.version + 1,
      syncStatus: newSyncStatus,
    } as T;

    // If it was pending_create and we delete it, we could actually physically delete it or mark it synchronized and deleted.
    // We'll keep it soft deleted but mark it 'synchronized' or just physically delete it if we don't want to sync it.
    if (existing.syncStatus === 'pending_create') {
        await db.delete(this.storeName, id);
    } else {
        await db.put(this.storeName, deletedEntity);
    }
  }

  async list(includeDeleted = false): Promise<T[]> {
    const db = await getDB();
    const all = (await db.getAll(this.storeName)) as T[];
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
    const all = (await db.getAllFromIndex(this.storeName, 'by-updatedAt')) as T[];
    return all.filter(e => e.updatedAt >= since);
  }

  async queryBySyncStatus(status: SyncStatus): Promise<T[]> {
    const db = await getDB();
    return (await db.getAllFromIndex(this.storeName, 'by-syncStatus' as any, status as any)) as T[];
  }
}
