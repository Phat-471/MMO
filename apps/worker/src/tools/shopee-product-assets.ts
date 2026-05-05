export type ShopeeProductAssets = {
  title: string;
  description: string;
  imageUrls: string[];
  canonicalUrl: string;
};

function extractMeta(html: string, keys: string[]) {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function extractMetaImages(html: string) {
  const urls = new Set<string>();
  const pattern = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src|image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    const value = match[1]?.trim();
    if (value) {
      urls.add(value);
    }
  }

  return Array.from(urls);
}

function resolveUrl(baseUrl: string, value: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export async function fetchShopeeProductAssets(productUrl: string, fallbackTitle: string): Promise<ShopeeProductAssets> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        title: fallbackTitle,
        description: "",
        imageUrls: [],
        canonicalUrl: productUrl
      };
    }

    const html = await response.text();
    const title =
      extractMeta(html, ["og:title", "twitter:title"]) ||
      (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? fallbackTitle);
    const description = extractMeta(html, ["og:description", "description", "twitter:description"]);
    const canonicalUrl = extractMeta(html, ["og:url"]) || productUrl;
    const imageUrls = extractMetaImages(html).map((value) => resolveUrl(productUrl, value));

    return {
      title: title || fallbackTitle,
      description,
      imageUrls,
      canonicalUrl
    };
  } catch {
    return {
      title: fallbackTitle,
      description: "",
      imageUrls: [],
      canonicalUrl: productUrl
    };
  } finally {
    clearTimeout(timer);
  }
}
