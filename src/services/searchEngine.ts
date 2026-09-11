import { SearchResult, SearchResultType } from '../domain/searchTypes';
import { Repository } from './repository';
import { Note, Task, CalendarEvent, ClipboardItem, Project, MatrixFile } from '../domain/types';
import { searchDriveFiles } from './googleDriveService';
import { isGoogleAuthed } from './googleCalendarService';

const noteRepository = new Repository('notes');
const taskRepository = new Repository('tasks');
const eventRepository = new Repository('events');
const clipboardRepository = new Repository('clipboard');
const projectRepository = new Repository('projects');
const fileRepository = new Repository('files');

// Calculate relevance score
function calculateScore(item: any, query: string, titleFields: string[], contentFields: string[]): number {
  let score = 0;
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/);
  
  const matchesTitle = titleFields.some(f => String(item[f] || '').toLowerCase().includes(q));
  const matchesContent = contentFields.some(f => String(item[f] || '').toLowerCase().includes(q));
  
  if (!matchesTitle && !matchesContent) return 0;

  for (const field of titleFields) {
    const val = String(item[field] || '').toLowerCase();
    if (!val) continue;
    if (val === q) score += 100;
    else if (val.startsWith(q)) score += 50;
    else if (val.includes(q)) score += 30;
    
    for (const token of tokens) {
      if (val.includes(token)) score += 10;
    }
  }

  for (const field of contentFields) {
    const val = String(item[field] || '').toLowerCase();
    if (!val) continue;
    if (val === q) score += 40;
    else if (val.includes(q)) score += 15;
    
    for (const token of tokens) {
      if (val.includes(token)) score += 5;
    }
  }

  // Boost by recency
  const age = Date.now() - (item.updatedAt || Date.now());
  const daysOld = age / (1000 * 60 * 60 * 24);
  score += Math.max(0, 10 - daysOld);

  return score;
}

export async function performUniversalSearch(query: string): Promise<Record<SearchResultType, SearchResult[]>> {
  if (!query.trim()) {
    return {
      notes: [],
      tasks: [],
      events: [],
      projects: [],
      clipboard: [],
      bookmarks: [],
      files: [],
      drive: [],
    };
  }

  // Fetch all items to score them locally
  const [allNotes, allTasks, allEvents, allClipboard, allProjects, allFiles] = await Promise.all([
    noteRepository.list(),
    taskRepository.list(),
    eventRepository.list(),
    clipboardRepository.list(),
    projectRepository.list(),
    fileRepository.list(),
  ]);

  const scoreAndFilter = (items: any[], titleFields: string[], contentFields: string[], limit: number = 5) => {
    return items
      .map(item => ({ item, score: calculateScore(item, query, titleFields, contentFields) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.item);
  };

  const notes = scoreAndFilter(allNotes, ['title'], ['content', 'tags']);
  const tasks = scoreAndFilter(allTasks, ['title'], ['notes', 'tags']);
  const events = scoreAndFilter(allEvents, ['title'], ['description', 'location']);
  const clipboardItems = scoreAndFilter(allClipboard, [], ['content', 'source']);
  const projects = scoreAndFilter(allProjects, ['name'], ['description']);
  const files = scoreAndFilter(allFiles, ['filename'], ['mimeType']);

  let driveFiles: any[] = [];
  if (isGoogleAuthed()) {
    try {
      driveFiles = await searchDriveFiles(query);
      // Limit to 5
      driveFiles = driveFiles.slice(0, 5);
    } catch (e) {
      console.warn("Drive search failed", e);
    }
  }

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
      title: item[titleField] || (type === 'clipboard' ? ((item.contentType?.toUpperCase() || 'UNKNOWN') + ' Snippet') : 'Untitled'),
      snippet: (item[snippetField] || '').substring(0, 100).replace(/\n/g, ' ') + ((item[snippetField]?.length > 100) ? '...' : ''),
      updatedAt: item.updatedAt || new Date(item.modifiedTime || Date.now()).getTime(),
      url: type === 'drive' ? item.webViewLink : `${urlPrefix}${item.id}`
    }));
  };

  return {
    notes: mapToSearchResult(notes, 'notes', 'title', 'content', '/notes?id='),
    tasks: mapToSearchResult(tasks, 'tasks', 'title', 'notes', '/tasks?id='),
    events: mapToSearchResult(events, 'events', 'title', 'description', '/calendar?id='),
    projects: mapToSearchResult(projects, 'projects', 'name', 'description', '/projects/'),
    clipboard: mapToSearchResult(clipboardItems, 'clipboard', '', 'content', '/clipboard?id='),
    bookmarks: [],
    files: mapToSearchResult(files, 'files', 'filename', 'mimeType', '/files/'),
    drive: mapToSearchResult(driveFiles, 'drive', 'name', 'mimeType', ''),
  };
}
