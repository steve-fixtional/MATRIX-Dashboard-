const fs = require('fs');

let content = fs.readFileSync('firestore.rules', 'utf8');

// Insert File and Folder entities
const fileFolderSchema = `
    "MatrixFolder": {
      "title": "MatrixFolder",
      "type": "object",
      "properties": {
        "name": { "type": "string", "maxLength": 200 },
        "parentFolderId": { "type": ["string", "null"] },
        "color": { "type": ["string", "null"] },
        "favorite": { "type": "boolean" },
        "createdAt": { "type": "number" },
        "updatedAt": { "type": "number" },
        "deletedAt": { "type": ["number", "null"] },
        "version": { "type": "number" }
      },
      "required": ["name", "createdAt", "updatedAt", "version"]
    },
    "MatrixFile": {
      "title": "MatrixFile",
      "type": "object",
      "properties": {
        "name": { "type": "string", "maxLength": 200 },
        "type": { "type": "string" },
        "size": { "type": "number" },
        "parentFolderId": { "type": ["string", "null"] },
        "storageProvider": { "type": "string" },
        "storageReference": { "type": ["string", "null"] },
        "storagePath": { "type": ["string", "null"] },
        "externalUrl": { "type": ["string", "null"] },
        "mimeType": { "type": ["string", "null"] },
        "favorite": { "type": "boolean" },
        "tags": { "type": "array" },
        "relatedEntityIds": { "type": "array" },
        "thumbnails": { "type": ["object", "null"] },
        "createdAt": { "type": "number" },
        "updatedAt": { "type": "number" },
        "deletedAt": { "type": ["number", "null"] },
        "version": { "type": "number" }
      },
      "required": ["name", "type", "size", "storageProvider", "createdAt", "updatedAt", "version"]
    },`;

content = content.replace(/"Project": \{/, fileFolderSchema + '\n    "Project": {');

// Insert endpoints
const fileFolderMatch = `
      match /folders/{folderId} {
        allow read: if isSignedIn() && request.auth.uid == userId;
        allow create, update, delete: if isSignedIn() && request.auth.uid == userId;
      }
      match /files/{fileId} {
        allow read: if isSignedIn() && request.auth.uid == userId;
        allow create, update, delete: if isSignedIn() && request.auth.uid == userId;
      }`;

content = content.replace(/match \/vault_meta\/\{metaId\} \{/, fileFolderMatch + '\n      match /vault_meta/{metaId} {');

fs.writeFileSync('firestore.rules', content, 'utf8');
