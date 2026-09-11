import { CommandItem, CommandGroup } from './commandTypes';

const STATIC_COMMANDS: CommandItem[] = [
  { id: 'action-create-note', title: 'Create Note', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'action-create-task', title: 'New Task', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'action-create-event', title: 'Schedule Event', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'action-create-project', title: 'Create Project', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings', title: 'Settings', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings-account', title: 'Account Settings', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings-appearance', title: 'Appearance Settings (Theme)', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings-dashboard', title: 'Dashboard Settings', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings-calendar', title: 'Calendar Settings', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings-weather', title: 'Weather Settings (Celsius/Fahrenheit)', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings-sync', title: 'Sync & Data Settings', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings-integrations', title: 'Integrations', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings-security', title: 'Security & Privacy', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
  { id: 'settings-about', title: 'About MATRIX', category: 'Actions', categoryId: 'actions', type: 'action', onSelect: () => {} },
];

export function getStaticCommands(query: string, navigate: (path: string) => void): CommandGroup[] {
  if (!query.trim()) return [];
  
  const q = query.toLowerCase();
  
  // Attach navigations dynamically to avoid closure staleness issues if not careful, though here we recreate it
  const actions = STATIC_COMMANDS.filter(c => 
    c.title.toLowerCase().includes(q) || 
    c.id.replace('settings-', '').replace('action-create-', '').includes(q)
  ).map(c => {
    let path = '/';
    if (c.id === 'settings') path = '/settings';
    else if (c.id.startsWith('settings-')) path = `/settings/${c.id.replace('settings-', '')}`;
    else if (c.id === 'action-create-note') path = '/notes?new=true';
    else if (c.id === 'action-create-task') path = '/tasks?new=true';
    else if (c.id === 'action-create-event') path = '/calendar?new=true';
    else if (c.id === 'action-create-project') path = '/projects?new=true';

    return {
      ...c,
      onSelect: () => navigate(path)
    };
  });

  if (actions.length === 0) return [];
  
  return [{
    category: 'Actions',
    categoryId: 'actions',
    commands: actions
  }];
}
