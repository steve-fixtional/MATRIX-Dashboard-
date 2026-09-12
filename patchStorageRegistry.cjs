const fs = require('fs');
let content = fs.readFileSync('src/services/storage/storageRegistry.ts', 'utf8');

content = content.replace(
  /getRegisteredProviderTypes\(\): string\[\] \{/,
  `getAllProviders(): IStorageProvider[] {
    return Array.from(this.providers.values());
  }
  getRegisteredProviderTypes(): string[] {`
);

content += `\nexport function getAllStorageProviders(): IStorageProvider[] {\n  return storageRegistry.getAllProviders();\n}\n`;

fs.writeFileSync('src/services/storage/storageRegistry.ts', content, 'utf8');
