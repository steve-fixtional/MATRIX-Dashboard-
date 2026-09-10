import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, FileText, ListTodo, Calendar, Folder, Clipboard, Bookmark, X, HardDrive } from 'lucide-react';
import { performUniversalSearch } from '../../services/searchEngine';
import { SearchResult, SearchResultType } from '../../domain/searchTypes';

const TYPE_ICONS: Record<SearchResultType, any> = {
  notes: FileText,
  tasks: ListTodo,
  events: Calendar,
  projects: Folder,
  clipboard: Clipboard,
  bookmarks: Bookmark,
  drive: HardDrive,
};

const TYPE_LABELS: Record<SearchResultType, string> = {
  notes: 'Notes',
  tasks: 'Tasks',
  events: 'Calendar Events',
  projects: 'Projects',
  clipboard: 'Clipboard',
  bookmarks: 'Bookmarks',
  drive: 'Google Drive',
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<SearchResultType, SearchResult[]>>({
    notes: [], tasks: [], events: [], projects: [], clipboard: [], bookmarks: [], drive: []
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Listen for global toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Expose toggle to window for other components (like TopBar)
  useEffect(() => {
    (window as any).toggleCommandPalette = () => setIsOpen(prev => !prev);
    return () => {
      delete (window as any).toggleCommandPalette;
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      const res = await performUniversalSearch(query);
      setResults(res);
      setSelectedIndex(0);
    };
    const timer = setTimeout(search, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const flatResults = [
    ...results.notes,
    ...results.tasks,
    ...results.events,
    ...results.projects,
    ...results.clipboard,
    ...results.bookmarks,
    ...results.drive
  ];

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    if (result.type === 'drive') {
      window.open(result.url, '_blank');
    } else {
      navigate(result.url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(flatResults.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatResults.length) % Math.max(flatResults.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults.length > 0) {
        handleSelect(flatResults[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 sm:px-0">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[80vh]">
        
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <SearchIcon className="h-5 w-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-0 focus:ring-0 text-base md:text-lg px-4 py-1 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
            placeholder="Search notes, tasks, events..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hidden sm:block">ESC</span>
            <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 sm:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-2">
          {flatResults.length === 0 && query.trim() !== '' && (
            <div className="py-14 text-center text-sm text-neutral-500">
              No results found for "{query}"
            </div>
          )}
          {flatResults.length === 0 && query.trim() === '' && (
            <div className="py-14 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
              <SearchIcon className="h-8 w-8 text-neutral-300 dark:text-neutral-700" />
              <p>Type to search across everything...</p>
            </div>
          )}

          {(Object.keys(results) as SearchResultType[]).map(type => {
            const groupResults = results[type];
            if (groupResults.length === 0) return null;
            
            const Icon = TYPE_ICONS[type];
            
            return (
              <div key={type} className="mb-4 last:mb-0">
                <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {TYPE_LABELS[type]}
                </div>
                <div className="space-y-1">
                  {groupResults.map(result => {
                    const globalIndex = flatResults.findIndex(r => r.id === result.id);
                    const isSelected = selectedIndex === globalIndex;
                    
                    return (
                      <button
                        key={result.id}
                        className={`w-full text-left px-3 py-2 rounded-lg flex flex-col gap-0.5 outline-none transition-colors ${
                          isSelected ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                        }`}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {result.title}
                          </span>
                          <span className="text-[10px] text-neutral-400 whitespace-nowrap shrink-0">
                            {new Date(result.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {result.snippet && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {result.snippet}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
