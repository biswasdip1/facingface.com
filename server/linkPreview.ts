import * as cheerio from "cheerio";

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

/**
 * Fetches a URL and extracts Open Graph / Twitter Card / fallback metadata.
 * Returns null if the URL is unreachable or not an HTML page.
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FacingFaceBot/1.0; +https://facingface.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const og = (prop: string) =>
      $(`meta[property="og:${prop}"]`).attr("content") ??
      $(`meta[name="og:${prop}"]`).attr("content") ??
      null;

    const twitter = (name: string) =>
      $(`meta[name="twitter:${name}"]`).attr("content") ?? null;

    const title =
      og("title") ??
      twitter("title") ??
      $("title").first().text().trim() ??
      null;

    const description =
      og("description") ??
      twitter("description") ??
      $('meta[name="description"]').attr("content") ??
      null;

    let image =
      og("image") ??
      og("image:url") ??
      twitter("image") ??
      null;

    // Resolve relative image URLs
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, url).href;
      } catch {
        image = null;
      }
    }

    const siteName =
      og("site_name") ??
      new URL(url).hostname.replace(/^www\./, "") ??
      null;

    return {
      url,
      title: title?.slice(0, 200) ?? null,
      description: description?.slice(0, 500) ?? null,
      image,
      siteName: siteName?.slice(0, 100) ?? null,
    };
  } catch {
    return null;
  }
}

/** Extracts the first URL found in a block of text. */
export function extractFirstUrl(text: string): string | null {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}


/**
 * Detects if a URL is a YouTube video URL.
 * Supports: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a YouTube domain
    if (!hostname.includes("youtube.com") && !hostname.includes("youtu.be")) {
      return false;
    }
    
    // Extract video ID
    let videoId: string | null = null;
    
    if (hostname.includes("youtu.be")) {
      // youtu.be/videoId format
      videoId = urlObj.pathname.slice(1).split("?")[0];
    } else if (urlObj.pathname.includes("/embed/")) {
      // youtube.com/embed/videoId format
      videoId = urlObj.pathname.split("/embed/")[1]?.split("?")[0];
    } else if (urlObj.pathname.includes("/shorts/")) {
      // youtube.com/shorts/videoId format
      videoId = urlObj.pathname.split("/shorts/")[1]?.split("?")[0];
    } else if (urlObj.searchParams.has("v")) {
      // youtube.com/watch?v=videoId format
      videoId = urlObj.searchParams.get("v");
    }
    
    return !!videoId && videoId.length > 0;
  } catch {
    return false;
  }
}

/**
 * Extracts the video ID from a YouTube URL.
 * Returns null if the URL is not a valid YouTube URL.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (!hostname.includes("youtube.com") && !hostname.includes("youtu.be")) {
      return null;
    }
    
    if (hostname.includes("youtu.be")) {
      const videoId = urlObj.pathname.slice(1).split("?")[0];
      return videoId && videoId.length > 0 ? videoId : null;
    } else if (urlObj.pathname.includes("/embed/")) {
      const videoId = urlObj.pathname.split("/embed/")[1]?.split("?")[0];
      return videoId && videoId.length > 0 ? videoId : null;
    } else if (urlObj.pathname.includes("/shorts/")) {
      const videoId = urlObj.pathname.split("/shorts/")[1]?.split("?")[0];
      return videoId && videoId.length > 0 ? videoId : null;
    } else if (urlObj.searchParams.has("v")) {
      const videoId = urlObj.searchParams.get("v");
      return videoId && videoId.length > 0 ? videoId : null;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Counts the number of YouTube URLs in a text string.
 */
export function countYouTubeUrls(text: string): number {
  if (!text) return 0;
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const urls = text.match(urlRegex) || [];
  return urls.filter(isYouTubeUrl).length;
}

/**
 * Extracts all YouTube URLs from a text string.
 */
export function extractYouTubeUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const urls = text.match(urlRegex) || [];
  return urls.filter(isYouTubeUrl);
}

/**
 * Generates a YouTube thumbnail URL from a video ID.
 * Returns the maxresdefault (1280x720) thumbnail.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  if (!videoId || videoId.length === 0) return "";
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
