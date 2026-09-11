import { Repository } from './repository';
import { ClipboardItem } from '../domain/types';
import { requestSync } from './sync';

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
    requestSync();
  }
  return item;
}

export async function deleteClipboardItem(id: string): Promise<void> {
  await clipboardRepo.delete(id);
  if (isClipboardSyncEnabled()) {
    requestSync();
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
    requestSync();
  }
}

const CLIPBOARD_HISTORY_LIMIT = 50;

export async function enforceClipboardRetention(): Promise<void> {
  const items = await getClipboardItems();
  const unpinned = items.filter(item => !item.pinned).sort((a, b) => b.createdAt - a.createdAt);
  
  // Keep only the most recent items up to the limit
  if (unpinned.length > CLIPBOARD_HISTORY_LIMIT) {
    const toDelete = unpinned.slice(CLIPBOARD_HISTORY_LIMIT);
    for (const item of toDelete) {
      await deleteClipboardItem(item.id);
    }
  }
}

export async function captureClipboardText(projectId?: string | null): Promise<void> {
  try {
    let content = '';
    let contentType: 'text' | 'url' | 'code' | 'image' = 'text';

    // First try to read rich data (like images)
    if (navigator.clipboard.read) {
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
          const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
          if (imageTypes.length > 0) {
            const blob = await clipboardItem.getType(imageTypes[0]);
            content = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            contentType = 'image';
            break;
          }
        }
      } catch (e) {
        // Fallback to text if rich read fails or is unsupported
      }
    }

    // If no image was found, fall back to text
    if (!content) {
      content = await navigator.clipboard.readText();
      if (!content.trim()) return;

      if (content.startsWith('http://') || content.startsWith('https://')) {
        contentType = 'url';
      } else if (content.includes('{') || content.includes('function') || content.includes('const ')) {
        contentType = 'code';
      }
    }

    // Check if it's already the most recent item to avoid duplicates
    const items = await getClipboardItems();
    const sorted = items.sort((a, b) => b.createdAt - a.createdAt);
    if (sorted.length > 0 && sorted[0].content === content) {
      return;
    }

    await saveClipboardItem({
      content,
      contentType,
      pinned: false,
      favorite: false,
      source: 'web_clipboard',
      projectId
    });
    
    await enforceClipboardRetention();
  } catch (error) {
    console.error('Failed to read clipboard', error);
    throw error;
  }
}
