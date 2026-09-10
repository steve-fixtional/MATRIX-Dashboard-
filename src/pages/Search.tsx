import { useState, useEffect } from 'react';
import { Input } from '../components/ui/Input';
import { Search as SearchIcon, Command, FileText, ListTodo, Calendar, Folder, Clipboard, Bookmark, HardDrive } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { EmptyState } from '../components/ui/EmptyState';
import { useNavigate } from 'react-router-dom';
import { performUniversalSearch } from '../services/searchEngine';
import { SearchResult, SearchResultType } from '../domain/searchTypes';

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

export function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<SearchResultType, SearchResult[]>>({
    notes: [], tasks: [], events: [], projects: [], clipboard: [], bookmarks: [], drive: []
  });

  useEffect(() => {
    const search = async () => {
      const res = await performUniversalSearch(query);
      setResults(res);
    };
    const timer = setTimeout(search, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const flatResultsCount = (Object.values(results) as SearchResult[][]).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <PageWrapper className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      </div>
      
      <div className="relative max-w-3xl">
        <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400" />
        <Input 
          className="pl-12 h-12 md:h-14 text-base md:text-lg rounded-xl shadow-sm bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all"
          placeholder="Search notes, tasks, events..."
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!query.trim() && (
        <div className="pt-8 max-w-3xl">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 px-1">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              onClick={() => navigate('/notes?new=true')}
              className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors text-left"
            >
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                <FileText className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div>
                <div className="font-medium">Create Note</div>
                <div className="text-xs text-neutral-500">Jot down a thought</div>
              </div>
            </button>

            <button 
              onClick={() => navigate('/tasks?new=true')}
              className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors text-left"
            >
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                <ListTodo className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div>
                <div className="font-medium">New Task</div>
                <div className="text-xs text-neutral-500">Add a to-do item</div>
              </div>
            </button>

            <button 
              onClick={() => navigate('/calendar')}
              className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors text-left"
            >
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                <Calendar className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div>
                <div className="font-medium">Schedule Event</div>
                <div className="text-xs text-neutral-500">Add to calendar</div>
              </div>
            </button>
          </div>

          <div className="pt-12">
            <EmptyState 
              icon={Command} 
              title="Universal Search" 
              description="Start typing to search across your entire digital workspace."
              className="bg-transparent border-none dark:bg-transparent shadow-none"
            />
          </div>
        </div>
      )}

      {query.trim() !== '' && (
        <div className="pt-4 max-w-3xl space-y-8">
          {flatResultsCount === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              No results found for "{query}"
            </div>
          ) : (
            (Object.keys(results) as SearchResultType[]).map(type => {
              const groupResults = results[type];
              if (groupResults.length === 0) return null;
              
              const Icon = TYPE_ICONS[type];
              
              return (
                <div key={type} className="mb-8 last:mb-0">
                  <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2 px-1">
                    <Icon className="h-4 w-4" />
                    {TYPE_LABELS[type]}
                  </h2>
                  <div className="space-y-2">
                    {groupResults.map(result => (
                      <button
                        key={result.id}
                        onClick={() => {
                          if (type === 'drive') {
                            window.open(result.url, '_blank');
                          } else {
                            navigate(result.url);
                          }
                        }}
                        className="w-full text-left px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all flex flex-col gap-1 outline-none"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {result.title}
                          </span>
                          <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                            {new Date(result.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {result.snippet && (
                          <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                            {result.snippet}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </PageWrapper>
  );
}
