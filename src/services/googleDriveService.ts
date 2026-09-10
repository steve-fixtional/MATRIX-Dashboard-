import { getAccessToken, isGoogleAuthed, notifyAuthChange } from './googleCalendarService';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export async function searchDriveFiles(query: string = ''): Promise<DriveFile[]> {
  if (!isGoogleAuthed()) throw new Error('Not authenticated with Google');

  // Ensure we have a token
  const token = window.gapi?.client?.getToken()?.access_token;
  if (!token) throw new Error('Missing access token');

  try {
    let q = "trashed = false";
    if (query) {
      q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,iconLink,thumbnailLink,webViewLink,modifiedTime)&pageSize=20&orderBy=modifiedTime desc`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      notifyAuthChange(false);
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`Drive API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (err) {
    console.error('Error fetching Google Drive files:', err);
    throw err;
  }
}

export async function getDriveFilesByIds(fileIds: string[]): Promise<DriveFile[]> {
  if (!isGoogleAuthed() || !fileIds || fileIds.length === 0) return [];

  const token = window.gapi?.client?.getToken()?.access_token;
  if (!token) return [];

  try {
    // Drive API doesn't have a bulk get, so we use a query to fetch them
    const q = fileIds.map(id => `'${id}' in parents or id = '${id}'`).join(' or ');
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,iconLink,thumbnailLink,webViewLink,modifiedTime)`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      notifyAuthChange(false);
      return [];
    }

    if (!response.ok) return [];

    const data = await response.json();
    
    // Filter out exactly the ones we asked for (the query might over-fetch if we did parents)
    const fetchedFiles = (data.files || []) as DriveFile[];
    return fetchedFiles.filter(f => fileIds.includes(f.id));
  } catch (err) {
    console.error('Error fetching specific Drive files:', err);
    return [];
  }
}
