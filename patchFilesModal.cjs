const fs = require('fs');

let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

if (!content.includes('FileConflictModal')) {
  content = content.replace(
    /import \{ FileDeleteModal \} from '\.\.\/components\/files\/FileDeleteModal';/,
    "import { FileDeleteModal } from '../components/files/FileDeleteModal';\nimport { FileConflictModal } from '../components/files/FileConflictModal';\nimport { fileSyncEngine } from '../services/storage/fileSyncEngine';"
  );

  content = content.replace(
    /const \[deleteFolderModalOpen, setDeleteFolderModalOpen\] = useState\(false\);/,
    "const [deleteFolderModalOpen, setDeleteFolderModalOpen] = useState(false);\n  const [conflictFile, setConflictFile] = useState<MatrixFile | null>(null);"
  );

  // Hook up click handler for files with conflict
  content = content.replace(
    /const handleOpenFile = async \(file: MatrixFile\) => \{/,
    `const handleOpenFile = async (file: MatrixFile) => {
    if (file.fileSyncState === 'conflict') {
      setConflictFile(file);
      return;
    }`
  );

  // Add the modal to JSX
  content = content.replace(
    /\{deleteFolderModalOpen && folderToDelete && \(/,
    `<FileConflictModal
        file={conflictFile}
        onClose={() => setConflictFile(null)}
        onResolve={async (file, resolution) => {
          setConflictFile(null);
          await fileSyncEngine.resolveConflict(file, resolution);
          loadData();
        }}
      />
      {deleteFolderModalOpen && folderToDelete && (`
  );

  fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
}
