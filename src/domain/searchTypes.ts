export type SearchResultType = 'notes' | 'tasks' | 'events' | 'projects' | 'clipboard' | 'bookmarks' | 'drive';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  updatedAt: number;
  url: string;
}
