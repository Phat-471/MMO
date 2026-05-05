import { chromium, type Browser } from "playwright";

export type PageProbe = {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  contentLength: number;
};

export async function withOptionalBrowser<T>(task: (browser: Browser | null) => Promise<T>): Promise<T> {
  if (process.env.ENABLE_PLAYWRIGHT !== "1") {
    return task(null);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    return await task(browser);
  } finally {
    await browser.close();
  }
}

export async function probePage(browser: Browser | null, requestedUrl: string): Promise<PageProbe | null> {
  if (!browser) {
    return null;
  }

  const page = await browser.newPage();
  try {
    await page.goto(requestedUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    const [title, content] = await Promise.all([page.title(), page.content()]);
    return {
      requestedUrl,
      finalUrl: page.url(),
      title,
      contentLength: content.length
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}
