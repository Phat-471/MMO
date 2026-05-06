"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { apiRequest, syncSessionProfile } from "../../lib/api";
import { buildScheduleCronFromPreset, formatSchedulePreset, type SchedulePreset } from "../../lib/content-calendar";
import { formatJobMode, formatJobStatus, formatJobType } from "../../lib/labels";
import { resolveToolContract, type ToolContract } from "@mmo/shared";
import { getSocket, joinWorkspace, leaveWorkspace } from "../../lib/socket";

type ShopeeJobType = "SHOPEE_VIDEO_AFF" | "SHOPEE_LINK_CONVERT" | "SHOPEE_TRENDING";
type TabKey = "guide" | "config" | "created" | "overview" | "detail" | "assets";
type JobModeValue = "once" | "scheduled" | "recurring";
type SchedulePresetValue = SchedulePreset | "custom";
type VideoSourceType = "video" | "images" | "mixed" | "template";
type MediaAssetType = "IMAGE" | "VIDEO" | "AUDIO" | "TEMPLATE";

type JobLog = {
  id: string;
  level: string;
  message: string;
  payloadJson: string | null;
  createdAt: string;
};

type JobRun = {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  metricsJson: string | null;
  createdAt: string;
  logs?: JobLog[];
};

type PeriodBucket = {
  label: string;
  runs: number;
  success: number;
  failed: number;
  running: number;
  queued: number;
  successRate: number;
};

type JobDetail = {
  id: string;
  workspaceId: string;
  platform: string;
  jobType: string;
  mode: string;
  status: string;
  scheduleCron: string | null;
  optionsJson: string;
  accountId: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  runs: JobRun[];
};

type ShopeeConfigForm = {
  title: string;
  jobType: ShopeeJobType;
  mode: JobModeValue;
  schedulePreset: SchedulePresetValue;
  scheduleCron: string;
  productTitle: string;
  productNameQuery: string;
  productUrl: string;
  sourceType: VideoSourceType;
  sourceUrl: string;
  imageUrls: string;
  approvedAssetUrls: string;
  assetPolicy: "approved_only" | "product_page_only" | "mixed";
  templateId: string;
  durationSeconds: string;
  musicTrack: string;
  voiceoverText: string;
  subtitleText: string;
  productUrls: string;
  affiliateId: string;
  subId: string;
  hook: string;
  script: string;
  note: string;
};

type MediaAsset = {
  id: string;
  workspaceId: string;
  label: string;
  assetType: MediaAssetType;
  sourceUrl: string;
  thumbnailUrl: string | null;
  approved: boolean;
  tagsJson: string;
  metadataJson: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  metadata?: Record<string, any>;
};

type MediaAssetForm = {
  label: string;
  assetType: MediaAssetType;
  sourceUrl: string;
  thumbnailUrl: string;
  approved: boolean;
  tags: string;
  metadataJson: string;
};

type RuntimeSystemStatus = {
  database: {
    status: string;
    latencyMs: number | null;
    error: string | null;
  };
  queue: {
    status: string;
    queueName: string;
    counts: {
      waiting: number;
      active: number;
      delayed: number;
      completed: number;
      failed: number;
      paused: number;
    };
    error?: string;
  };
  latencyMs: number;
};

const SHOPEE_JOB_TYPES: ShopeeJobType[] = ["SHOPEE_VIDEO_AFF", "SHOPEE_LINK_CONVERT", "SHOPEE_TRENDING"];
const SHOPEE_TEST_PRODUCT = {
  title: "Quạt Cầm Tay Mini Tốc Độ Cao 100 Mức Gió Màn Hình Led Hiển Thị, Quạt Tích Điện Pin Dung Lượng Lớn",
  productUrl: "https://shopee.vn/product/841091795/40656929708",
  affiliateLink: "https://s.shopee.vn/6pxHMzEEMK",
  sourceUrl:
    "https://sv.shopee.vn/share-video/ZcZ8r5DDCADnqVAUAAAAAA==?c=share_web&contentType=0&fromShareLink=share-marker&fromSource=copy_link&jumpType=share&myVideo=false&pid=sv&shareUserId=69941955&share_obj=video&smtt=0.0.9"
};

const SAMPLE_ASSET_IMPORT = [
  `Quat mini demo video,${SHOPEE_TEST_PRODUCT.sourceUrl},VIDEO,quat-mini|demo|shopee-video`,
  "Quat mini anh bia,https://example.com/quat-mini-cover.jpg,IMAGE,quat-mini|cover",
  "Nhac nen review nhanh,https://example.com/audio/review-fast.mp3,AUDIO,background|review"
].join("\n");

const GUIDE_REQUIREMENTS = [
  "API và Web đang chạy đúng port local.",
  "Redis đang chạy khi muốn Run qua queue thật.",
  "Worker đang online để xử lý JobRun và ghi log/metrics.",
  "Chrome/Chromium có sẵn trên máy render video preview.",
  "Asset video/ảnh cần là link có thể truy cập công khai hoặc từ VPS/CDN nội bộ."
];

function isShopeeJobType(value: string): value is ShopeeJobType {
  return SHOPEE_JOB_TYPES.includes(value as ShopeeJobType);
}

function createDefaultForm(jobType: ShopeeJobType = "SHOPEE_VIDEO_AFF"): ShopeeConfigForm {
  switch (jobType) {
    case "SHOPEE_LINK_CONVERT":
      return {
        title: "Shopee link convert",
        jobType,
        mode: "once",
        schedulePreset: "immediate",
        scheduleCron: "",
        productTitle: "",
        productNameQuery: "",
        productUrl: "",
        sourceType: "template",
        sourceUrl: "",
        imageUrls: "",
        approvedAssetUrls: "",
        assetPolicy: "mixed",
        templateId: "",
        durationSeconds: "",
        musicTrack: "",
        voiceoverText: "",
        subtitleText: "",
        productUrls: "https://shopee.vn/product/seed-01\nhttps://shopee.vn/product/seed-02",
        affiliateId: "AFF-001",
        subId: "admin",
        hook: "",
        script: "",
        note: ""
      };
    case "SHOPEE_TRENDING":
      return {
        title: "Shopee trending discovery",
        jobType,
        mode: "once",
        schedulePreset: "immediate",
        scheduleCron: "",
        productTitle: "",
        productNameQuery: "",
        productUrl: "https://shopee.vn/product/seed-01",
        sourceType: "template",
        sourceUrl: "",
        imageUrls: "",
        approvedAssetUrls: "",
        assetPolicy: "mixed",
        templateId: "",
        durationSeconds: "",
        musicTrack: "",
        voiceoverText: "",
        subtitleText: "",
        productUrls: "",
        affiliateId: "AFF-001",
        subId: "",
        hook: "",
        script: "",
        note: ""
      };
    case "SHOPEE_VIDEO_AFF":
    default:
      return {
        title: "Shopee video affiliate",
        jobType: "SHOPEE_VIDEO_AFF",
        mode: "once",
        schedulePreset: "immediate",
        scheduleCron: "",
        productTitle: "Sản phẩm Shopee",
        productNameQuery: "Sản phẩm Shopee",
        productUrl: "https://shopee.vn/product/seed-01",
        sourceType: "video",
        sourceUrl: "https://www.tiktok.com/@seed/video/1",
        imageUrls: "",
        approvedAssetUrls: "",
        assetPolicy: "mixed",
        templateId: "shopee-vertical-basic",
        durationSeconds: "15",
        musicTrack: "ambient-light",
        voiceoverText: "Giới thiệu sản phẩm theo kiểu hook - benefit - CTA.",
        subtitleText: "Demo sản phẩm, lợi ích, và CTA.",
        productUrls: "",
        affiliateId: "AFF-001",
        subId: "admin",
        hook: "Sản phẩm đang hot, xem demo nhanh.",
        script: "Mô tả lợi ích sản phẩm, gắn liên kết và CTA rõ ràng.",
        note: ""
      };
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, any> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function createDefaultAssetForm(): MediaAssetForm {
  return {
    label: "",
    assetType: "IMAGE",
    sourceUrl: "",
    thumbnailUrl: "",
    approved: true,
    tags: "",
    metadataJson: "{}"
  };
}

function sortDescByCreatedAt<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("vi-VN") : "-";
}

function formatDuration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt || !finishedAt) {
    return "-";
  }

  const diffMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "-";
  }

  if (diffMs < 1000) {
    return `${diffMs}ms`;
  }

  return `${(diffMs / 1000).toFixed(1)}s`;
}

function resolveSchedulePreset(scheduleCron: string | null) {
  if (!scheduleCron) {
    return "immediate";
  }

  if (scheduleCron === buildScheduleCronFromPreset("daily_morning")) {
    return "daily_morning";
  }

  if (scheduleCron === buildScheduleCronFromPreset("daily_evening")) {
    return "daily_evening";
  }

  if (scheduleCron === buildScheduleCronFromPreset("weekdays_morning")) {
    return "weekdays_morning";
  }

  if (scheduleCron === buildScheduleCronFromPreset("weekends_morning")) {
    return "weekends_morning";
  }

  return "custom";
}

function parseTextLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDurationSeconds(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(5, Math.min(120, Math.trunc(parsed))) : 15;
}

function buildOptionsJson(form: ShopeeConfigForm) {
  switch (form.jobType) {
    case "SHOPEE_LINK_CONVERT":
      return {
        title: form.title.trim() || "Shopee link convert",
        productUrls: form.productUrls
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
        affiliateId: form.affiliateId.trim(),
        subId: form.subId.trim(),
        note: form.note.trim()
      };
    case "SHOPEE_TRENDING":
      return {
        title: form.title.trim() || "Shopee trending discovery",
        productUrl: form.productUrl.trim(),
        affiliateId: form.affiliateId.trim(),
        note: form.note.trim()
      };
    case "SHOPEE_VIDEO_AFF":
    default:
      return {
        title: form.title.trim() || "Shopee video affiliate",
        productTitle: form.productTitle.trim(),
        productNameQuery: form.productNameQuery.trim(),
        productUrl: form.productUrl.trim(),
        sourceType: form.sourceType,
        sourceUrl: form.sourceUrl.trim(),
        imageUrls: parseTextLines(form.imageUrls),
        approvedAssetUrls: parseTextLines(form.approvedAssetUrls),
        assetPolicy: form.assetPolicy,
        templateId: form.templateId.trim(),
        durationSeconds: parseDurationSeconds(form.durationSeconds),
        musicTrack: form.musicTrack.trim(),
        voiceoverText: form.voiceoverText.trim(),
        subtitleText: form.subtitleText.trim(),
        affiliateId: form.affiliateId.trim(),
        subId: form.subId.trim(),
        hook: form.hook.trim(),
        script: form.script.trim(),
        note: form.note.trim()
      };
  }
}

