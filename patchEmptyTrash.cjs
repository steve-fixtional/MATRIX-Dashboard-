const fs = require('fs');
let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

content = content.replace(
  /<FileNewMenu/,
  `{activeFilter === 'trash' && (
              <Button onClick={handleEmptyTrash} variant="danger" className="mr-2">
                Empty Trash
              </Button>
            )}
            <FileNewMenu`
);

fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
