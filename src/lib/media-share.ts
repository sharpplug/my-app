/**
 * Download/share helpers for Vibes and Story media. Works the same way
 * regardless of anything else in the app (ad tier, account type, etc.) -
 * there's no gating here, "downloadable on all tiers" just means this is
 * always available.
 *
 * Camera photos, AI-generated media, and most uploads in this app are
 * already `data:` URIs, so downloading them is a same-bytes, no-recompress
 * save (the browser writes the data URI's bytes directly - "same quality"
 * as the original). Cross-origin URLs (e.g. the picsum.photos placeholders
 * used by mock content) are fetched and downloaded as a blob when the host
 * allows it, falling back to opening the image in a new tab otherwise.
 */

function filenameForMime(mime: string, base: string): string {
  const ext = mime.split("/")[1]?.split("+")[0] || "jpg";
  return `${base}.${ext}`;
}

export async function downloadMedia(url: string, baseFilename: string): Promise<void> {
  if (url.startsWith("data:")) {
    const mime = url.slice(5, url.indexOf(";"));
    const a = document.createElement("a");
    a.href = url;
    a.download = filenameForMime(mime, baseFilename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filenameForMime(blob.type, baseFilename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

export type ShareResult = "shared" | "copied" | "cancelled" | "unsupported";

/** Shares to outside apps via the Web Share API (with the actual media
 * file attached when the platform supports it), falling back to copying a
 * link/caption to the clipboard when Web Share isn't available. */
export async function shareMedia(url: string, title: string, text?: string): Promise<ShareResult> {
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };

  if (nav.share) {
    try {
      if (url.startsWith("data:") || nav.canShare) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const file = new File([blob], filenameForMime(blob.type, "moood-share"), { type: blob.type });
          if (nav.canShare?.({ files: [file] })) {
            await nav.share({ files: [file], title, text });
            return "shared";
          }
        } catch {
          // fall through to link-based share below
        }
      }
      await nav.share({ title, text, url: url.startsWith("data:") ? undefined : url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // fall through to clipboard fallback
    }
  }

  try {
    await navigator.clipboard.writeText(url.startsWith("data:") ? text || title : url);
    return "copied";
  } catch {
    return "unsupported";
  }
}
