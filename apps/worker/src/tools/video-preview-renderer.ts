import { existsSync } from "fs";
import { mkdir, writeFile, readdir } from "fs/promises";
import os from "os";
import path from "path";
import { chromium } from "playwright";

export type VideoPreviewRenderInput = {
  title: string;
  productTitle: string;
  productUrl: string;
  affiliateLink: string;
  hook: string;
  script: string;
  subtitleText: string;
  voiceoverText: string;
  sourceType: string;
  templateId: string;
  durationSeconds: number;
  musicTrack: string;
  steps: string[];
  imageUrls: string[];
  sourceUrl: string;
};

export type VideoPreviewRenderResult = {
  status: "RENDERED" | "SKIPPED";
  engine: string;
  format: "webm";
  previewHtmlPath: string;
  artifactPath?: string;
  artifactUrl?: string;
  message?: string;
};

function resolveChromeExecutablePath() {
  const envPath = process.env.CHROME_BIN || process.env.CHROMIUM_PATH;
  const candidates = [
    envPath,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildHtml(input: VideoPreviewRenderInput) {
  const stepItems = input.steps
    .map(
      (step, index) => `
        <div class="step${index === 0 ? " active" : ""}" data-step="${index}">
          <div class="step-index">${String(index + 1).padStart(2, "0")}</div>
          <div class="step-text">${step}</div>
        </div>
      `
    )
    .join("");

  const imageItems = input.imageUrls.length > 0
    ? input.imageUrls
        .slice(0, 4)
        .map((url) => `<div class="thumb" style="background-image:url('${url}')"></div>`)
        .join("")
    : `<div class="thumb placeholder">Không có ảnh sản phẩm</div>`;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #060816;
      --panel: rgba(16, 18, 32, 0.95);
      --border: rgba(148, 163, 184, 0.18);
      --text: #f5f7ff;
      --muted: #a8b2d1;
      --accent: #8b5cf6;
      --accent-2: #22d3ee;
    }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(139, 92, 246, 0.24), transparent 30%),
        radial-gradient(circle at bottom right, rgba(34, 211, 238, 0.18), transparent 26%),
        linear-gradient(180deg, #050816, #090d1d 55%, #04060f);
      color: var(--text);
      overflow: hidden;
    }
    .frame {
      width: 1080px;
      height: 1920px;
      padding: 44px;
      position: relative;
    }
    .glass {
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: 0 30px 80px rgba(0,0,0,0.35);
      backdrop-filter: blur(18px);
    }
    .hero {
      border-radius: 30px;
      padding: 34px;
      min-height: 560px;
      display: grid;
      gap: 22px;
      grid-template-columns: 1.15fr 0.85fr;
      position: relative;
      overflow: hidden;
    }
    .hero::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(120deg, rgba(139, 92, 246, 0.08), transparent 40%, rgba(34, 211, 238, 0.06));
      pointer-events: none;
    }
    .title {
      font-size: 56px;
      line-height: 1.04;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.03em;
    }
    .subtitle {
      color: var(--muted);
      font-size: 24px;
      line-height: 1.45;
      margin-top: 18px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 999px;
      border: 1px solid rgba(139, 92, 246, 0.35);
      background: rgba(139, 92, 246, 0.12);
      color: #e9d5ff;
      font-size: 18px;
      font-weight: 700;
    }
    .info {
      display: grid;
      gap: 14px;
      margin-top: 24px;
    }
    .chip {
      padding: 14px 18px;
      border-radius: 18px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
      color: var(--muted);
      font-size: 18px;
    }
    .preview {
      border-radius: 24px;
      padding: 22px;
      display: grid;
      gap: 16px;
      align-content: start;
    }
    .product-card {
      border-radius: 24px;
      padding: 18px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border);
    }
    .thumb-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .thumb {
      aspect-ratio: 1 / 1;
      border-radius: 18px;
      border: 1px solid var(--border);
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.24), rgba(34, 211, 238, 0.2));
      background-size: cover;
      background-position: center;
      display: grid;
      place-items: center;
      color: rgba(255,255,255,0.7);
      font-size: 14px;
      text-align: center;
      padding: 12px;
    }
    .placeholder {
      grid-column: 1 / -1;
      min-height: 180px;
    }
    .product-title {
      margin-top: 16px;
      font-size: 24px;
      font-weight: 800;
      line-height: 1.25;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
      color: var(--muted);
      font-size: 18px;
    }
    .timeline {
      border-radius: 24px;
      padding: 22px;
      display: grid;
      gap: 14px;
    }
    .step {
      display: grid;
      grid-template-columns: 56px 1fr;
      gap: 14px;
      align-items: start;
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
      opacity: 0.58;
      transform: translateY(8px);
      transition: 280ms ease;
    }
    .step.active {
      opacity: 1;
      border-color: rgba(139, 92, 246, 0.55);
      box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.12) inset;
      transform: translateY(0);
      background: rgba(139, 92, 246, 0.12);
    }
    .step-index {
      font-size: 18px;
      font-weight: 800;
      color: #ddd6fe;
    }
    .step-text {
      color: var(--text);
      font-size: 18px;
      line-height: 1.35;
    }
    .footer {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .footer-card {
      border-radius: 20px;
      padding: 16px 18px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
      color: var(--muted);
      font-size: 16px;
      line-height: 1.45;
    }
    .ticker {
      position: absolute;
      left: 44px;
      right: 44px;
      bottom: 36px;
      border-radius: 999px;
      padding: 16px 22px;
      background: linear-gradient(90deg, rgba(139, 92, 246, 0.18), rgba(34, 211, 238, 0.18));
      border: 1px solid rgba(255,255,255,0.12);
      color: #f8fafc;
      font-size: 18px;
      font-weight: 700;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    .badge { animation: pulse 3s ease-in-out infinite; }
  </style>
</head>
<body>
  <div class="frame">
    <section class="hero glass">
      <div>
        <span class="badge">Shopee Aff Video Pipeline</span>
        <h1 class="title">${input.title}</h1>
        <div class="subtitle">${input.hook}</div>
        <div class="info">
          <div class="chip">Source: ${input.sourceType} | Template: ${input.templateId} | Duration: ${input.durationSeconds}s</div>
          <div class="chip">Product: ${input.productTitle}</div>
          <div class="chip">Affiliate: ${input.affiliateLink}</div>
        </div>
      </div>
      <div class="preview glass">
        <div class="product-card">
          <div class="thumb-grid">${imageItems}</div>
          <div class="product-title">${input.productTitle}</div>
          <div class="row"><span>CTA</span><span>${input.subtitleText}</span></div>
          <div class="row"><span>Voiceover</span><span>${input.voiceoverText}</span></div>
        </div>
      </div>
    </section>

    <section class="timeline glass" style="margin-top: 24px;">
      ${stepItems}
      <div class="footer">
        <div class="footer-card">Script: ${input.script}</div>
        <div class="footer-card">Music: ${input.musicTrack}</div>
      </div>
    </section>

    <div class="ticker">${input.productUrl}</div>
  </div>

  <script>
    const steps = Array.from(document.querySelectorAll(".step"));
    let active = 0;
    const advance = () => {
      steps.forEach((step, index) => step.classList.toggle("active", index === active));
      active = (active + 1) % steps.length;
    };
    advance();
    setInterval(advance, Math.max(1000, Math.floor(${Math.max(6, input.durationSeconds)} * 1000 / Math.max(1, steps.length))));
  </script>
</body>
</html>`;
}

export async function renderVideoPreview(input: VideoPreviewRenderInput): Promise<VideoPreviewRenderResult> {
  const chromePath = resolveChromeExecutablePath();
  const outputDir = path.join(process.cwd(), ".render-artifacts", "shopee-aff");
  const previewDir = path.join(outputDir, "preview");
  await mkdir(previewDir, { recursive: true });

  const previewHtmlPath = path.join(outputDir, `${Date.now()}-preview.html`);
  await writeFile(previewHtmlPath, buildHtml(input), "utf8");

  if (!chromePath) {
    return {
      status: "SKIPPED",
      engine: "playwright",
      format: "webm",
      previewHtmlPath,
      message: "Khong tim thay Chrome de record video."
    };
  }

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--disable-gpu", "--no-sandbox"]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1080, height: 1920 },
      recordVideo: {
        dir: previewDir,
        size: { width: 1080, height: 1920 }
      }
    });
    const page = await context.newPage();
    await page.setContent(buildHtml(input), { waitUntil: "load" });
    await page.waitForTimeout(Math.max(6000, input.durationSeconds * 1000));
    const video = page.video();
    await context.close();

    const videoPath = video ? await video.path() : null;
    const absoluteVideoPath = videoPath ? path.resolve(videoPath) : null;
    return {
      status: absoluteVideoPath ? "RENDERED" : "SKIPPED",
      engine: "playwright-chrome-record-video",
      format: "webm",
      previewHtmlPath,
      artifactPath: absoluteVideoPath ?? undefined,
      artifactUrl: absoluteVideoPath ? `file:///${absoluteVideoPath.replace(/\\/g, "/")}` : undefined,
      message: absoluteVideoPath ? "Da render video preview." : "Khong lay duoc video artifact."
    };
  } finally {
    await browser.close().catch(() => null);
  }
}