function formFromJob(job: JobDetail): ShopeeConfigForm {
  const options = parseJsonObject(job.optionsJson);
  const jobType = isShopeeJobType(job.jobType) ? job.jobType : "SHOPEE_VIDEO_AFF";
  const form = createDefaultForm(jobType);

  return {
    ...form,
    title: String(options.title ?? options.productTitle ?? form.title),
    mode: (job.mode.toLowerCase() as JobModeValue) || "once",
    schedulePreset: resolveSchedulePreset(job.scheduleCron),
    scheduleCron: job.scheduleCron ?? "",
    productTitle: String(options.productTitle ?? form.productTitle ?? ""),
    productNameQuery: String(options.productNameQuery ?? options.productTitle ?? form.productNameQuery ?? ""),
    productUrl: String(options.productUrl ?? form.productUrl ?? ""),
    sourceType: String(options.sourceType ?? form.sourceType ?? "video") as VideoSourceType,
    sourceUrl: String(options.sourceUrl ?? form.sourceUrl ?? ""),
    imageUrls: Array.isArray(options.imageUrls) ? options.imageUrls.join("\n") : String(options.imageUrls ?? form.imageUrls ?? ""),
    approvedAssetUrls: Array.isArray(options.approvedAssetUrls)
      ? options.approvedAssetUrls.join("\n")
      : String(options.approvedAssetUrls ?? form.approvedAssetUrls ?? ""),
    assetPolicy: String(options.assetPolicy ?? form.assetPolicy ?? "mixed") as ShopeeConfigForm["assetPolicy"],
    templateId: String(options.templateId ?? form.templateId ?? ""),
    durationSeconds: String(options.durationSeconds ?? form.durationSeconds ?? ""),
    musicTrack: String(options.musicTrack ?? form.musicTrack ?? ""),
    voiceoverText: String(options.voiceoverText ?? form.voiceoverText ?? ""),
    subtitleText: String(options.subtitleText ?? form.subtitleText ?? ""),
    productUrls: Array.isArray(options.productUrls) ? options.productUrls.join("\n") : form.productUrls,
    affiliateId: String(options.affiliateId ?? form.affiliateId ?? ""),
    subId: String(options.subId ?? form.subId ?? ""),
    hook: String(options.hook ?? form.hook ?? ""),
    script: String(options.script ?? form.script ?? ""),
    note: String(options.note ?? form.note ?? "")
  };
}

function getJobDisplayName(job: JobDetail) {
  const options = parseJsonObject(job.optionsJson);
  return String(options.title ?? options.productTitle ?? formatJobType(job.jobType));
}

function getContract(jobType: ShopeeJobType | string | null | undefined): ToolContract | null {
  if (!jobType || !isShopeeJobType(jobType)) {
    return null;
  }

  return resolveToolContract("SHOPEE", jobType);
}

function badgeStyle(status: string) {
  const upper = status.toUpperCase();

  if (upper === "DONE" || upper === "SUCCESS") {
    return { background: "rgba(16, 185, 129, 0.14)", color: "#86efac", border: "1px solid rgba(16, 185, 129, 0.25)" };
  }

  if (upper === "FAILED" || upper === "ERROR") {
    return { background: "rgba(239, 68, 68, 0.14)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.25)" };
  }

  if (upper === "RUNNING") {
    return { background: "rgba(59, 130, 246, 0.14)", color: "#93c5fd", border: "1px solid rgba(59, 130, 246, 0.25)" };
  }

  if (upper === "QUEUED") {
    return { background: "rgba(250, 204, 21, 0.14)", color: "#fde68a", border: "1px solid rgba(250, 204, 21, 0.25)" };
  }

  if (upper === "PAUSED") {
    return { background: "rgba(168, 85, 247, 0.14)", color: "#d8b4fe", border: "1px solid rgba(168, 85, 247, 0.25)" };
  }

  return { background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" };
}

function toneStyle(tone: "stable" | "beta" | "experimental" | "proxy" | "browser" | "redis" | "account") {
  if (tone === "stable") {
    return { background: "rgba(16, 185, 129, 0.14)", color: "#86efac", border: "1px solid rgba(16, 185, 129, 0.25)" };
  }

  if (tone === "beta") {
    return { background: "rgba(59, 130, 246, 0.14)", color: "#93c5fd", border: "1px solid rgba(59, 130, 246, 0.25)" };
  }

  if (tone === "experimental") {
    return { background: "rgba(250, 204, 21, 0.14)", color: "#fde68a", border: "1px solid rgba(250, 204, 21, 0.25)" };
  }

  return { background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" };
}

function serviceStatusStyle(status: string) {
  const upper = status.toUpperCase();

  if (upper === "ONLINE") {
    return { background: "rgba(16, 185, 129, 0.14)", color: "#86efac", border: "1px solid rgba(16, 185, 129, 0.25)" };
  }

  if (upper === "DEGRADED") {
    return { background: "rgba(250, 204, 21, 0.14)", color: "#fde68a", border: "1px solid rgba(250, 204, 21, 0.25)" };
  }

  return { background: "rgba(239, 68, 68, 0.14)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.25)" };
}

function normalizeRunMetrics(run: JobRun) {
  return parseJsonObject(run.metricsJson);
}

function summarizeJobRuns(jobs: JobDetail[]) {
  let totalRuns = 0;
  let successRuns = 0;
  let failedRuns = 0;
  let runningRuns = 0;
  let queuedRuns = 0;

  for (const job of jobs) {
    for (const run of job.runs) {
      totalRuns += 1;
      if (run.status === "DONE") {
        successRuns += 1;
      } else if (run.status === "FAILED") {
        failedRuns += 1;
      } else if (run.status === "RUNNING") {
        runningRuns += 1;
      } else if (run.status === "QUEUED") {
        queuedRuns += 1;
      }
    }
  }

  return {
    totalRuns,
    successRuns,
    failedRuns,
    runningRuns,
    queuedRuns,
    successRate: totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0
  };
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - day);
  return next;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit"
  });
}

function formatPeriodLabel(start: Date, end: Date) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function createEmptyBucket(label: string): PeriodBucket {
  return {
    label,
    runs: 0,
    success: 0,
    failed: 0,
    running: 0,
    queued: 0,
    successRate: 0
  };
}

function bucketRun(bucket: PeriodBucket, run: JobRun) {
  bucket.runs += 1;
  if (run.status === "DONE") {
    bucket.success += 1;
  } else if (run.status === "FAILED") {
    bucket.failed += 1;
  } else if (run.status === "RUNNING") {
    bucket.running += 1;
  } else if (run.status === "QUEUED") {
    bucket.queued += 1;
  }
}

function finalizeBucket(bucket: PeriodBucket) {
  bucket.successRate = bucket.runs > 0 ? Math.round((bucket.success / bucket.runs) * 100) : 0;
  return bucket;
}

function buildDailyReport(jobs: JobDetail[], days = 7) {
  const now = new Date();
  const start = startOfDay(addDays(now, -(days - 1)));
  const buckets = new Map<string, PeriodBucket>();

  for (let index = 0; index < days; index += 1) {
    const current = addDays(start, index);
    const key = current.toISOString().slice(0, 10);
    buckets.set(key, createEmptyBucket(formatShortDate(current)));
  }

  for (const job of jobs) {
    for (const run of job.runs) {
      const createdAt = new Date(run.createdAt);
      if (createdAt < start) {
        continue;
      }

      const key = createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) {
        bucketRun(bucket, run);
      }
    }
  }

  return Array.from(buckets.values()).map(finalizeBucket);
}

function buildWeeklyReport(jobs: JobDetail[], weeks = 4) {
  const now = new Date();
  const start = startOfWeek(addDays(now, -(weeks - 1) * 7));
  const buckets = new Map<string, PeriodBucket>();

  for (let index = 0; index < weeks; index += 1) {
    const weekStart = addDays(start, index * 7);
    const weekEnd = addDays(weekStart, 6);
    const key = weekStart.toISOString().slice(0, 10);
    buckets.set(key, createEmptyBucket(formatPeriodLabel(weekStart, weekEnd)));
  }

  for (const job of jobs) {
    for (const run of job.runs) {
      const createdAt = new Date(run.createdAt);
      const weekStart = startOfWeek(createdAt);
      const key = weekStart.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) {
        bucketRun(bucket, run);
      }
    }
  }

  return Array.from(buckets.values()).map(finalizeBucket);
}

function buildVideoPreview(form: ShopeeConfigForm) {
  const imageUrls = parseTextLines(form.imageUrls);
  const approvedAssetUrls = parseTextLines(form.approvedAssetUrls);
  const durationSeconds = parseDurationSeconds(form.durationSeconds);
  const sourceType = form.sourceType;

  const steps = [
    sourceType === "images"
      ? "Dùng ảnh sản phẩm làm khung video 9:16."
      : sourceType === "mixed"
        ? "Kết hợp video demo + ảnh sản phẩm + overlay."
        : sourceType === "template"
          ? "Để input vào template dựng sẵn."
          : "Cắt demo video theo đoạn hook ngắn.",
    `Chèn hook: ${form.hook.trim() || "Hook mặc định"}.`,
    `Overlay tên sản phẩm và giá trị chính: ${form.productTitle.trim() || "Sản phẩm"}.`,
    `Thêm voiceover: ${form.voiceoverText.trim() || "Voiceover mặc định"}.`,
    `Subtitles: ${form.subtitleText.trim() || "Text phụ đề mặc định"}.`,
    `Xuất video ${durationSeconds}s, khung 9:16, nhạc nền ${form.musicTrack.trim() || "ambient-light"}.`
  ];

  return {
    sourceType,
    durationSeconds,
    templateId: form.templateId.trim() || "shopee-vertical-basic",
    sourceUrl: form.sourceUrl.trim(),
    imageCount: imageUrls.length,
    imageUrls,
    approvedAssetCount: approvedAssetUrls.length,
    assetPolicy: form.assetPolicy,
    productNameQuery: form.productNameQuery.trim() || form.productTitle.trim(),
    steps
  };
}

function buildAssetRegistryPreview(form: ShopeeConfigForm) {
  const approvedAssetUrls = parseTextLines(form.approvedAssetUrls);
  const productNameQuery = form.productNameQuery.trim() || form.productTitle.trim();

  return {
    productNameQuery,
    assetPolicy: form.assetPolicy,
    approvedAssetCount: approvedAssetUrls.length,
    approvedAssetUrls,
    steps: [
      "Nhập tên sản phẩm để enrichment và tìm asset hợp lệ.",
      form.assetPolicy === "approved_only"
        ? "Chỉ sử dụng asset được cấp quyền và danh sách đã duyệt."
        : form.assetPolicy === "product_page_only"
          ? "Chỉ sử dụng asset từ trang sản phẩm."
          : "Kết hợp asset duyệt và asset từ trang sản phẩm.",
      approvedAssetUrls.length > 0 ? "Ưu tiên asset đã duyệt và loại bỏ asset trùng lặp." : "Nếu chưa có asset duyệt, fallback sang metadata sản phẩm."
    ]
  };
}

