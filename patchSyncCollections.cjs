const fs = require('fs');

let content = fs.readFileSync('src/services/sync.ts', 'utf8');

// The collections array occurs a few times
content = content.replace(
  /const collections: CollectionName\[\] = \['notes', 'tasks', 'events', 'clipboard', 'preferences', 'projects'\];/g,
  "const collections: CollectionName[] = ['notes', 'tasks', 'events', 'clipboard', 'preferences', 'projects', 'files', 'folders'];"
);
content = content.replace(
  /const collections: CollectionName\[\] = \['projects', 'notes', 'tasks', 'events', 'preferences', 'clipboard'\];/g,
  "const collections: CollectionName[] = ['projects', 'notes', 'tasks', 'events', 'preferences', 'clipboard', 'files', 'folders'];"
);
content = content.replace(
  /const collections: CollectionName\[\] = \['projects', 'notes', 'tasks', 'events', 'clipboard', 'preferences'\];/g,
  "const collections: CollectionName[] = ['projects', 'notes', 'tasks', 'events', 'clipboard', 'preferences', 'files', 'folders'];"
);

fs.writeFileSync('src/services/sync.ts', content, 'utf8');
