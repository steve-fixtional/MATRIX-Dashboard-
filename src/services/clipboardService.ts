import { Repository } from './repository';
import { ClipboardItem } from '../domain/types';
import { syncEngine } from './sync';

const clipboardRepo = new Repository('clipboard');

export async function getClipboardItems(includeDeleted = false): Promise<ClipboardItem[]> {
  return clipboardRepo.list(includeDeleted);
}

export async function getClipboardItem(id: string): Promise<ClipboardItem | undefined> {
  return clipboardRepo.read(id);
}

export async function saveClipboardItem(data: Omit<ClipboardItem, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus' | 'deletedAt'> & { id?: string }): Promise<ClipboardItem> {
  let item: ClipboardItem;
  if (data.id) {
    const existing = await clipboardRepo.read(data.id);
    if (existing) {
      item = await clipboardRepo.update(data.id, data);
    } else {
      item = await clipboardRepo.create(data);
    }
  } else {
    item = await clipboardRepo.create(data);
  }
  if (isClipboardSyncEnabled()) {
    syncEngine.syncAll().catch(console.error);
  }
  return item;
}

export async function deleteClipboardItem(id: string): Promise<void> {
  await clipboardRepo.delete(id);
  if (isClipboardSyncEnabled()) {
    syncEngine.syncAll().catch(console.error);
  }
}

export async function clearClipboardHistory(): Promise<void> {
  const items = await getClipboardItems();
  const unpinned = items.filter(item => !item.pinned);
  
  for (const item of unpinned) {
    await deleteClipboardItem(item.id);
  }
}

export function isClipboardSyncEnabled(): boolean {
  return localStorage.getItem('matrix_sync_clipboard') === 'true';
}

export function setClipboardSyncEnabled(enabled: boolean): void {
  localStorage.setItem('matrix_sync_clipboard', enabled ? 'true' : 'false');
  if (enabled) {
    syncEngine.syncAll().catch(console.error);
  }
}

export async function captureClipboardText(): Promise<void> {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) return;

    // Check if it's already the most recent item to avoid duplicates
    const items = await getClipboardItems();
    const sorted = items.sort((a, b) => b.createdAt - a.createdAt);
    if (sorted.length > 0 && sorted[0].content === text) {
      return;
    }

    let contentType: 'text' | 'url' | 'code' = 'text';
    if (text.startsWith('http://') || text.startsWith('https://')) {
      contentType = 'url';
    } else if (text.includes('{') || text.includes('function') || text.includes('const ')) {
      // Very basic code detection
      contentType = 'code';
    }

    await saveClipboardItem({
      content: text,
      contentType,
      pinned: false,
      favorite: false,
      source: 'web_clipboard'
    });
  } catch (error) {
    console.error('Failed to read clipboard', error);
  }
}