export default function ShopeeAffPage() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobRuns, setSelectedJobRuns] = useState<JobRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [assetFilter, setAssetFilter] = useState("");
  const [assetForm, setAssetForm] = useState<MediaAssetForm>(createDefaultAssetForm());
  const [assetImportText, setAssetImportText] = useState("");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [form, setForm] = useState<ShopeeConfigForm>(createDefaultForm("SHOPEE_VIDEO_AFF"));
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("guide");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);
  const [runtimeSystem, setRuntimeSystem] = useState<RuntimeSystemStatus | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState("");
  const selectedJobIdRef = useRef<string | null>(null);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? null, [jobs, selectedJobId]);
  const selectedRun = useMemo(() => selectedJobRuns.find((run) => run.id === selectedRunId) ?? selectedJobRuns[0] ?? null, [selectedJobRuns, selectedRunId]);
  const selectedContract = useMemo(() => getContract(selectedJob?.jobType), [selectedJob]);
  const formContract = useMemo(() => getContract(form.jobType), [form.jobType]);
  const videoPreview = useMemo(() => buildVideoPreview(form), [form]);
  const assetRegistryPreview = useMemo(() => buildAssetRegistryPreview(form), [form]);
  const filteredAssets = useMemo(() => {
    const normalized = assetFilter.trim().toLowerCase();
    const source = [...assets].sort((left, right) => {
      if (left.approved !== right.approved) {
        return left.approved ? -1 : 1;
      }

      return (right.usageCount ?? 0) - (left.usageCount ?? 0);
    });

    if (!normalized) {
      return source;
    }

    return source.filter((asset) => {
      const tags = Array.isArray(asset.tags) ? asset.tags.join(" ").toLowerCase() : String(asset.tagsJson ?? "").toLowerCase();
      const metadata = asset.metadataJson.toLowerCase();
      return asset.label.toLowerCase().includes(normalized) || tags.includes(normalized) || metadata.includes(normalized) || asset.sourceUrl.toLowerCase().includes(normalized);
    });
  }, [assets, assetFilter]);

  const overview = useMemo(() => {
    const stageCounts = {
      stable: 0,
      beta: 0,
      experimental: 0
    };

    const statusCounts = {
      draft: 0,
      queued: 0,
      running: 0,
      paused: 0,
      done: 0,
      failed: 0
    };

    const latestRuns = jobs
      .flatMap((job) => {
        const sortedRuns = sortDescByCreatedAt(job.runs);
        const contract = getContract(job.jobType);
        if (contract) {
          stageCounts[contract.stage] += 1;
        }

        statusCounts[job.status.toLowerCase() as keyof typeof statusCounts] += 1;

        const latestRun = sortedRuns[0] ?? null;
        return latestRun
          ? [
            {
              jobId: job.id,
              title: getJobDisplayName(job),
              jobType: job.jobType,
              status: latestRun.status,
              createdAt: latestRun.createdAt,
              note: normalizeRunMetrics(latestRun).note ?? latestRun.errorMessage ?? "-"
            }
          ]
          : [];
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 6);

    const runs = summarizeJobRuns(jobs);

    return {
      stageCounts,
      statusCounts,
      latestRuns,
      ...runs,
      totalConfigs: jobs.length
    };
  }, [jobs]);

  const dailyReport = useMemo(() => buildDailyReport(jobs), [jobs]);
  const weeklyReport = useMemo(() => buildWeeklyReport(jobs), [jobs]);

  useEffect(() => {
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const session = await syncSessionProfile();
      if (!mounted) {
        return;
      }

      if (!session) {
        router.push("/dang-nhap");
        return;
      }

      setUserEmail(session.email);
      setUserRole(session.role);
      setWorkspaceId(session.workspaceId);
      setVerified(true);

      await refreshJobs(session.workspaceId, null);
      await refreshAssets(session.workspaceId);
    };

    void init();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!verified || !workspaceId) {
      return;
    }

    const socket = getSocket();
    joinWorkspace(workspaceId);

    const handleJobStatus = (data: { workspaceId?: string; jobId: string; status: string }) => {
      if (data.workspaceId && data.workspaceId !== workspaceId) {
        return;
      }

      const preferredJobId = selectedJobIdRef.current;
      void refreshJobs(workspaceId, preferredJobId === data.jobId ? data.jobId : preferredJobId);
    };

    const handleJobLog = (data: { workspaceId?: string; jobId: string }) => {
      if (data.workspaceId && data.workspaceId !== workspaceId) {
        return;
      }

      const preferredJobId = selectedJobIdRef.current;
      if (preferredJobId === data.jobId) {
        void loadSelectedRuns(data.jobId);
      }
    };

    socket.on("job_status", handleJobStatus);
    socket.on("job_log", handleJobLog);

    return () => {
      socket.off("job_status", handleJobStatus);
      socket.off("job_log", handleJobLog);
      leaveWorkspace(workspaceId);
    };
  }, [verified, workspaceId]);

  useEffect(() => {
    if (!verified || userRole !== "ADMIN") {
      return;
    }

    void refreshRuntimeStatus();
  }, [verified, userRole, workspaceId]);

  useEffect(() => {
    if (!workspaceId || !verified || !selectedJob) {
      return;
    }

    const liveStatuses = new Set(["QUEUED", "RUNNING"]);
    if (!liveStatuses.has(selectedJob.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshJobs(workspaceId, selectedJobIdRef.current);
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, [verified, workspaceId, selectedJob?.status, selectedJob?.id]);

  async function loadSelectedRuns(jobId: string) {
    try {
      const response = await apiRequest<JobRun[]>(`/jobs/${jobId}/runs`);
      const sortedRuns = sortDescByCreatedAt(response.data);
      setSelectedJobRuns(sortedRuns);
      setSelectedRunId(sortedRuns[0]?.id ?? null);
    } catch (error) {
      setSelectedJobRuns([]);
      setSelectedRunId(null);
      setMessage(error instanceof Error ? error.message : "Khong the tai lich su chay.");
    }
  }

  async function refreshAssets(currentWorkspaceId: string) {
    try {
      const response = await apiRequest<MediaAsset[]>(`/workspaces/${currentWorkspaceId}/media-assets`);
      setAssets(
        response.data.map((asset) => ({
          ...asset,
          tags: parseJsonArray(asset.tagsJson),
          metadata: parseJsonObject(asset.metadataJson)
        }))
      );
    } catch {
      setAssets([]);
    }
  }

  async function refreshRuntimeStatus() {
    if (!verified || userRole !== "ADMIN") {
      setRuntimeSystem(null);
      setRuntimeError("");
      return;
    }

    setRuntimeLoading(true);
    try {
      const response = await apiRequest<RuntimeSystemStatus>("/admin/system");
      setRuntimeSystem(response.data);
      setRuntimeError("");
    } catch (error) {
      setRuntimeSystem(null);
      setRuntimeError(error instanceof Error ? error.message : "Khong the kiem tra he thong.");
    } finally {
      setRuntimeLoading(false);
    }
  }

  async function refreshJobs(currentWorkspaceId: string, preferredJobId: string | null) {
    setIsLoading(true);
    try {
      const listResponse = await apiRequest<JobDetail[]>(`/workspaces/${currentWorkspaceId}/jobs`);
      const filteredJobIds = listResponse.data.filter((job) => job.platform === "SHOPEE" && isShopeeJobType(job.jobType));

      const detailResults = await Promise.allSettled(
        filteredJobIds.map(async (job) => {
          const detailResponse = await apiRequest<JobDetail>(`/jobs/${job.id}`);
          return detailResponse.data;
        })
      );

      const detailItems = detailResults
        .filter((result): result is PromiseFulfilledResult<JobDetail> => result.status === "fulfilled")
        .map((result) => ({
          ...result.value,
          runs: sortDescByCreatedAt(result.value.runs ?? [])
        }));

      setJobs(detailItems);

      const nextSelectedJobId = preferredJobId && detailItems.some((job) => job.id === preferredJobId) ? preferredJobId : detailItems[0]?.id ?? null;
      setSelectedJobId(nextSelectedJobId);

      if (nextSelectedJobId) {
        await loadSelectedRuns(nextSelectedJobId);
      } else {
        setSelectedJobRuns([]);
        setSelectedRunId(null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tai danh sach config Shopee.");
    } finally {
      setIsLoading(false);
    }
  }

  function setField<K extends keyof ShopeeConfigForm>(key: K, value: ShopeeConfigForm[K]) {
    setForm((current) => {
      if (key === "jobType") {
        const nextType = value as ShopeeJobType;
        const next = createDefaultForm(nextType);
        return {
          ...next,
          title: current.title || next.title,
          mode: current.mode,
          schedulePreset: current.schedulePreset,
          scheduleCron: current.scheduleCron,
          affiliateId: current.affiliateId || next.affiliateId,
          subId: current.subId || next.subId,
          note: current.note || next.note
        };
      }

      if (key === "schedulePreset") {
        const preset = value as SchedulePresetValue;
        const nextCron = preset === "custom" ? current.scheduleCron : buildScheduleCronFromPreset(preset);
        return {
          ...current,
          schedulePreset: preset,
          scheduleCron: nextCron
        };
      }

      return {
        ...current,
        [key]: value
      };
    });
  }

  function openCreateForm(jobType: ShopeeJobType = "SHOPEE_VIDEO_AFF") {
    setEditingJobId(null);
    setForm(createDefaultForm(jobType));
    setActiveTab("config");
    setMessage("");
  }

  function openAssetCreate() {
    setEditingAssetId(null);
    setAssetForm(createDefaultAssetForm());
    setActiveTab("assets");
    setMessage("Tao asset moi.");
  }

  function openAssetEdit(asset: MediaAsset) {
    setEditingAssetId(asset.id);
    setAssetForm({
      label: asset.label,
      assetType: asset.assetType,
      sourceUrl: asset.sourceUrl,
      thumbnailUrl: asset.thumbnailUrl ?? "",
      approved: asset.approved,
      tags: Array.isArray(asset.tags) ? asset.tags.join("\n") : "",
      metadataJson: asset.metadataJson || "{}"
    });
    setActiveTab("assets");
    setMessage(`Dang chinh sua asset: ${asset.label}`);
  }

  function useAssetInConfig(asset: MediaAsset) {
    setField("approvedAssetUrls", `${parseTextLines(form.approvedAssetUrls).filter((line) => line !== asset.sourceUrl).join("\n")}${form.approvedAssetUrls.trim() ? "\n" : ""}${asset.sourceUrl}`);
    setMessage(`Da dua asset vao cau hinh: ${asset.label}`);
  }

  function enrichConfigFromAssets() {
    const matched = filteredAssets.filter((asset) => asset.approved).slice(0, 5).map((asset) => asset.sourceUrl);
    if (matched.length === 0) {
      setMessage("Chua co asset phu hop trong thu vien.");
      return;
    }

    setField("approvedAssetUrls", matched.join("\n"));
    setMessage(`Da nap ${matched.length} asset duoc duyet vao cau hinh.`);
  }

  async function submitAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) {
      setMessage("Khong co workspace hop le.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        label: assetForm.label,
        assetType: assetForm.assetType,
        sourceUrl: assetForm.sourceUrl,
        thumbnailUrl: assetForm.thumbnailUrl || null,
        approved: assetForm.approved,
        tags: assetForm.tags,
        metadataJson: assetForm.metadataJson
      };

      if (editingAssetId) {
        const response = await apiRequest(`/workspaces/${workspaceId}/media-assets/${editingAssetId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setMessage(response.message);
      } else {
        const response = await apiRequest(`/workspaces/${workspaceId}/media-assets`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setMessage(response.message);
      }

      await refreshAssets(workspaceId);
      setEditingAssetId(null);
      setAssetForm(createDefaultAssetForm());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the luu asset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function importAssets() {
    if (!workspaceId) {
      setMessage("Khong co workspace hop le.");
      return;
    }

    if (!assetImportText.trim()) {
      setMessage("Nhap JSON array hoac CSV line de import asset.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest<{ requested: number; created: number; assets: MediaAsset[] }>(`/workspaces/${workspaceId}/media-assets/bulk-import`, {
        method: "POST",
        body: JSON.stringify({
          raw: assetImportText,
          defaultAssetType: "IMAGE",
          defaultApproved: true
        })
      });
      setMessage(response.message);
      setAssetImportText("");
      await refreshAssets(workspaceId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the import asset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function enrichAssetsFromProduct() {
    if (!workspaceId) {
      setMessage("Khong co workspace hop le.");
      return;
    }

    if (!form.productUrl.trim()) {
      setMessage("Nhap link san pham truoc khi enrich asset.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest<{ product: Record<string, any>; candidates: Array<Record<string, any>>; created: MediaAsset[] }>(
        `/workspaces/${workspaceId}/media-assets/enrich`,
        {
          method: "POST",
          body: JSON.stringify({
            productUrl: form.productUrl.trim(),
            productNameQuery: form.productNameQuery.trim() || form.productTitle.trim(),
            createAssets: true,
            approved: false,
            tags: [form.productNameQuery.trim() || form.productTitle.trim(), "shopee-aff"].filter(Boolean)
          })
        }
      );
      setMessage(response.message);
      setAssetFilter(form.productNameQuery.trim() || form.productTitle.trim());
      await refreshAssets(workspaceId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the enrich asset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleAssetApproved(asset: MediaAsset) {
    if (!workspaceId) {
      return;
    }

    setBusyJobId(asset.id);
    try {
      const response = await apiRequest(`/workspaces/${workspaceId}/media-assets/${asset.id}`, {
        method: "PATCH",
        body: JSON.stringify({ approved: !asset.approved })
      });
      setMessage(response.message);
      await refreshAssets(workspaceId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the cap nhat asset.");
    } finally {
      setBusyJobId(null);
    }
  }

  async function removeAsset(asset: MediaAsset) {
    if (!workspaceId) {
      return;
    }

    const confirmDelete = window.confirm(`Xoa asset ${asset.label}?`);
    if (!confirmDelete) {
      return;
    }

    setBusyJobId(asset.id);
    try {
      const response = await apiRequest(`/workspaces/${workspaceId}/media-assets/${asset.id}`, {
        method: "DELETE"
      });
      setMessage(response.message);
      await refreshAssets(workspaceId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the xoa asset.");
    } finally {
      setBusyJobId(null);
    }
  }

  function loadShopeeTestPreset(kind: "video" | "link") {
    setEditingJobId(null);
    if (kind === "link") {
      setForm({
        ...createDefaultForm("SHOPEE_LINK_CONVERT"),
        title: "Test Shopee link converter",
        productUrls: SHOPEE_TEST_PRODUCT.productUrl,
        affiliateId: "AFF-TEST-001",
        subId: "test",
        note: `Test vỉ sản phẩm: ${SHOPEE_TEST_PRODUCT.title}`
      });
    } else {
      setForm({
        ...createDefaultForm("SHOPEE_VIDEO_AFF"),
        title: "Test Shopee video affiliate",
        productTitle: SHOPEE_TEST_PRODUCT.title,
        productNameQuery: SHOPEE_TEST_PRODUCT.title,
        productUrl: SHOPEE_TEST_PRODUCT.productUrl,
        sourceType: "video",
        sourceUrl: SHOPEE_TEST_PRODUCT.sourceUrl,
        imageUrls: "",
        approvedAssetUrls: SHOPEE_TEST_PRODUCT.sourceUrl,
        assetPolicy: "mixed",
        templateId: "shopee-vertical-basic",
        durationSeconds: "15",
        musicTrack: "ambient-light",
        voiceoverText: `Giới thiệu ${SHOPEE_TEST_PRODUCT.title}`,
        subtitleText: "Demo sản phẩm, lợi ích, và CTA.",
        affiliateId: "AFF-TEST-001",
        subId: "test",
        hook: "Test luồng video affiliate với sản phẩm mẫu.",
        script: "Dùng preset này để test pipeline từ source video -> sản phẩm -> affiliate link.",
        note: `Affiliate link tham khảo: ${SHOPEE_TEST_PRODUCT.affiliateLink}`
      });
    }
    setActiveTab("config");
    setMessage(`Đã nạp preset test ${kind === "link" ? "link converter" : "video affiliate"}.`);
  }

  function openEditForm(job: JobDetail) {
    setEditingJobId(job.id);
    setForm(formFromJob(job));
    setActiveTab("config");
    setMessage(`Dang chinh sua cau hinh: ${getJobDisplayName(job)}`);
  }

  async function submitConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) {
      setMessage("Khong co workspace hop le.");
      return;
    }

    setIsSubmitting(true);
    try {
      const optionsJson = JSON.stringify(buildOptionsJson(form));
      const payload = {
        platform: "SHOPEE",
        jobType: form.jobType,
        mode: form.mode,
        scheduleCron: form.mode === "recurring" || form.mode === "scheduled" ? form.scheduleCron || null : null,
        accountId: null,
        optionsJson
      };

      if (editingJobId) {
        const response = await apiRequest<JobDetail>(`/jobs/${editingJobId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setMessage(response.message);
        await refreshJobs(workspaceId, editingJobId);
        setSelectedJobId(editingJobId);
        setActiveTab("detail");
      } else {
        const response = await apiRequest<JobDetail>(`/workspaces/${workspaceId}/jobs`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setMessage(response.message);
        await refreshJobs(workspaceId, response.data.id);
        setEditingJobId(null);
        setActiveTab("detail");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the luu cau hinh.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runJob(jobId: string) {
    setBusyJobId(jobId);
    try {
      const response = await apiRequest(`/jobs/${jobId}/run`, { method: "POST" });
      setMessage(response.message);
      await refreshJobs(workspaceId, jobId);
      setSelectedJobId(jobId);
      setActiveTab("detail");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the chay config.");
    } finally {
      setBusyJobId(null);
    }
  }

  async function pauseJob(jobId: string) {
    setBusyJobId(jobId);
    try {
      const response = await apiRequest(`/jobs/${jobId}/pause`, { method: "POST" });
      setMessage(response.message);
      await refreshJobs(workspaceId, jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tam dung config.");
    } finally {
      setBusyJobId(null);
    }
  }

  async function resumeJob(jobId: string) {
    setBusyJobId(jobId);
    try {
      const response = await apiRequest(`/jobs/${jobId}/resume`, { method: "POST" });
      setMessage(response.message);
      await refreshJobs(workspaceId, jobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tiep tuc config.");
    } finally {
      setBusyJobId(null);
    }
  }

  async function removeJob(jobId: string) {
    const confirmDelete = window.confirm("Xoa cau hinh nay? Hanh dong nay khong the hoan tac.");
    if (!confirmDelete) {
      return;
    }

    setBusyJobId(jobId);
    try {
      const response = await apiRequest(`/jobs/${jobId}`, { method: "DELETE" });
      setMessage(response.message);
      setEditingJobId((current) => (current === jobId ? null : current));
      await refreshJobs(workspaceId, selectedJobId === jobId ? null : selectedJobId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the xoa config.");
    } finally {
      setBusyJobId(null);
    }
  }

  async function selectJob(jobId: string) {
    setSelectedJobId(jobId);
    setActiveTab("detail");
    await loadSelectedRuns(jobId);
  }

  async function retryRun(runId: string, jobId: string) {
    setBusyRunId(runId);
    try {
      const response = await apiRequest<JobRun>(`/job-runs/${runId}/retry`, { method: "POST" });
      setMessage(response.message);
      await refreshJobs(workspaceId, jobId);
      setSelectedJobId(jobId);
      setActiveTab("detail");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the retry lan chay.");
    } finally {
      setBusyRunId(null);
    }
  }

  function renderContractPanel(contract: ToolContract | null) {
    return (
      <div className="panel" style={{ padding: 24, height: "100%" }}>
        <div className="panel-head" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Thông tin tool</h2>
          {contract ? (
            <span className="badge" style={toneStyle(contract.stage)}>{contract.stage}</span>
          ) : null}
        </div>

        {!contract ? (
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Chọn một cấu hình Shopee hợp lệ để xem metadata.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Code</div>
                <div style={{ fontWeight: 700 }}>{contract.code}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Nhóm</div>
                <div style={{ fontWeight: 700 }}>{contract.category}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Nền tảng</div>
                <div style={{ fontWeight: 700 }}>{contract.platform}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Job type</div>
                <div style={{ fontWeight: 700 }}>{contract.jobType}</div>
              </div>
            </div>

            <div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>Yêu cầu runtime</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(contract.requiredRuntime?.length ? contract.requiredRuntime : ["Không có"]).map((item) => (
                  <span key={item} className="badge" style={toneStyle(item as any)}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>Input</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {contract.input.map((input) => (
                  <div key={input.key} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{input.key}</strong>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{input.type}{input.required ? " · bắt buộc" : ""}</span>
                    </div>
                    <div style={{ color: "var(--text-dim)", marginTop: 6, fontSize: 13 }}>{input.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>Output</div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontWeight: 700 }}>Data</div>
                <div style={{ color: "var(--text-dim)", fontSize: 13 }}>{contract.output.data ?? "-"}</div>
                <div style={{ fontWeight: 700, marginTop: 10 }}>Snapshot</div>
                <div style={{ color: "var(--text-dim)", fontSize: 13 }}>{contract.output.snapshotData ?? "-"}</div>
                <div style={{ fontWeight: 700, marginTop: 10 }}>Metrics</div>
                <div style={{ color: "var(--text-dim)", fontSize: 13 }}>{contract.output.metrics?.join(", ") || "-"}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderGuide() {
    const sampleLinks = [
      { label: "Link san pham Shopee", value: SHOPEE_TEST_PRODUCT.productUrl },
      { label: "Link affiliate Shopee", value: SHOPEE_TEST_PRODUCT.affiliateLink },
      { label: "Link video demo", value: SHOPEE_TEST_PRODUCT.sourceUrl }
    ];
    const workflow = [
      "Mo tab Cau hinh va bam Nap test video de dien san du lieu mau.",
      "Kiem tra ten san pham, link san pham, affiliate ID, source video va asset policy.",
      "Neu co anh/video rieng, vao Thu vien asset de import va duyet asset truoc khi chay.",
      "Luu cau hinh de tao Job, sau do vao Theo tung cau hinh va bam Chay.",
      "Doc ket qua trong JobRun: status, logs, metrics, renderOutput va snapshot generatedVideos.",
      "Sau khi co video/link output, cap nhat link bai dang Shopee de doi soat ket qua that."
    ];
    const successChecks = [
      "JobRun DONE: tool chay xong va co metrics.",
      "JobRun FAILED: xem errorMessage va logs de biet loi Redis, asset, Chrome hay input.",
      "metrics.videosBuilt > 0: pipeline da tao video/render plan.",
      "renderOutput.artifactPath co gia tri: da render file preview tren may worker.",
      "snapshotData co generatedVideos: co du lieu de hien thi trong bao cao."
    ];

    return (
      <div style={{ display: "grid", gap: 20 }}>
        <section className="panel" style={{ padding: 24 }}>
          <div className="panel-head" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>Hướng dẫn sử dụng Shopee Aff</h2>
              <p style={{ marginTop: 6, color: "var(--text-muted)" }}>
                Quy trình chuẩn để tạo cấu hình, nạp asset, chạy tool và kiểm tra kết quả thật.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="button button-primary" onClick={() => loadShopeeTestPreset("video")}>
                Nạp preset video
              </button>
              <button
                type="button"
                className="button button-soft"
                onClick={() => {
                  setAssetImportText(SAMPLE_ASSET_IMPORT);
                  setActiveTab("assets");
                  setMessage("Đã nạp dữ liệu mẫu vào ô import asset.");
                }}
              >
                Mở asset mẫu
              </button>
              <button type="button" className="button button-ghost" onClick={refreshRuntimeStatus} disabled={runtimeLoading || userRole !== "ADMIN"}>
                {runtimeLoading ? "Đang kiểm tra..." : "Kiểm tra hệ thống"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
            <div style={{ padding: 14, borderRadius: 16, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>Database</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="badge" style={serviceStatusStyle(runtimeSystem?.database.status ?? "OFFLINE")}>
                  {runtimeSystem?.database.status ?? "CHUA KIEM TRA"}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>
                  {runtimeSystem?.database.latencyMs !== null && runtimeSystem?.database.latencyMs !== undefined
                    ? `${runtimeSystem.database.latencyMs}ms`
                    : "latency n/a"}
                </span>
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>Redis queue</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="badge" style={serviceStatusStyle(runtimeSystem?.queue.status ?? "OFFLINE")}>
                  {runtimeSystem?.queue.status ?? "CHUA KIEM TRA"}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{runtimeSystem?.queue.queueName ?? "mmo-jobs"}</span>
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>Queue counts</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge" style={badgeStyle("QUEUED")}>W {runtimeSystem?.queue.counts.waiting ?? 0}</span>
                <span className="badge" style={badgeStyle("RUNNING")}>A {runtimeSystem?.queue.counts.active ?? 0}</span>
                <span className="badge" style={badgeStyle("FAILED")}>F {runtimeSystem?.queue.counts.failed ?? 0}</span>
              </div>
            </div>
          </div>

          {runtimeError ? (
            <div style={{ marginBottom: 18, padding: 14, borderRadius: 16, border: "1px solid rgba(239, 68, 68, 0.25)", background: "rgba(239, 68, 68, 0.08)", color: "#fca5a5" }}>
              {runtimeError}
            </div>
          ) : null}

          <div className="content-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <article className="panel" style={{ padding: 18, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <h3 style={{ marginTop: 0 }}>1. Luong chay chuan</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {workflow.map((step, index) => (
                  <div key={step} style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 10, alignItems: "start" }}>
                    <span className="badge" style={toneStyle(index < 3 ? "beta" : "stable")}>{index + 1}</span>
                    <span style={{ color: "var(--text-dim)", lineHeight: 1.55 }}>{step}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel" style={{ padding: 18, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <h3 style={{ marginTop: 0 }}>2. Dieu kien de chay that</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {GUIDE_REQUIREMENTS.map((item) => (
                  <div key={item} style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.04)", color: "var(--text-dim)" }}>
                    {item}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="content-grid" style={{ gridTemplateColumns: "1.05fr 0.95fr", gap: 20 }}>
          <article className="panel" style={{ padding: 24 }}>
            <div className="panel-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Du lieu mau</h2>
              <span className="badge" style={toneStyle("stable")}>SHOPEE_VIDEO_AFF</span>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {sampleLinks.map((item) => (
                <div key={item.label} style={{ padding: 14, borderRadius: 16, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 6 }}>{item.label}</div>
                  <a href={item.value} target="_blank" rel="noreferrer" style={{ color: "#93c5fd", wordBreak: "break-all", fontWeight: 700 }}>
                    {item.value}
                  </a>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 16, border: "1px solid rgba(139, 92, 246, 0.28)", background: "rgba(139, 92, 246, 0.08)" }}>
              <div style={{ color: "#e9d5ff", fontWeight: 800, marginBottom: 8 }}>Bulk import asset mau</div>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, color: "var(--text-dim)", fontSize: 13 }}>
                {SAMPLE_ASSET_IMPORT}
              </pre>
            </div>
          </article>

          <article className="panel" style={{ padding: 24 }}>
            <div className="panel-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Biet thanh cong hay chua</h2>
              <span className="badge" style={toneStyle("beta")}>JobRun</span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {successChecks.map((item) => (
                <div key={item} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text-dim)" }}>
                  {item}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 16, background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fde68a" }}>
              Neu local bao loi Redis queue is unavailable thi tool chua vao worker. Can bat Redis va worker truoc khi bam Chay.
            </div>
          </article>
        </section>
      </div>
    );
  }

  function renderConfigForm() {
    return (
      <form className="panel" onSubmit={submitConfig} style={{ padding: "40px" }}>
        <div className="panel-head" style={{ marginBottom: "40px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "2rem" }}>{editingJobId ? "Cấu hình chiến dịch" : "Tạo chiến dịch mới"}</h2>
            <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: "1.05rem" }}>
              Thiết lập các thông số tự động hóa cho Shopee Affiliate.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" className="button button-soft" onClick={() => loadShopeeTestPreset("video")}>
              Thử mẫu Video
            </button>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : editingJobId ? "Cập nhật" : "Kích hoạt ngay"}
            </button>
          </div>
        </div>

        <div className="content-grid" style={{ gridTemplateColumns: "1.2fr 0.8fr", gap: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* Section: Thông tin cơ bản */}
            <section>
              <h3 style={{ fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 10px var(--primary)" }}></span>
                Thông tin cơ bản
              </h3>
              <div style={{ display: "grid", gap: "20px" }}>
                <label className="field">
                  <span>Tên cấu hình / Chiến dịch</span>
                  <input className="input" value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="VD: Chiến dịch Quạt Mini tháng 5" />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <label className="field">
                    <span>Loại công cụ</span>
                    <select className="input" value={form.jobType} onChange={(event) => setField("jobType", event.target.value as ShopeeJobType)}>
                      <option value="SHOPEE_VIDEO_AFF">Video Affiliate (Tự động dựng)</option>
                      <option value="SHOPEE_LINK_CONVERT">Link Convert (Chuyển đổi hàng loạt)</option>
                      <option value="SHOPEE_TRENDING">Trending (Khám phá xu hướng)</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Chế độ vận hành</span>
                    <select className="input" value={form.mode} onChange={(event) => setField("mode", event.target.value as JobModeValue)}>
                      <option value="scheduled">Chạy theo lịch cố định</option>
                      <option value="recurring">Chạy lặp lại định kỳ</option>
                    </select>
                  </label>
                </div>

                {form.mode !== "once" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", padding: "20px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <label className="field">
                      <span>Lịch trình mẫu</span>
                      <select className="input" value={form.schedulePreset} onChange={(event) => setField("schedulePreset", event.target.value as SchedulePresetValue)}>
                        <option value="immediate">Ngay lập tức</option>
                        <option value="daily_morning">Mỗi sáng (08:00)</option>
                        <option value="daily_evening">Mỗi tối (18:00)</option>
                        <option value="weekdays_morning">Ngày thường (09:00)</option>
                        <option value="weekends_morning">Cuối tuần (10:00)</option>
                        <option value="custom">Tùy chỉnh Cron</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Biểu thức Cron</span>
                      <input className="input" value={form.scheduleCron} onChange={(event) => setField("scheduleCron", event.target.value)} placeholder="0 8 * * *" />
                    </label>
                  </div>
                )}
              </div>
            </section>

            {form.jobType === "SHOPEE_VIDEO_AFF" && (
              <>
                {/* Section: Nguồn dữ liệu */}
                <section>
                  <h3 style={{ fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 10px var(--accent)" }}></span>
                    Nguồn dữ liệu & Sản phẩm
                  </h3>
                  <div style={{ display: "grid", gap: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                      <label className="field">
                        <span>Tên sản phẩm (Hiển thị)</span>
                        <input className="input" value={form.productTitle} onChange={(event) => setField("productTitle", event.target.value)} placeholder="Tên sản phẩm trên video" />
                      </label>
                      <label className="field">
                        <span>Affiliate ID</span>
                        <input className="input" value={form.affiliateId} onChange={(event) => setField("affiliateId", event.target.value)} placeholder="Mã định danh Affiliate" />
                      </label>
                    </div>

                    <label className="field">
                      <span>Link sản phẩm Shopee</span>
                      <input className="input" value={form.productUrl} onChange={(event) => setField("productUrl", event.target.value)} placeholder="https://shopee.vn/..." />
                    </label>

                    <label className="field">
                      <span>Link video gốc (TikTok/Douyin/FB)</span>
                      <input className="input" value={form.sourceUrl} onChange={(event) => setField("sourceUrl", event.target.value)} placeholder="https://www.tiktok.com/..." />
                    </label>

                    <div style={{ padding: "24px", borderRadius: "20px", background: "rgba(139, 92, 246, 0.05)", border: "1px solid var(--primary-border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>Thư viện Asset & Thông minh AI</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button type="button" className="button button-soft" style={{ padding: "8px 16px", fontSize: "0.8rem" }} onClick={() => setActiveTab("assets")}>Thư viện</button>
                          <button type="button" className="button button-primary" style={{ padding: "8px 16px", fontSize: "0.8rem" }} onClick={enrichConfigFromAssets}>Tự động nạp</button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <label className="field">
                          <span>Chính sách chọn Asset</span>
                          <select className="input" value={form.assetPolicy} onChange={(event) => setField("assetPolicy", event.target.value as ShopeeConfigForm["assetPolicy"])}>
                            <option value="mixed">Hỗn hợp (AI đề xuất)</option>
                            <option value="approved_only">Chỉ dùng Asset đã duyệt</option>
                            <option value="product_page_only">Chỉ dùng từ trang Shopee</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Từ khóa tìm kiếm Asset</span>
                          <input className="input" value={form.productNameQuery} onChange={(event) => setField("productNameQuery", event.target.value)} placeholder="VD: quạt mini cầm tay" />
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Nội dung & Sáng tạo */}
                <section>
                  <h3 style={{ fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--success)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 10px var(--success)" }}></span>
                    Nội dung & Sáng tạo
                  </h3>
                  <div style={{ display: "grid", gap: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                      <label className="field">
                        <span>Phương thức dựng</span>
                        <select className="input" value={form.sourceType} onChange={(event) => setField("sourceType", event.target.value as VideoSourceType)}>
                          <option value="video">Dựng từ Video Gốc</option>
                          <option value="images">Dựng từ Ảnh Sản Phẩm</option>
                          <option value="mixed">Kết hợp Video + Ảnh</option>
                          <option value="template">Sử dụng Template mẫu</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Template ID</span>
                        <input className="input" value={form.templateId} onChange={(event) => setField("templateId", event.target.value)} placeholder="VD: shopee-vertical-basic" />
                      </label>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                      <label className="field">
                        <span>Thời lượng (s)</span>
                        <input className="input" value={form.durationSeconds} onChange={(event) => setField("durationSeconds", event.target.value)} placeholder="15" />
                      </label>
                      <label className="field">
                        <span>Nhạc nền</span>
                        <input className="input" value={form.musicTrack} onChange={(event) => setField("musicTrack", event.target.value)} placeholder="VD: lofi-chill" />
                      </label>
                      <label className="field">
                        <span>Voiceover (Text)</span>
                        <input className="input" value={form.voiceoverText} onChange={(event) => setField("voiceoverText", event.target.value)} placeholder="Nội dung đọc" />
                      </label>
                    </div>

                    <label className="field">
                      <span>Lời chào đầu (Hook)</span>
                      <textarea className="input" value={form.hook} onChange={(event) => setField("hook", event.target.value)} rows={2} placeholder="Câu thu hút 3s đầu tiên..." />
                    </label>

                    <label className="field">
                      <span>Kịch bản chi tiết (Script)</span>
                      <textarea className="input" value={form.script} onChange={(event) => setField("script", event.target.value)} rows={3} placeholder="Mô tả nội dung video..." />
                    </label>

                    <label className="field">
                      <span>Phụ đề (Subtitles)</span>
                      <textarea className="input" value={form.subtitleText} onChange={(event) => setField("subtitleText", event.target.value)} rows={2} placeholder="Text hiển thị trên video..." />
                    </label>
                  </div>
                </section>

                {/* Section: Nâng cao */}
                <section>
                  <h3 style={{ fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-dim)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--text-dim)", boxShadow: "0 0 10px var(--text-dim)" }}></span>
                    Nâng cao & Metadata
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <label className="field">
                      <span>Sub ID</span>
                      <input className="input" value={form.subId} onChange={(event) => setField("subId", event.target.value)} placeholder="Tracking ID" />
                    </label>
                    <label className="field">
                      <span>Ghi chú nội bộ</span>
                      <input className="input" value={form.note} onChange={(event) => setField("note", event.target.value)} placeholder="Ghi chú chiến dịch" />
                    </label>
                  </div>
                </section>
              </>
            )}

            {form.jobType === "SHOPEE_LINK_CONVERT" && (
              <section>
                <h3 style={{ fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--primary)", marginBottom: "20px" }}>Cấu hình Chuyển đổi Link</h3>
                <div style={{ display: "grid", gap: "20px" }}>
                  <label className="field">
                    <span>Danh sách Link sản phẩm (mỗi dòng 1 link)</span>
                    <textarea className="input" value={form.productUrls} onChange={(event) => setField("productUrls", event.target.value)} rows={8} />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <label className="field">
                      <span>Affiliate ID</span>
                      <input className="input" value={form.affiliateId} onChange={(event) => setField("affiliateId", event.target.value)} />
                    </label>
                    <label className="field">
                      <span>Sub ID</span>
                      <input className="input" value={form.subId} onChange={(event) => setField("subId", event.target.value)} />
                    </label>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Previews */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="panel" style={{ padding: "24px", background: "rgba(139, 92, 246, 0.03)", border: "1px solid var(--primary-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>Video Pipeline Preview</h4>
                <span className="badge" style={{ background: "var(--primary)", color: "#fff" }}>{videoPreview.sourceType}</span>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                    <div style={{ color: "var(--text-dim)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px" }}>Template</div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{videoPreview.templateId}</div>
                  </div>
                  <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                    <div style={{ color: "var(--text-dim)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px" }}>Thời lượng</div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{videoPreview.durationSeconds}s</div>
                  </div>
                </div>

                <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "8px" }}>Quy trình xử lý</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {videoPreview.steps.map((step, i) => (
                      <div key={i} style={{ fontSize: "0.85rem", display: "flex", gap: "10px" }}>
                        <span style={{ color: "var(--primary)", fontWeight: 800 }}>{i + 1}.</span>
                        <span style={{ color: "var(--text-muted)" }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="panel" style={{ padding: "24px" }}>
              <h4 style={{ margin: "0 0 16px", fontSize: "1rem", fontWeight: 800 }}>Payload Preview (JSON)</h4>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "14px", padding: "16px", border: "1px solid var(--border)", maxHeight: "300px", overflow: "auto" }}>
                <pre style={{ margin: 0, fontSize: "0.75rem", fontFamily: "'Space Grotesk', monospace", color: "var(--accent)" }}>
                  {JSON.stringify(buildOptionsJson(form), null, 2)}
                </pre>
              </div>
            </div>

            {renderContractPanel(formContract)}
          </div>
        </div>
      </form>
    );
  }

  function renderCreatedList() {
    return (
      <div className="panel" style={{ padding: "40px" }}>
        <div className="panel-head" style={{ marginBottom: "40px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.8rem" }}>Chiến dịch đã thiết lập</h2>
            <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: "1.05rem" }}>
              Quản lý, theo dõi và vận hành các kịch bản Shopee Affiliate tự động.
            </p>
          </div>
          <button type="button" className="button button-primary" onClick={() => setActiveTab("config")}>
            + Thiết lập chiến dịch mới
          </button>
        </div>

        {jobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "100px", background: "rgba(255,255,255,0.02)", borderRadius: "24px", border: "2px dashed var(--border)" }}>
            <div style={{ fontSize: "4rem", marginBottom: "20px", opacity: 0.1 }}>📭</div>
            <h3 style={{ margin: "0 0 10px", color: "var(--text-muted)" }}>Hệ thống chưa có dữ liệu</h3>
            <p style={{ color: "var(--text-dim)", maxWidth: "400px", margin: "0 auto" }}>Bắt đầu bằng việc tạo một kịch bản Video Affiliate hoặc Link Convert đầu tiên.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "24px" }}>
            {jobs.map((job) => {
              const contract = getContract(job.jobType);
              const runs = sortDescByCreatedAt(job.runs);
              const latestRun = runs[0] ?? null;
              const latestMetrics = latestRun ? normalizeRunMetrics(latestRun) : {};

              return (
                <article
                  key={job.id}
                  className="panel"
                  style={{
                    padding: "24px",
                    border: selectedJobId === job.id ? "1px solid var(--primary)" : "1px solid var(--border)",
                    background: selectedJobId === job.id ? "rgba(139, 92, 246, 0.04)" : "rgba(255,255,255,0.02)",
                    boxShadow: selectedJobId === job.id ? "0 0 30px rgba(139, 92, 246, 0.05)" : "none"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "24px", alignItems: "start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "300px" }}>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                        <span className="badge" style={badgeStyle(job.status)}>{formatJobStatus(job.status)}</span>
                        {contract && <span className="badge" style={toneStyle(contract.stage)}>{contract.stage}</span>}
                        <span className="badge" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>{formatJobType(job.jobType).split(" ")[1]}</span>
                      </div>
                      <h3 style={{ margin: "0 0 12px", fontSize: "1.4rem", fontWeight: 800 }}>{getJobDisplayName(job)}</h3>

                      <div style={{ display: "flex", gap: "20px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ opacity: 0.5 }}>🕒</span> {job.mode === "once" ? "Chạy 1 lần" : "Chạy định kỳ"}
                        </div>
                        {job.scheduleCron && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ opacity: 0.5 }}>📅</span> <code>{job.scheduleCron}</code>
                          </div>
                        )}
                      </div>

                      {latestRun && (
                        <div style={{ marginTop: "16px", padding: "12px 16px", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", fontSize: "0.85rem" }}>
                          <span style={{ color: "var(--text-dim)" }}>Gần nhất:</span>{" "}
                          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{formatDateTime(latestRun.createdAt)}</span>{" "}
                          <span style={{ margin: "0 8px", opacity: 0.3 }}>|</span>
                          <span style={{ color: latestRun.status === "DONE" ? "var(--success)" : "var(--danger)" }}>
                            {latestRun.status === "DONE" ? (latestMetrics.note || "Thành công") : (latestRun.errorMessage || "Lỗi hệ thống")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button className="button button-ghost" onClick={() => selectJob(job.id)}>Chi tiết</button>
                      <button className="button button-soft" onClick={() => openEditForm(job)}>Sửa</button>
                      <button className="button button-primary" onClick={() => runJob(job.id)} disabled={busyJobId === job.id}>
                        {busyJobId === job.id ? "..." : "Kích hoạt"}
                      </button>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {job.status === "PAUSED" ? (
                          <button className="button button-soft" onClick={() => resumeJob(job.id)} disabled={busyJobId === job.id}>Tiếp tục</button>
                        ) : (
                          <button className="button button-soft" onClick={() => pauseJob(job.id)} disabled={busyJobId === job.id}>Tạm dừng</button>
                        )}
                        <button className="button button-soft" style={{ color: "var(--danger)" }} onClick={() => removeJob(job.id)} disabled={busyJobId === job.id}>Xóa</button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "24px" }}>
                    {[
                      { label: "Tổng lượt chạy", value: job.runs.length, icon: "📊" },
                      { label: "Thành công", value: job.runs.filter(r => r.status === "DONE").length, icon: "OK", color: "var(--success)" },
                      { label: "Thất bại", value: job.runs.filter(r => r.status === "FAILED").length, icon: "ERR", color: "var(--danger)" },
                      { label: "Hiệu suất", value: job.runs.length > 0 ? Math.round((job.runs.filter(r => r.status === "DONE").length / job.runs.length) * 100) + "%" : "0%", icon: "RATE" }
                    ].map((stat, i) => (
                      <div key={i} style={{ padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{stat.icon}</span> {stat.label}
                        </div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: stat.color || "inherit" }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderAssetLibrary() {
    const approvedCount = assets.filter((asset) => asset.approved).length;

    return (
      <div style={{ display: "grid", gap: "32px" }}>
        <div className="panel" style={{ padding: "32px" }}>
          <div className="panel-head" style={{ marginBottom: "24px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.8rem" }}>Thư viện Asset Thông minh</h2>
              <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: "1.05rem" }}>
                Hệ thống lưu trữ và quản lý tài nguyên Media phục vụ cho việc phối trộn video AI.
              </p>
            </div>
            <button type="button" className="button button-primary" onClick={openAssetCreate}>
              + Thêm tài nguyên mới
            </button>
          </div>

          <div className="content-grid" style={{ gridTemplateColumns: "1.4fr 0.6fr", gap: "24px", marginBottom: "32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <label className="field">
                <span>Bộ lọc thông minh</span>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    style={{ paddingLeft: "40px" }}
                    value={assetFilter}
                    onChange={(event) => setAssetFilter(event.target.value)}
                    placeholder="Tìm theo tên sản phẩm, nhãn dán, hoặc mã tài nguyên..."
                  />
                  <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}>🔍</span>
                </div>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(139, 92, 246, 0.05)", border: "1px solid var(--primary-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <strong style={{ color: "var(--primary)" }}>Enrich từ Shopee</strong>
                    <button type="button" className="button button-soft" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={enrichAssetsFromProduct} disabled={isSubmitting}>Kích hoạt</button>
                  </div>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>{form.productUrl ? "Nguồn: " + form.productUrl.slice(0, 40) + "..." : "Chưa chọn sản phẩm nguồn"}</div>
                </div>
                <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <strong>Nhập hàng loạt</strong>
                    <button type="button" className="button button-soft" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={importAssets} disabled={isSubmitting}>Import</button>
                  </div>
                  <textarea
                    className="input"
                    value={assetImportText}
                    onChange={(event) => setAssetImportText(event.target.value)}
                    rows={1}
                    style={{ fontSize: "0.75rem", background: "rgba(0,0,0,0.2)" }}
                    placeholder="CSV hoặc JSON data..."
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
              <div className="metric-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">Tổng tài nguyên</span>
                <span className="metric-value" style={{ fontSize: "2rem" }}>{assets.length}</span>
              </div>
              <div className="metric-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="metric-label">Đã phê duyệt</span>
                <span className="metric-value" style={{ fontSize: "2rem", color: "var(--success)" }}>{approvedCount}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {filteredAssets.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px", color: "var(--text-dim)" }}>
                Không tìm thấy tài nguyên phù hợp với từ khóa.
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <article key={asset.id} className="panel" style={{ padding: "16px", background: "rgba(255,255,255,0.02)", transition: "all 0.3s ease" }}>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div style={{ width: "80px", height: "80px", borderRadius: "12px", background: "#000", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", border: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "center", padding: 8 }}>
                      {asset.assetType === "VIDEO" ? "VID" : asset.assetType === "IMAGE" ? "IMG" : "TPL"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}>
                        <h4 style={{ margin: 0, fontSize: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{asset.label}</h4>
                        <span className="badge" style={badgeStyle(asset.approved ? "DONE" : "PAUSED")}>{asset.approved ? "Approved" : "Draft"}</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis" }}>{asset.sourceUrl}</div>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <span className="badge" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>{asset.assetType}</span>
                        <span className="badge" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>Dùng: {asset.usageCount}</span>
                        {asset.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="badge" style={{ fontSize: "0.65rem", padding: "2px 6px", background: "rgba(139, 92, 246, 0.1)" }}>#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "16px" }}>
                    <button className="button button-soft" style={{ padding: "8px", fontSize: "0.8rem" }} onClick={() => openAssetEdit(asset)}>Sửa</button>
                    <button className="button button-soft" style={{ padding: "8px", fontSize: "0.8rem" }} onClick={() => toggleAssetApproved(asset)}>{asset.approved ? "Nháp" : "Duyệt"}</button>
                    <button className="button button-soft" style={{ padding: "8px", fontSize: "0.8rem", color: "var(--danger)" }} onClick={() => removeAsset(asset)}>Xóa</button>
                  </div>
                  <button className="button button-primary" style={{ width: "100%", marginTop: "10px", padding: "8px", fontSize: "0.85rem" }} onClick={() => useAssetInConfig(asset)}>
                    Gắn vào cấu hình hiện tại
                  </button>
                </article>
              ))
            )}
          </div>
        </div>

        <form className="panel" style={{ padding: "32px", border: "1px solid var(--primary-border)", background: "rgba(139, 92, 246, 0.02)" }} onSubmit={submitAsset}>
          <div className="panel-head" style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: 0 }}>{editingAssetId ? "Cập nhật tài nguyên" : "Khai báo tài nguyên mới"}</h2>
            <button type="button" className="button button-ghost" onClick={() => { setEditingAssetId(null); setAssetForm(createDefaultAssetForm()); }}>Làm mới form</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <label className="field">
                <span>Tên định danh</span>
                <input className="input" value={assetForm.label} onChange={(e) => setAssetForm(prev => ({ ...prev, label: e.target.value }))} placeholder="VD: Video Review Quạt Mini A1" />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <label className="field">
                  <span>Loại tài nguyên</span>
                  <select className="input" value={assetForm.assetType} onChange={(e) => setAssetForm(prev => ({ ...prev, assetType: e.target.value as MediaAssetType }))}>
                    <option value="IMAGE">Hình ảnh (PNG/JPG)</option>
                    <option value="VIDEO">Video (MP4)</option>
                    <option value="AUDIO">Âm thanh (MP3)</option>
                    <option value="TEMPLATE">Template Pipeline</option>
                  </select>
                </label>
                <label className="field">
                  <span>Trạng thái</span>
                  <select className="input" value={assetForm.approved ? "yes" : "no"} onChange={(e) => setAssetForm(prev => ({ ...prev, approved: e.target.value === "yes" }))}>
                    <option value="yes">Đã phê duyệt</option>
                    <option value="no">Chờ xử lý (Draft)</option>
                  </select>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <label className="field">
                <span>Đường dẫn nguồn (URL)</span>
                <input className="input" value={assetForm.sourceUrl} onChange={(e) => setAssetForm(prev => ({ ...prev, sourceUrl: e.target.value }))} placeholder="https://..." />
              </label>
              <label className="field">
                <span>Tags (Phân cách bằng dấu phẩy)</span>
                <input className="input" value={assetForm.tags} onChange={(e) => setAssetForm(prev => ({ ...prev, tags: e.target.value }))} placeholder="quat-mini, review, hot-trend" />
              </label>
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", gap: "16px" }}>
            <button type="submit" className="button button-primary" style={{ flex: 1, padding: "14px" }} disabled={isSubmitting}>
              {isSubmitting ? "Hệ thống đang lưu..." : editingAssetId ? "Lưu thay đổi" : "Khai báo Asset"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderOverview() {
    return (
      <div style={{ display: "grid", gap: "32px" }}>
        <section className="metric-grid">
          <article className="metric-card">
            <div className="metric-label">Tổng chiến dịch</div>
            <div className="metric-value">{overview.totalConfigs}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--success)", marginTop: "8px" }}>📊 Active & Ready</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Đang xử lý</div>
            <div className="metric-value">{overview.runningRuns + overview.queuedRuns}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--primary)", marginTop: "8px" }}>Jobs in queue</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Tỷ lệ thành công</div>
            <div className="metric-value" style={{ color: "var(--success)" }}>{overview.successRate}%</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "8px" }}>Last 7 days avg</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Tổng lượt Run</div>
            <div className="metric-value">{overview.totalRuns}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "8px" }}>All-time executions</div>
          </article>
        </section>

        <div className="content-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div className="panel" style={{ padding: "32px" }}>
            <div className="panel-head" style={{ marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Trạng thái vận hành</h2>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              {([
                ["draft", overview.statusCounts.draft, "var(--text-dim)"],
                ["queued", overview.statusCounts.queued, "var(--primary)"],
                ["running", overview.statusCounts.running, "#fbbf24"],
                ["paused", overview.statusCounts.paused, "var(--danger)"],
                ["done", overview.statusCounts.done, "var(--success)"],
                ["failed", overview.statusCounts.failed, "#f87171"]
              ] as const).map(([status, count, color]) => (
                <div key={status} style={{ display: "flex", justifyContent: "space-between", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }}></div>
                    <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{formatJobStatus(status.toUpperCase())}</span>
                  </div>
                  <strong style={{ fontSize: "1.1rem" }}>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: "32px" }}>
            <div className="panel-head" style={{ marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Phân bổ Stage</h2>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              {([
                ["stable", overview.stageCounts.stable, "rgba(34, 197, 94, 0.1)"],
                ["beta", overview.stageCounts.beta, "rgba(139, 92, 246, 0.1)"],
                ["experimental", overview.stageCounts.experimental, "rgba(249, 115, 22, 0.1)"]
              ] as const).map(([stage, count, bg]) => (
                <div key={stage} style={{ display: "flex", justifyContent: "space-between", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                  <span className="badge" style={{ ...toneStyle(stage), padding: "6px 12px", background: bg }}>{stage}</span>
                  <strong style={{ fontSize: "1.1rem" }}>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: "32px" }}>
          <div className="panel-head" style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Báo cáo Hiệu năng Chiến dịch</h2>
          </div>

          {jobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>Chưa có dữ liệu chiến dịch.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tên chiến dịch</th>
                    <th>Loại</th>
                    <th>Stage</th>
                    <th>Trạng thái</th>
                    <th>Tổng Run</th>
                    <th>Thành công</th>
                    <th style={{ textAlign: "right" }}>Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const contract = getContract(job.jobType);
                    const successCount = job.runs.filter(r => r.status === "DONE").length;
                    const rate = job.runs.length > 0 ? Math.round((successCount / job.runs.length) * 100) : 0;

                    return (
                      <tr key={job.id} onClick={() => selectJob(job.id)} style={{ cursor: "pointer" }}>
                        <td className="table-main" style={{ fontWeight: 700 }}>{getJobDisplayName(job)}</td>
                        <td><span style={{ opacity: 0.7 }}>{formatJobType(job.jobType).split(" ")[1]}</span></td>
                        <td>{contract ? <span className="badge" style={toneStyle(contract.stage)}>{contract.stage}</span> : "-"}</td>
                        <td><span className="badge" style={badgeStyle(job.status)}>{formatJobStatus(job.status)}</span></td>
                        <td>{job.runs.length}</td>
                        <td style={{ color: "var(--success)" }}>{successCount}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: rate > 80 ? "var(--success)" : rate > 50 ? "#fbbf24" : "var(--danger)" }}>{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: "32px" }}>
          <div className="panel-head" style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Nhật ký Vận hành Hệ thống</h2>
          </div>

          {overview.latestRuns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>Hệ thống chưa ghi nhận lượt run nào.</div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {overview.latestRuns.map((run) => (
                <div key={`${run.jobId}-${run.createdAt}`} style={{ padding: "16px 20px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "4px" }}>{run.title}</div>
                    <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--primary)" }}>{formatJobType(run.jobType)}</span> • {formatDateTime(run.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span className="badge" style={badgeStyle(run.status)}>{formatJobStatus(run.status)}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.note}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDetail() {
    if (!selectedJob) {
      return (
        <div className="panel" style={{ padding: 100, textAlign: "center" }}>
          <h2 style={{ marginTop: 0, color: "var(--text-muted)" }}>Chua chon cau hinh chi tiet</h2>
          <p style={{ color: "var(--text-dim)", maxWidth: 420, margin: "0 auto" }}>
            Chon mot config ben tab Chien dich hoac Theo tung cau hinh de xem run, logs va metrics.
          </p>
        </div>
      );
    }

    const selectedRunMetrics = selectedRun ? normalizeRunMetrics(selectedRun) : {};
    const contract = selectedContract ?? getContract(selectedJob.jobType);
    const isRunning = selectedJob.status === "RUNNING" || selectedJob.status === "QUEUED";

    return (
      <div style={{ display: "grid", gap: 32 }}>
        <div className="content-grid" style={{ gridTemplateColumns: "1fr 400px", gap: 24 }}>
          <div className="panel" style={{ padding: 32 }}>
            <div className="panel-head" style={{ marginBottom: 32 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                  <span className="badge" style={badgeStyle(selectedJob.status)}>{formatJobStatus(selectedJob.status)}</span>
                  {contract ? <span className="badge" style={toneStyle(contract.stage)}>{contract.stage}</span> : null}
                </div>
                <h2 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>{getJobDisplayName(selectedJob)}</h2>
                <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: "1.05rem" }}>
                  {formatJobType(selectedJob.jobType)} <span style={{ color: "var(--primary)" }}>{formatJobMode(selectedJob.mode)}</span>
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Created", value: formatDateTime(selectedJob.createdAt) },
                { label: "Updated", value: formatDateTime(selectedJob.updatedAt) },
                { label: "Last run", value: formatDateTime(selectedJob.lastRunAt) },
                { label: "Next run", value: formatDateTime(selectedJob.nextRunAt) }
              ].map((item) => (
                <div key={item.label} style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                  <div style={{ fontWeight: 700, color: "var(--text-muted)" }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 24, background: "rgba(139, 92, 246, 0.05)", borderRadius: 20, border: "1px solid var(--primary-border)" }}>
              <button type="button" className="button button-primary" onClick={() => runJob(selectedJob.id)} disabled={busyJobId === selectedJob.id}>
                {busyJobId === selectedJob.id ? "Dang chay..." : "Run ngay"}
              </button>
              {selectedJob.status === "PAUSED" ? (
                <button type="button" className="button button-soft" onClick={() => resumeJob(selectedJob.id)} disabled={busyJobId === selectedJob.id}>
                  Tiep tuc
                </button>
              ) : (
                <button type="button" className="button button-soft" onClick={() => pauseJob(selectedJob.id)} disabled={busyJobId === selectedJob.id}>
                  Tam dung
                </button>
              )}
              <button type="button" className="button button-soft" onClick={() => openEditForm(selectedJob)}>
                Sua cau hinh
              </button>
              <button type="button" className="button button-soft" onClick={() => removeJob(selectedJob.id)} disabled={busyJobId === selectedJob.id}>
                Xoa
              </button>
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: "1px solid rgba(34, 197, 94, 0.22)", background: "rgba(34, 197, 94, 0.08)", color: "#bbf7d0" }}>
              {isRunning
                ? "Run dang di qua queue/worker. Trang nay se tu cap nhat khi co job_status hoac job_log moi."
                : "Run se day JobRun vao queue, worker xu ly va cap nhat ve RUNNING/DONE/FAILED."}
            </div>
          </div>

          {renderContractPanel(contract)}
        </div>

        <div className="content-grid" style={{ gridTemplateColumns: "0.95fr 1.05fr", gap: 20 }}>
          <div className="panel" style={{ padding: 24 }}>
            <div className="panel-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Options JSON</h2>
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-dim)" }}>
              {selectedJob.optionsJson}
            </pre>
          </div>

          <div className="panel" style={{ padding: 24 }}>
            <div className="panel-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Run gan nhat</h2>
            </div>
            {selectedRun ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Trang thai</div>
                    <div><span className="badge" style={badgeStyle(selectedRun.status)}>{formatJobStatus(selectedRun.status)}</span></div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Bat dau</div>
                    <div style={{ fontWeight: 700 }}>{formatDateTime(selectedRun.startedAt)}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Thoi gian</div>
                    <div style={{ fontWeight: 700 }}>{formatDuration(selectedRun.startedAt, selectedRun.finishedAt)}</div>
                  </div>
                </div>

                <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>Note / error</div>
                  <div>{selectedRun.status === "DONE" ? String(selectedRunMetrics.note ?? "Hoan thanh") : selectedRun.errorMessage ?? "-"}</div>
                </div>

                <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>Metrics</div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {JSON.stringify(selectedRunMetrics.metrics ?? selectedRunMetrics, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", margin: 0 }}>Chua co run nao.</p>
            )}
          </div>
        </div>

        <div className="panel" style={{ padding: 24 }}>
          <div className="panel-head" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Lich su chay</h2>
          </div>

          {selectedJobRuns.length === 0 ? (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Config nay chua co lan chay nao.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Trang thai</th>
                    <th>Bat dau</th>
                    <th>Ket thuc</th>
                    <th>Thoi gian</th>
                    <th>Ket qua</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedJobRuns.map((run) => (
                    <tr key={run.id} onClick={() => setSelectedRunId(run.id)} style={{ cursor: "pointer", background: selectedRunId === run.id ? "rgba(139, 92, 246, 0.06)" : "transparent" }}>
                      <td className="table-main">{run.id.slice(0, 8)}</td>
                      <td><span className="badge" style={badgeStyle(run.status)}>{formatJobStatus(run.status)}</span></td>
                      <td>{formatDateTime(run.startedAt)}</td>
                      <td>{formatDateTime(run.finishedAt)}</td>
                      <td>{formatDuration(run.startedAt, run.finishedAt)}</td>
                      <td style={{ maxWidth: 280, whiteSpace: "normal" }}>
                        {run.status === "DONE" ? String(normalizeRunMetrics(run).note ?? "Hoan thanh") : run.errorMessage ?? "-"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" className="button button-soft" onClick={(event) => { event.stopPropagation(); setSelectedRunId(run.id); }}>
                            Xem logs
                          </button>
                          {run.status === "FAILED" ? (
                            <button type="button" className="button button-soft" onClick={(event) => { event.stopPropagation(); void retryRun(run.id, selectedJob.id); }} disabled={busyRunId === run.id}>
                              {busyRunId === run.id ? "Dang retry..." : "Retry"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: 24 }}>
          <div className="panel-head" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Logs chi tiet</h2>
          </div>

          {!selectedRun ? (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Chon mot run de xem log.</p>
          ) : selectedRun.logs && selectedRun.logs.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {selectedRun.logs.map((log) => (
                <div key={log.id} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <strong>{log.level.toUpperCase()}</strong>
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{formatDateTime(log.createdAt)}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>{log.message}</div>
                  {log.payloadJson ? (
                    <pre style={{ marginTop: 10, marginBottom: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-dim)" }}>{log.payloadJson}</pre>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Run nay chua co log.</p>
          )}
        </div>
      </div>
    );
  } if (!verified) {
    return (
      <div className="auth-shell">
        <div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Đang tải Shopee Aff dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-grid" />
      <Sidebar userEmail={userEmail} workspaceId={workspaceId} userRole={userRole} />

      <main className="main">
        <header className="topbar" style={{ marginBottom: "40px" }}>
          <div>
            <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "8px" }}>
              Shopee <span style={{ color: "var(--primary)" }}>Affiliate</span> Hub
            </h1>
            <p style={{ fontSize: "1.1rem", color: "var(--text-muted)", maxWidth: "600px" }}>
              Hệ thống quản trị chiến dịch Affiliate Shopee.
            </p>
          </div>

          <div className="topbar-actions">
            <button type="button" className="button button-ghost" style={{ padding: "12px 20px" }} onClick={refreshRuntimeStatus} disabled={runtimeLoading || userRole !== "ADMIN"}>
              {runtimeLoading ? "Đang kiểm tra..." : "Kiểm tra hệ thống"}
            </button>
            <span className="badge" style={serviceStatusStyle(runtimeSystem?.queue.status ?? "OFFLINE")}>
              Queue {runtimeSystem?.queue.status ?? "OFFLINE"}
            </span>
            <button type="button" className="button button-soft" style={{ padding: "12px 24px" }} onClick={() => refreshJobs(workspaceId, selectedJobId)} disabled={isLoading}>
              {isLoading ? "Synchronizing..." : "Làm mới dữ liệu"}
            </button>
            <button type="button" className="button button-primary" style={{ padding: "12px 28px" }} onClick={() => { setActiveTab("config"); openCreateForm(); }}>
              + Khởi tạo Chiến dịch
            </button>
          </div>
        </header>

        {message && (
          <div className="panel" style={{
            marginBottom: "32px",
            padding: "20px 24px",
            background: "rgba(139, 92, 246, 0.08)",
            border: "1px solid var(--primary-border)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            animation: "fadeIn 0.5s ease"
          }}>
            <span style={{ fontSize: "1.4rem" }}>🔔</span>
            <div style={{ fontWeight: 600, color: "var(--text-muted)" }}>{message}</div>
          </div>
        )}

        <div style={{
          display: "flex",
          gap: "8px",
          padding: "8px",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border)",
          width: "fit-content",
          marginBottom: "40px",
          backdropFilter: "blur(10px)"
        }}>
          {([
            ["overview", "Tổng quan"],
            ["created", "Chiến dịch"],
            ["assets", "Thư viện Asset"],
            ["config", "Thiết lập"],
            ["detail", "Phân tích Job"],
            ["guide", "Tài liệu"]
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`button ${activeTab === key ? "button-primary" : "button-ghost"}`}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "12px 24px",
                borderRadius: "14px",
                fontSize: "0.95rem",
                fontWeight: activeTab === key ? 700 : 500,
                background: activeTab === key ? "var(--primary)" : "transparent",
                color: activeTab === key ? "#fff" : "var(--text-muted)",
                border: "none",
                boxShadow: activeTab === key ? "var(--shadow-glow)" : "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="tab-content-wrapper" style={{ animation: "slideUp 0.4s ease-out" }}>
          {activeTab === "guide" && renderGuide()}
          {activeTab === "config" && renderConfigForm()}
          {activeTab === "assets" && renderAssetLibrary()}
          {activeTab === "created" && renderCreatedList()}
          {activeTab === "overview" && renderOverview()}
          {activeTab === "detail" && renderDetail()}
        </div>
      </main>
    </div>
  );
}

