const fs = require('fs');

let content = fs.readFileSync('src/services/storage/fileSyncEngine.ts', 'utf8');

// Remove the `export const fileSyncEngine = new FileSyncEngine();` line wherever it is
content = content.replace(/export const fileSyncEngine = new FileSyncEngine\(\);\n?/g, '');

// The end of the file currently is:
//     }
//   }
// (from the end of resolveConflict)

// we need to make sure resolveConflict is INSIDE the class block.
// Wait! If the class block closed BEFORE resolveConflict, then we have a `}` above `public async resolveConflict`...

const parts = content.split('public async resolveConflict');
if (parts.length > 1) {
  // parts[0] is everything before resolveConflict
  // There should be a closing brace for the class at the end of parts[0].
  
  const before = parts[0];
  const lastBraceIndex = before.lastIndexOf('}');
  
  if (lastBraceIndex !== -1) {
    const start = before.substring(0, lastBraceIndex);
    const end = before.substring(lastBraceIndex + 1); // should just be whitespace
    
    content = start + end + '  public async resolveConflict' + parts[1] + '\n}\n\nexport const fileSyncEngine = new FileSyncEngine();\n';
  }
}

fs.writeFileSync('src/services/storage/fileSyncEngine.ts', content, 'utf8');
