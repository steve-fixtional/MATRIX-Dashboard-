import { SearchResult, SearchResultType } from '../../domain/searchTypes';
import { CommandItem, CommandGroup, CommandCategory } from './commandTypes';

const TYPE_LABELS: Record<SearchResultType, string> = {
  notes: 'Notes',
  tasks: 'Tasks',
  events: 'Calendar Events',
  projects: 'Projects',
  clipboard: 'Clipboard',
  bookmarks: 'Bookmarks',
  files: 'Files',
  drive: 'Google Drive',
};

export function mapSearchResultsToCommands(
  results: Record<SearchResultType, SearchResult[]>,
  navigate: (path: string) => void
): CommandGroup[] {
  const groups: CommandGroup[] = [];

  (Object.keys(results) as SearchResultType[]).forEach(type => {
    const groupResults = results[type];
    if (groupResults && groupResults.length > 0) {
      const commands: CommandItem[] = groupResults.map(result => ({
        id: result.id,
        title: result.title,
        category: TYPE_LABELS[type],
        categoryId: type,
        type: 'search-result',
        snippet: result.snippet,
        updatedAt: result.updatedAt,
        url: result.url,
        onSelect: () => {
          if (type === 'drive' && result.url) {
            window.open(result.url, '_blank');
          } else if (result.url) {
            navigate(result.url);
          }
        }
      }));
      
      groups.push({
        category: TYPE_LABELS[type],
        categoryId: type,
        commands
      });
    }
  });

  return groups;
}
