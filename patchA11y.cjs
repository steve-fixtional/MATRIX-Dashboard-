const fs = require('fs');

function patchFile(path, patches) {
  let content = fs.readFileSync(path, 'utf8');
  for (const [regex, replacement] of patches) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(path, content, 'utf8');
}

// FileGridView.tsx
patchFile('src/components/files/FileGridView.tsx', [
  [
    /<button\s+type="button"\s+onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*onToggleFavorite\(file\);\s*\}\}/g,
    '<button\n                      aria-label={file.favorite ? "Remove from favorites" : "Add to favorites"}\n                      type="button"\n                      onClick={(e) => {\n                        e.stopPropagation();\n                        onToggleFavorite(file);\n                      }}'
  ],
  [
    /<button\s+type="button"\s+onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*onMobileOpenActions\(\{ \.\.\.file, isFolder: false \}\);\s*\}\}/g,
    '<button\n                        aria-label="More actions"\n                        type="button"\n                        onClick={(e) => {\n                          e.stopPropagation();\n                          onMobileOpenActions({ ...file, isFolder: false });\n                        }}'
  ],
  [
    /<button\s+type="button"\s+onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*onMobileOpenActions\(\{ type: 'folder', data: folder \}\);\s*\}\}/g,
    '<button\n                        aria-label="More actions"\n                        type="button"\n                        onClick={(e) => {\n                          e.stopPropagation();\n                          onMobileOpenActions({ type: \'folder\', data: folder });\n                        }}'
  ]
]);

// FileListView.tsx
patchFile('src/components/files/FileListView.tsx', [
  [
    /<button\s+type="button"\s+onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*onMobileOpenActions\(\{ \.\.\.file, isFolder: false \}\);\s*\}\}/g,
    '<button\n                      aria-label="More actions"\n                      type="button"\n                      onClick={(e) => {\n                        e.stopPropagation();\n                        onMobileOpenActions({ ...file, isFolder: false });\n                      }}'
  ],
  [
    /<button\s+type="button"\s+onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*onMobileOpenActions\(\{ type: 'folder', data: folder \}\);\s*\}\}/g,
    '<button\n                  aria-label="More actions"\n                  type="button"\n                  onClick={(e) => {\n                    e.stopPropagation();\n                    onMobileOpenActions({ type: \'folder\', data: folder });\n                  }}'
  ]
]);

