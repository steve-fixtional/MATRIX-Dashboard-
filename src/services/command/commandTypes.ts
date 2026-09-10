import { SearchResultType } from '../../domain/searchTypes';

export type CommandCategory = SearchResultType | 'actions';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  categoryId: CommandCategory;
  type: 'action' | 'search-result';
  snippet?: string;
  updatedAt?: number;
  url?: string;
  onSelect: () => void;
}

export interface CommandGroup {
  category: string;
  categoryId: CommandCategory;
  commands: CommandItem[];
}
