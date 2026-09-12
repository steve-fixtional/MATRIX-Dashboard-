const fs = require('fs');
let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

// Add Created to Sort Dropdown
content = content.replace(
  /<option value="size">Size<\/option>/,
  '<option value="created">Created</option>\n                <option value="size">Size</option>'
);

// Add Filter Dropdown / UI
const viewControlsPattern = /\{\/\* Separator \*\/\}/;
const filterUI = `            {/* Filter Toggle */}
            <div className="relative">
              <button
                id="files-filter-btn"
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  "h-8 px-2.5 rounded-md flex items-center justify-center border transition-colors text-xs font-medium gap-1.5",
                  activeFilter !== 'all' 
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
                title="Filter files"
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {activeFilter === 'all' ? 'Filter' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
                </span>
              </button>

              {isFilterOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 sm:hidden" 
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <div 
                    className="fixed inset-0 z-40 hidden sm:block" 
                    onClick={() => setIsFilterOpen(false)}
                  />
                  
                  {/* Desktop Popover */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden hidden sm:block">
                    <div className="p-1">
                      {[
                        { id: 'all', label: 'All Files' },
                        { id: 'image', label: 'Images' },
                        { id: 'document', label: 'Documents' },
                        { id: 'video', label: 'Videos' },
                        { id: 'audio', label: 'Audio' },
                        { id: 'archive', label: 'Archives' },
                        { id: 'other', label: 'Other' },
                        { id: 'favorites', label: 'Favorites' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => handleFilterChange(f.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                            activeFilter === f.id
                              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
                              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Bottom Sheet for Filters */}
                  <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-neutral-900 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] sm:hidden transform transition-transform duration-300">
                    <div className="p-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
                      <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Filter Files</h3>
                      <button onClick={() => setIsFilterOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-2 grid grid-cols-2 gap-2">
                      {[
                        { id: 'all', label: 'All Files' },
                        { id: 'image', label: 'Images' },
                        { id: 'document', label: 'Documents' },
                        { id: 'video', label: 'Videos' },
                        { id: 'audio', label: 'Audio' },
                        { id: 'archive', label: 'Archives' },
                        { id: 'other', label: 'Other' },
                        { id: 'favorites', label: 'Favorites' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => handleFilterChange(f.id)}
                          className={cn(
                            "text-left px-4 py-3 text-sm rounded-xl transition-colors font-medium",
                            activeFilter === f.id
                              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                              : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 active:bg-neutral-100 dark:active:bg-neutral-800"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="h-6" />
                  </div>
                </>
              )}
            </div>

            {/* Separator */}`;
content = content.replace(viewControlsPattern, filterUI);

// Update FileListView and FileGridView invocations
content = content.replace(/onDeleteFile=\{handleDeleteFileClick\}\s*\/>/g, 'onDeleteFile={handleDeleteFileClick}\n                  onGoToFolder={(f) => handleGoToFolder(f.parentFolderId)}\n                />');
content = content.replace(/onDeleteFolder=\{handleDeleteFolderClick\}\s*\/>/g, 'onDeleteFolder={handleDeleteFolderClick}\n                  onGoToFolder={(f) => handleGoToFolder(f.parentFolderId)}\n                />');
content = content.replace(/onDelete=\{handleBottomSheetDelete\}\s*\/>/g, 'onDelete={handleBottomSheetDelete}\n        onGoToFolder={() => bottomSheetItem && handleGoToFolder(bottomSheetItem.data.parentFolderId)}\n      />');


fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
