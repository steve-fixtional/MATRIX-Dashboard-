import { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Clipboard as ClipboardIcon, Trash2, Pin, Search, Copy, Clock, Globe, Code, Image as ImageIcon, Settings, Star } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { getClipboardItems, deleteClipboardItem, clearClipboardHistory, saveClipboardItem, isClipboardSyncEnabled, setClipboardSyncEnabled, captureClipboardText } from '../services/clipboardService';
import { ClipboardItem } from '../domain/types';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '../components/ui/Input';

export function Clipboard() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setIsSyncEnabled(isClipboardSyncEnabled());
    loadItems();
  }, []);

  const loadItems = async () => {
    const all = await getClipboardItems();
    setItems(all.sort((a, b) => b.createdAt - a.createdAt));
  };

  const handleToggleSync = (enabled: boolean) => {
    setClipboardSyncEnabled(enabled);
    setIsSyncEnabled(enabled);
  };

  const handleCapture = async () => {
    await captureClipboardText();
    loadItems();
  };

  const handleTogglePin = async (item: ClipboardItem) => {
    await saveClipboardItem({ ...item, pinned: !item.pinned });
    loadItems();
  };

  const handleToggleFavorite = async (item: ClipboardItem) => {
    await saveClipboardItem({ ...item, favorite: !item.favorite });
    loadItems();
  };

  const handleDelete = async (id: string) => {
    await deleteClipboardItem(id);
    loadItems();
  };

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear unpinned clipboard history?')) {
      await clearClipboardHistory();
      loadItems();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).catch(err => {
      console.error('Failed to copy', err);
    });
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    return item.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'url': return <Globe className="h-4 w-4 text-blue-500" />;
      case 'code': return <Code className="h-4 w-4 text-amber-500" />;
      case 'image': return <ImageIcon className="h-4 w-4 text-purple-500" />;
      default: return <ClipboardIcon className="h-4 w-4 text-neutral-500" />;
    }
  };

  return (
    <PageWrapper className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Clipboard Manager</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowSettings(!showSettings)} className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
          <Button onClick={handleCapture} className="gap-2">
            <ClipboardIcon className="h-4 w-4" />
            Capture Web Clipboard
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4">
          <h2 className="text-lg font-medium">Privacy Settings</h2>
          <div className="flex items-center justify-between">
            <div className="max-w-md">
              <div className="font-medium">Sync clipboard across devices</div>
              <div className="text-sm text-neutral-500">
                When enabled, your clipboard items will be synchronized to the cloud. Keep this disabled if you frequently copy sensitive information like passwords.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isSyncEnabled} onChange={(e) => handleToggleSync(e.target.checked)} />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-400 dark:peer-focus:ring-neutral-600 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-neutral-900 dark:peer-checked:bg-neutral-100"></div>
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input 
            className="pl-9" 
            placeholder="Search clipboard..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        {items.length > 0 && (
          <Button variant="ghost" onClick={handleClearHistory} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Unpinned
          </Button>
        )}
      </div>

      {sortedItems.length === 0 ? (
        <div className="pt-12">
          <EmptyState 
            icon={ClipboardIcon} 
            title="Clipboard Empty" 
            description="Your copied items will appear here."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedItems.map(item => (
            <div key={item.id} className={`group relative bg-white dark:bg-neutral-900 border ${item.pinned ? 'border-neutral-300 dark:border-neutral-600' : 'border-neutral-200 dark:border-neutral-800'} rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-all`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getIcon(item.contentType)}
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {item.contentType}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleCopy(item.content)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleTogglePin(item)}
                    className={`p-1.5 rounded-md transition-colors ${item.pinned ? 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800' : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                    title={item.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleToggleFavorite(item)}
                    className={`p-1.5 rounded-md transition-colors ${item.favorite ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30' : 'text-neutral-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/30'}`}
                    title={item.favorite ? "Unfavorite" : "Favorite"}
                  >
                    <Star className="h-4 w-4" />
                  </button>
                  {!item.pinned && !item.favorite && (
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 bg-neutral-50 dark:bg-neutral-950 rounded-lg p-3 overflow-hidden text-sm relative">
                {item.contentType === 'image' ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img src={item.content} className="max-h-32 object-contain" />
                ) : (
                  <div className="line-clamp-4 font-mono text-xs whitespace-pre-wrap">
                    {item.content}
                  </div>
                )}
                {item.content.length > 200 && item.contentType !== 'image' && (
                   <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-neutral-50 dark:from-neutral-950 to-transparent" />
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                </span>
                {item.source && (
                  <span>via {item.source}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
