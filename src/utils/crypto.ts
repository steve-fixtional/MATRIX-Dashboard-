export async function calculateFileHash(blob: Blob): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback for environments without crypto.subtle (e.g. non-HTTPS, tests)
    return `${blob.size}-${blob.type}`;
  }
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.warn('Failed to calculate hash', e);
    return `${blob.size}-${blob.type}`;
  }
}
