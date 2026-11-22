export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  const rawText = await response.text();

  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const preview = rawText.replace(/\s+/g, ' ').trim().slice(0, 140);
      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status} (${response.statusText || 'Error'}): ${preview || 'Non-JSON response received.'}`
        );
      }
      throw new Error('Server returned an invalid JSON response.');
    }
  }

  if (!response.ok) {
    const errObj = parsed as { error?: string; message?: string } | null;
    throw new Error(
      errObj?.error ||
        errObj?.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return parsed as T;
}

/**
 * Downscales large uploaded photos/screenshots to <= 1280px max dimension
 * as JPEG (quality 0.85) so payloads stay well under serverless limits (4.5 MB)
 * and vision inference remains fast.
 */
export async function compressImageDataUrl(dataUrl: string, maxDim = 1280): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        resolve(dataUrl);
        return;
      }

      const scale = Math.min(1, maxDim / Math.max(w, h));
      const targetW = Math.max(1, Math.round(w * scale));
      const targetH = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
