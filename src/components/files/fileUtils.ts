import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Code,
  FileSpreadsheet,
  FileBox,
  FileCode,
  File,
  LucideIcon,
  Folder,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export function formatFileSize(bytes: number = 0): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unit = units[i] || 'B';
  const val = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${val} ${unit}`;
}

export function formatFileDate(timestamp?: number): string {
  if (!timestamp) return '—';
  try {
    const diff = Date.now() - timestamp;
    // If less than 7 days ago, show relative time
    if (diff < 7 * 24 * 60 * 60 * 1000 && diff >= 0) {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    }
    return format(timestamp, 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export function getFileTypeInfo(mimeType: string = '', filename: string = ''): {
  label: string;
  category: 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'code' | 'archive' | 'spreadsheet' | 'binary';
  icon: LucideIcon;
} {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = filename.toLowerCase();
  const ext = lowerName.split('.').pop() || '';

  if (lowerMime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext)) {
    return { label: 'Image', category: 'image', icon: Image };
  }
  if (lowerMime.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) {
    return { label: 'Video', category: 'video', icon: Film };
  }
  if (lowerMime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return { label: 'Audio', category: 'audio', icon: Music };
  }
  if (lowerMime === 'application/pdf' || ext === 'pdf') {
    return { label: 'PDF Document', category: 'pdf', icon: FileText };
  }
  if (
    ['json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'py', 'rs', 'go', 'sh', 'sql', 'xml', 'yaml', 'yml'].includes(ext) ||
    lowerMime.includes('javascript') ||
    lowerMime.includes('typescript') ||
    lowerMime.includes('json') ||
    lowerMime.includes('xml')
  ) {
    return { label: `${ext.toUpperCase()} Code`, category: 'code', icon: FileCode };
  }
  if (
    ['zip', 'tar', 'gz', '7z', 'rar', 'bz2'].includes(ext) ||
    lowerMime.includes('zip') ||
    lowerMime.includes('tar') ||
    lowerMime.includes('compressed')
  ) {
    return { label: 'Archive', category: 'archive', icon: Archive };
  }
  if (
    ['csv', 'xlsx', 'xls', 'tsv', 'ods'].includes(ext) ||
    lowerMime.includes('spreadsheet') ||
    lowerMime.includes('csv')
  ) {
    return { label: 'Spreadsheet', category: 'spreadsheet', icon: FileSpreadsheet };
  }
  if (lowerMime.startsWith('text/') || ['txt', 'md', 'rtf', 'log'].includes(ext)) {
    return { label: 'Text Document', category: 'text', icon: FileText };
  }

  return { label: ext ? `${ext.toUpperCase()} File` : 'File', category: 'binary', icon: File };
}

export function isImage(mimeType: string = '', filename: string = ''): boolean {
  return getFileTypeInfo(mimeType, filename).category === 'image';
}

export function isTextPreviewable(mimeType: string = '', filename: string = ''): boolean {
  const cat = getFileTypeInfo(mimeType, filename).category;
  const ext = filename.toLowerCase().split('.').pop() || '';
  return cat === 'text' || cat === 'code' || ext === 'csv';
}

export function getFileIcon(filename: string = '', mimeType: string = ''): LucideIcon {
  return getFileTypeInfo(mimeType, filename).icon;
}
