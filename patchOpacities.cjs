const fs = require('fs');

function patchFile(path, patches) {
  let content = fs.readFileSync(path, 'utf8');
  for (const [regex, replacement] of patches) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(path, content, 'utf8');
}

patchFile('src/components/files/FileGridView.tsx', [
  [
    /<div className="hidden sm:block">/g,
    '<div className="hidden sm:block lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">'
  ],
  [
    /<div className="hidden sm:block opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">/g,
    '<div className="hidden sm:block lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">'
  ],
  [
    /opacity-0 group-hover:opacity-100/g,
    'lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100'
  ]
]);

patchFile('src/components/files/FileListView.tsx', [
  [
    /<div className="hidden sm:block">/g,
    '<div className="hidden sm:block lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">'
  ],
  [
    /<div className="hidden sm:block opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">/g,
    '<div className="hidden sm:block lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">'
  ],
  [
    /opacity-0 group-hover:opacity-100/g,
    'lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100'
  ]
]);
