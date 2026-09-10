import React from 'react';
import { Search as SearchIcon, FileText, ListTodo, Calendar, Folder, Clipboard, Bookmark, X, HardDrive } from 'lucide-react';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import { CommandCategory } from '../../services/command/commandTypes';

const CATEGORY_ICONS: Record<CommandCategory, any> = {
  notes: FileText,
  tasks: ListTodo,
  events: Calendar,
  projects: Folder,
  clipboard: Clipboard,
  bookmarks: Bookmark,
  drive: HardDrive,
  actions: SearchIcon, // Default icon for actions
};

export function CommandPalette() {
  const {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    inputRef,
    commandGroups,
    flatCommands,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
    handleSelect
  } = useCommandPalette();

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
          {flatCommands.length === 0 && query.trim() !== '' && (
            <div className="py-14 text-center text-sm text-neutral-500">
              No results found for "{query}"
            </div>
          )}
          {flatCommands.length === 0 && query.trim() === '' && (
            <div className="py-14 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
              <SearchIcon className="h-8 w-8 text-neutral-300 dark:text-neutral-700" />
              <p>Type to search across everything...</p>
            </div>
          )}

          {commandGroups.map(group => {
            if (group.commands.length === 0) return null;
            
            const Icon = CATEGORY_ICONS[group.categoryId] || SearchIcon;
            
            return (
              <div key={group.category} className="mb-4 last:mb-0">
                <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {group.category}
                </div>
                <div className="space-y-1">
                  {group.commands.map(command => {
                    const globalIndex = flatCommands.findIndex(c => c.id === command.id);
                    const isSelected = selectedIndex === globalIndex;
                    
                    return (
                      <button
                        key={command.id}
                        className={`w-full text-left px-3 py-2 rounded-lg flex flex-col gap-0.5 outline-none transition-colors ${
                          isSelected ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                        }`}
                        onClick={() => handleSelect(command)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {command.title}
                          </span>
                          {command.updatedAt && (
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap shrink-0">
                              {new Date(command.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {command.snippet && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {command.snippet}
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
