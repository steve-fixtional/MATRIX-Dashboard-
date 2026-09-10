import { CommandItem, CommandGroup } from './commandTypes';

const STATIC_COMMANDS: CommandItem[] = [
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
    c.id.replace('settings-', '').includes(q)
  ).map(c => ({
    ...c,
    onSelect: () => navigate(c.id === 'settings' ? '/settings' : `/settings/${c.id.replace('settings-', '')}`)
  }));

  if (actions.length === 0) return [];
  
  return [{
    category: 'Actions',
    categoryId: 'actions',
    commands: actions
  }];
}
