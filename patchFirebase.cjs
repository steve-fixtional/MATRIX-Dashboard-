const fs = require('fs');
let content = fs.readFileSync('src/services/firebase.ts', 'utf8');

if (!content.includes('getStorage')) {
  content = content.replace(
    /import \{ getFirestore \} from 'firebase\/firestore';/,
    "import { getFirestore } from 'firebase/firestore';\nimport { getStorage } from 'firebase/storage';"
  );
  content += "\nexport const storage = getStorage(app);";
  fs.writeFileSync('src/services/firebase.ts', content, 'utf8');
}
