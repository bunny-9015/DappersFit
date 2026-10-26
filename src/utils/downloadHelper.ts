/**
 * Helper utility to reliably download files (PDFs, HTML, etc.) in browser environments,
 * including inside sandboxed iframes and cross-origin standard scenarios.
 */
export async function downloadFileFromUrl(url: string, filename: string): Promise<void> {
  let targetUrl = url;
  
  // If it is an external remote URL (like Shiprocket CDN), proxy it through our backend to bypass browser CORS & iframe policies
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (typeof window !== 'undefined' && !url.startsWith(window.location.origin)) {
      targetUrl = `/api/shiprocket/download-live-pdf?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    }
  } else if (url.startsWith('/') && typeof window !== 'undefined') {
    targetUrl = `${window.location.origin}${url}`;
  }

  try {
    // 35-second timeout: slightly longer than the server-side 30s proxy timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    let response: Response;
    try {
      response = await fetch(targetUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Download request failed with status: ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Revoke object URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 15000);
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
    if (isTimeout) {
      console.warn('[downloadFileFromUrl] Download timed out. Label URL may have expired:', targetUrl);
      throw new Error('Label download timed out. The PDF URL may have expired — click the label button in the order row to regenerate it.');
    }

    console.warn('[downloadFileFromUrl] Blob download failed, attempting window proxy:', err);
    
    // Direct link fallback
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = targetUrl;
    a.target = '_blank';
    a.download = filename;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
