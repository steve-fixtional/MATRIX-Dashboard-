import { useEffect, useState } from 'react';
import {
  X,
  Download,
  Star,
  ExternalLink,
  HardDrive,
  Calendar,
  Tag,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MatrixFile } from '../../domain/types';
import { downloadFile } from '../../services/fileService';
import { formatFileSize, formatFileDate, getFileTypeInfo, isImage, isTextPreviewable } from './fileUtils';
import { Button } from '../ui/Button';

interface FilePreviewModalProps {
  file: MatrixFile | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => Promise<void>;
  onDownload: (file: MatrixFile) => Promise<void>;
  onOpenRename?: (file: MatrixFile) => void;
  onOpenMove?: (file: MatrixFile) => void;
  onOpenTags?: (file: MatrixFile) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onToggleFavorite,
  onDownload,
  onOpenRename,
  onOpenMove,
  onOpenTags,
  onNavigate,
  hasPrev,
  hasNext,
}: FilePreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeUrl: string | null = null;
    let isCancelled = false;

    async function loadContent() {
      if (!file || !isOpen) {
        setBlobUrl(null);
        setTextContent(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { blob, externalUrl } = await downloadFile(file.id);
        if (isCancelled) return;

        if (blob) {
          activeUrl = URL.createObjectURL(blob);
          setBlobUrl(activeUrl);

          if (isTextPreviewable(file.mimeType, file.name)) {
            // Read first 100KB for text preview
            const textSlice = blob.slice(0, 100 * 1024);
            const text = await textSlice.text();
            if (!isCancelled) {
              setTextContent(text);
            }
          }
        } else if (externalUrl) {
          // Sanitize externalUrl to prevent javascript: or data: XSS vectors
          const safeUrl = externalUrl.trim();
          if (safeUrl.startsWith('http://') || safeUrl.startsWith('https://') || safeUrl.startsWith('blob:')) {
            setBlobUrl(safeUrl);
          } else {
            setError('Invalid or unsafe external URL provided for preview.');
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Failed to load preview');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadContent();

    return () => {
      isCancelled = true;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const typeInfo = getFileTypeInfo(file.mimeType, file.name);
  const TypeIcon = typeInfo.icon;
  const isImg = isImage(file.mimeType, file.name);
  const isTxt = isTextPreviewable(file.mimeType, file.name);
  const isAud = typeInfo.category === 'audio';
  const isVid = typeInfo.category === 'video';
  const isPdf = typeInfo.category === 'pdf';

  return (
    <div
      id="file-preview-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center sm:p-6 bg-black/90 sm:bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        id="file-preview-modal"
        className="w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] flex flex-col sm:rounded-2xl bg-white dark:bg-neutral-900 sm:border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2 sm:pr-4">
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 -ml-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {file.name}
              </h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                {formatFileSize(file.size)} • {typeInfo.label}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {onNavigate && (
              <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden mr-2">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => onNavigate('prev')}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-500 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 transition-colors"
                  title="Previous file"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800" />
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => onNavigate('next')}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-500 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 transition-colors"
                  title="Next file"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <button
              id="preview-favorite-btn"
              type="button"
              onClick={() => onToggleFavorite(file.id)}
              className="p-2 rounded-lg text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={file.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`h-4 w-4 ${file.favorite ? 'fill-amber-400 text-amber-400' : ''}`}
              />
            </button>
            <button
              id="preview-download-btn"
              type="button"
              onClick={() => onDownload(file)}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              id="preview-close-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two column on desktop, stacked on mobile */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-neutral-100 dark:divide-neutral-800">
          {/* Main Preview Area */}
          <div className="flex-1 h-full sm:min-h-[360px] flex items-center justify-center p-4 sm:p-6 bg-neutral-950 sm:bg-neutral-50/60 dark:bg-neutral-950/40 relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-neutral-400">
                <Loader2 className="h-7 w-7 animate-spin" />
                <span className="text-xs">Loading preview...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 text-center text-neutral-500">
                <AlertCircle className="h-8 w-8 text-neutral-400" />
                <p className="text-xs max-w-xs">{error}</p>
                <Button size="sm" variant="secondary" onClick={() => onDownload(file)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download Instead
                </Button>
              </div>
            ) : isImg && blobUrl ? (
              <div className="relative max-h-full max-w-full flex items-center justify-center">
                <img
                  src={blobUrl}
                  alt={file.name}
                  className="max-h-[80vh] sm:max-h-[60vh] max-w-full object-contain sm:rounded-lg sm:shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : isTxt && textContent !== null ? (
              <div className="w-full h-full max-h-[60vh] overflow-y-auto p-4 rounded-lg bg-neutral-900 text-neutral-100 font-mono text-xs leading-relaxed border border-neutral-800 shadow-inner">
                <pre className="whitespace-pre-wrap break-all">{textContent || '(Empty file)'}</pre>
              </div>
            ) : isAud && blobUrl ? (
              <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                  <TypeIcon className="h-8 w-8" />
                </div>
                <audio controls src={blobUrl} className="w-full" />
              </div>
            ) : isVid && blobUrl ? (
              <div className="w-full max-h-[60vh] flex items-center justify-center">
                <video controls src={blobUrl} className="max-h-[60vh] max-w-full rounded-lg shadow-sm" />
              </div>
            ) : isPdf && blobUrl ? (
              <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center gap-3">
                <iframe
                  src={blobUrl}
                  title={file.name}
                  className="w-full h-[55vh] rounded-lg border border-neutral-200 dark:border-neutral-800"
                  sandbox="allow-same-origin allow-scripts" // Required for browser native PDF viewers
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 gap-3">
                <div className="h-20 w-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                  <TypeIcon className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {typeInfo.label}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Direct in-browser preview not supported for this file format.
                  </p>
                </div>
                <Button size="sm" variant="primary" onClick={() => onDownload(file)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download File
                </Button>
              </div>
            )}
          </div>

          {/* Metadata Sidebar */}
          <div className="hidden sm:block w-full lg:w-72 shrink-0 p-5 space-y-5 bg-white dark:bg-neutral-900 text-xs">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
                File Details
              </h3>
              <dl className="space-y-2.5">
                <div>
                  <dt className="text-neutral-400 dark:text-neutral-500">File Type</dt>
                  <dd className="font-medium text-neutral-800 dark:text-neutral-200 truncate mt-0.5">
                    {file.mimeType || 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-400 dark:text-neutral-500">File Size</dt>
                  <dd className="font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {formatFileSize(file.size)} ({file.size.toLocaleString()} bytes)
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-400 dark:text-neutral-500">Storage Provider</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200 capitalize mt-0.5">
                    <HardDrive className="h-3.5 w-3.5 text-neutral-400" />
                    <span>{file.storageProvider || 'Local'}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-400 dark:text-neutral-500">Modified</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    <span>{formatFileDate(file.modifiedAt || file.updatedAt)}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-400 dark:text-neutral-500">Offline Access</dt>
                  <dd className="font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {file.isAvailableOffline ? 'Available Offline' : 'Cloud Synchronized'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Tags section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Tags
                </h3>
                {onOpenTags && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTags(file);
                    }}
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              {file.tags && file.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {file.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400 italic text-[11px]">No tags assigned</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-2">
              <Button
                id="preview-action-download"
                size="sm"
                variant="primary"
                onClick={() => onDownload(file)}
                className="w-full justify-center"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download
              </Button>
              {file.externalUrl && (
                <a
                  href={file.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open in Web
                </a>
              )}
            </div>
          </div>
                </div>

        {/* Mobile Bottom Action Bar */}
        <div className="sm:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex gap-1.5">
            <button
              onClick={() => onToggleFavorite(file.id)}
              className="p-2.5 rounded-lg text-neutral-400 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
            >
              <Star className={`h-5 w-5 ${file.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
            <button
              onClick={() => onDownload(file)}
              className="p-2.5 rounded-lg text-neutral-400 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
          
          {onNavigate && (
            <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
              <button
                disabled={!hasPrev}
                onClick={() => onNavigate('prev')}
                className="p-2.5 text-neutral-500 disabled:opacity-30 bg-neutral-50 dark:bg-neutral-900"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800" />
              <button
                disabled={!hasNext}
                onClick={() => onNavigate('next')}
                className="p-2.5 text-neutral-500 disabled:opacity-30 bg-neutral-50 dark:bg-neutral-900"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
