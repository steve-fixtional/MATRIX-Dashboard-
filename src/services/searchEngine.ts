import { SearchResult, SearchResultType } from '../domain/searchTypes';
import { Repository } from './repository';
import { Note, Task, CalendarEvent, ClipboardItem } from '../domain/types';
import { searchDriveFiles } from './googleDriveService';
import { isGoogleAuthed } from './googleCalendarService';

const noteRepository = new Repository<Note>('notes');
const taskRepository = new Repository<Task>('tasks');
const eventRepository = new Repository<CalendarEvent>('events');
const clipboardRepository = new Repository<ClipboardItem>('clipboard');

export async function performUniversalSearch(query: string): Promise<Record<SearchResultType, SearchResult[]>> {
  if (!query.trim()) {
    return {
      notes: [],
      tasks: [],
      events: [],
      projects: [],
      clipboard: [],
      bookmarks: [],
      drive: [],
    };
  }

  const searchPromises: Promise<any>[] = [
    noteRepository.search(query, ['title', 'content', 'tags']),
    taskRepository.search(query, ['title', 'notes', 'tags']),
    eventRepository.search(query, ['title', 'description', 'location']),
    clipboardRepository.search(query, ['content', 'source']),
  ];

  if (isGoogleAuthed()) {
    searchPromises.push(searchDriveFiles(query).catch(() => []));
  } else {
    searchPromises.push(Promise.resolve([]));
  }

  const [notes, tasks, events, clipboardItems, driveFiles] = await Promise.all(searchPromises);

  const mapToSearchResult = (
    items: any[],
    type: SearchResultType,
    titleField: string,
    snippetField: string,
    urlPrefix: string
  ): SearchResult[] => {
    return items.map(item => ({
      id: item.id,
      type,
      title: item[titleField] || (type === 'clipboard' ? (item.contentType.toUpperCase() + ' Snippet') : 'Untitled'),
      snippet: (item[snippetField] || '').substring(0, 100).replace(/\n/g, ' ') + ((item[snippetField]?.length > 100) ? '...' : ''),
      updatedAt: item.updatedAt || new Date(item.modifiedTime || Date.now()).getTime(),
      url: type === 'drive' ? item.webViewLink : `${urlPrefix}${item.id}`
    }));
  };

  return {
    notes: mapToSearchResult(notes, 'notes', 'title', 'content', '/notes?id='),
    tasks: mapToSearchResult(tasks, 'tasks', 'title', 'notes', '/tasks?id='),
    events: mapToSearchResult(events, 'events', 'title', 'description', '/calendar?id='),
    projects: [], // Placeholder for future implementation
    clipboard: mapToSearchResult(clipboardItems, 'clipboard', '', 'content', '/clipboard?id='),
    bookmarks: [], // Placeholder
    drive: mapToSearchResult(driveFiles, 'drive', 'name', 'mimeType', ''),
  };
}
