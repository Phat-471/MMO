require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "CommonJS",
    moduleResolution: "node"
  }
});

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildAffiliateVideoOptions,
  buildBatchVideoJob,
  buildContentDraft,
  buildContentOptions,
  buildLinkOptions,
  parseBatchContentItems,
  buildReupOptions,
  splitKeywords,
  toHashtag
} = require("../lib/shopee-aff");
const {
  buildScheduleCronFromPreset,
  formatSchedulePreset
} = require("../lib/content-calendar");

const contentForm = {
  audience: "Nguoi mua moi",
  angle: "Review thuc te",
  benefit: "Noi bat o gia tri san pham.",
  tone: "review",
  format: "post",
  targetChannel: "TIKTOK",
  keywords: "shopee, affiliate\nreview",
  cta: "Xem link de lay uu dai."
};

const affiliateForm = {
  productTitle: "Tai nghe Bluetooth",
  productUrl: "https://shopee.vn/product/seed-01",
  affiliateId: "AFF-SEED-001",
  subId: "admin",
  sourceUrl: "https://www.tiktok.com/@seed/video/1",
  targetPlatform: "SHOPEE",
  hook: "Hook cu",
  script: "Script cu",
  sourceLinks: ["https://shopee.vn/product/seed-01", "https://shopee.vn/product/seed-02"].join("\n")
};

test("splitKeywords trims and removes empty entries", () => {
  assert.deepEqual(splitKeywords("a, b\n\n c ,"), ["a", "b", "c"]);
});

test("toHashtag normalizes accents and punctuation", () => {
  assert.equal(toHashtag("Sản phẩm đẹp!"), "#sanphamdep");
});

test("buildContentDraft creates hook, caption, post and script", () => {
  const draft = buildContentDraft(affiliateForm.productTitle, contentForm);

  assert.match(draft.hook, /Tai nghe Bluetooth/);
  assert.match(draft.caption, /Nguoi mua moi/);
  assert.match(draft.caption, /#tainghebluetooth/);
  assert.match(draft.script, /CTA: Xem link de lay uu dai\./);
  assert.match(draft.post, /Review thuc te/);
});

test("build payload helpers create pipeline-ready options", () => {
  const draft = buildContentDraft(affiliateForm.productTitle, contentForm);

  assert.deepEqual(buildContentOptions(affiliateForm.productTitle, affiliateForm.productUrl, contentForm), {
    topic: "Tai nghe Bluetooth Review thuc te",
    tone: "review",
    keywords: ["shopee", "affiliate", "review"],
    audience: "Nguoi mua moi",
    format: "post",
    targetChannel: "TIKTOK",
    productUrl: affiliateForm.productUrl,
    productTitle: affiliateForm.productTitle,
    cta: "Xem link de lay uu dai."
  });

  assert.deepEqual(buildLinkOptions(affiliateForm.sourceLinks, affiliateForm.affiliateId, affiliateForm.subId), {
    productUrls: ["https://shopee.vn/product/seed-01", "https://shopee.vn/product/seed-02"],
    affiliateId: "AFF-SEED-001",
    subId: "admin"
  });

  assert.deepEqual(buildAffiliateVideoOptions(affiliateForm, draft), {
    sourceUrl: affiliateForm.sourceUrl,
    productUrl: affiliateForm.productUrl,
    affiliateId: affiliateForm.affiliateId,
    productTitle: affiliateForm.productTitle,
    hook: draft.hook,
    script: draft.script,
    targetPlatform: "SHOPEE"
  });

  assert.deepEqual(buildReupOptions(affiliateForm, draft.caption), {
    sourceUrl: affiliateForm.sourceUrl,
    targetPlatform: "SHOPEE",
    title: affiliateForm.productTitle,
    description: draft.caption,
    addWatermark: true,
    addCaptions: true
  });
});

test("buildBatchVideoJob picks tool and payload by platform", () => {
  const contentDraftForm = {
    ...contentForm,
    audience: "Dan van phong",
    angle: "Nhanh gon",
    keywords: "lap top, keycap"
  };

  const affiliateJob = buildBatchVideoJob(
    {
      productTitle: "Ban phim co",
      productUrl: "https://shopee.vn/product/seed-02",
      audience: "Dan van phong",
      angle: "Nhanh gon"
    },
    affiliateForm,
    contentDraftForm
  );

  assert.equal(affiliateJob.toolCode, "shopee-video-affiliate");
  assert.equal(affiliateJob.options.productTitle, "Ban phim co");
  assert.equal(affiliateJob.options.productUrl, "https://shopee.vn/product/seed-02");
  assert.equal(affiliateJob.options.targetPlatform, "SHOPEE");
  assert.match(affiliateJob.draft.hook, /Ban phim co/);

  const reupJob = buildBatchVideoJob(
    {
      productTitle: "Tai nghe Bluetooth",
      productUrl: "https://shopee.vn/product/seed-01"
    },
    {
      ...affiliateForm,
      targetPlatform: "TIKTOK"
    },
    contentDraftForm
  );

  assert.equal(reupJob.toolCode, "video-reup-tool");
  assert.equal(reupJob.options.targetPlatform, "TIKTOK");
  assert.equal(reupJob.options.title, "Tai nghe Bluetooth");
  assert.match(reupJob.options.description, /Tai nghe Bluetooth/);
});

test("parseBatchContentItems parses multiline product rows", () => {
  assert.deepEqual(
    parseBatchContentItems([
      "Tai nghe Bluetooth|https://shopee.vn/product/seed-01|Nguoi mua moi|Review thuc te",
      "Ban phim co|https://shopee.vn/product/seed-02||Nhanh - gon - dep"
    ].join("\n")),
    [
      {
        productTitle: "Tai nghe Bluetooth",
        productUrl: "https://shopee.vn/product/seed-01",
        audience: "Nguoi mua moi",
        angle: "Review thuc te"
      },
      {
        productTitle: "Ban phim co",
        productUrl: "https://shopee.vn/product/seed-02",
        audience: undefined,
        angle: "Nhanh - gon - dep"
      }
    ]
  );
});

test("buildScheduleCronFromPreset returns expected cron values", () => {
  assert.equal(buildScheduleCronFromPreset("immediate"), "");
  assert.equal(buildScheduleCronFromPreset("daily_morning"), "0 8 * * *");
  assert.equal(buildScheduleCronFromPreset("daily_evening"), "0 18 * * *");
  assert.equal(buildScheduleCronFromPreset("weekdays_morning"), "0 9 * * 1-5");
  assert.equal(buildScheduleCronFromPreset("weekends_morning"), "0 10 * * 6,0");
});

test("formatSchedulePreset returns readable labels", () => {
  assert.equal(formatSchedulePreset("daily_morning"), "Moi sang 8h");
  assert.equal(formatSchedulePreset("weekdays_morning"), "Ngay trong tuan 9h");
});
