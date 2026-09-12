const fs = require('fs');

let content = fs.readFileSync('src/components/layout/BottomNav.tsx', 'utf8');

// Replace the MOBILE_NAV array
content = content.replace(
  /const MOBILE_NAV = \[[\s\S]*?\];/,
  `import { HardDrive, Key, ClipboardList } from 'lucide-react';
const MOBILE_NAV = [
  { name: 'Home', to: '/', icon: LayoutDashboard },
  { name: 'Projects', to: '/projects', icon: FolderKanban },
  { name: 'Notes', to: '/notes', icon: FileText },
  { name: 'Tasks', to: '/tasks', icon: CheckSquare },
  { name: 'Calendar', to: '/calendar', icon: Calendar },
  { name: 'Files', to: '/files', icon: HardDrive },
  { name: 'Vault', to: '/passwords', icon: Key },
  { name: 'Clipboard', to: '/clipboard', icon: ClipboardList },
  { name: 'Search', to: '/search', icon: Search },
];`
);

// We need to fix the imports since we added HardDrive, Key, ClipboardList manually in the replace block above
// Wait, the import { LayoutDashboard... } is already there, let's just replace the whole file.
