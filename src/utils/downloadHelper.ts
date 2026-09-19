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
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Download request failed with status: ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Revoke object URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 15000);
  } catch (err) {
    console.warn('[downloadFileFromUrl] Blob download failed, attempting window proxy:', err);
    
    // Direct link fallback
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
