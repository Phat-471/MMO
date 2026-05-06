import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "../apps/api/src/lib/password";

const prisma = new PrismaClient();

const plans: Array<{
  code: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  name: string;
  priceMonthly: Prisma.Decimal;
  maxAccounts: number;
  maxRunningJobs: number;
  maxWorkspaces: number;
  maxDailyFetches: number;
  features: string[];
}> = [
  {
    code: "FREE",
    name: "Miễn phí",
    priceMonthly: new Prisma.Decimal(0),
    maxAccounts: 5,
    maxRunningJobs: 1,
    maxWorkspaces: 1,
    maxDailyFetches: 100,
    features: ["Quản lý tài khoản cơ bản", "Thao tác thủ công"]
  },
  {
    code: "STARTER",
    name: "Starter",
    priceMonthly: new Prisma.Decimal(99000),
    maxAccounts: 50,
    maxRunningJobs: 3,
    maxWorkspaces: 2,
    maxDailyFetches: 1000,
    features: ["Tự động hóa lịch chạy", "Dashboard sử dụng", "Cảnh báo tài khoản"]
  },
  {
    code: "PRO",
    name: "Pro",
    priceMonthly: new Prisma.Decimal(299000),
    maxAccounts: 300,
    maxRunningJobs: 10,
    maxWorkspaces: 5,
    maxDailyFetches: 10000,
    features: ["Hàng đợi ưu tiên", "Báo cáo nâng cao", "Hỗ trợ nhiều workspace"]
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    priceMonthly: new Prisma.Decimal(0),
    maxAccounts: 1000,
    maxRunningJobs: 50,
    maxWorkspaces: 20,
    maxDailyFetches: 100000,
    features: ["Hạn mức tùy chỉnh", "Hỗ trợ riêng", "Tích hợp theo yêu cầu"]
  }
];

const tools: Array<{
  code: string;
  name: string;
  description: string;
  category: "FACEBOOK" | "TIKTOK" | "DATA" | "AUTOMATION" | "SYSTEM";
  config: Record<string, unknown>;
}> = [
  {
    code: "facebook-post-fetcher",
    name: "Lấy bài viết Facebook",
    description: "Thu thập danh sách bài viết, thời gian đăng và chủ đề cơ bản từ tài khoản Facebook.",
    category: "FACEBOOK",
    config: { jobType: "FETCH_POSTS", platform: "FACEBOOK" }
  },
  {
    code: "facebook-comment-fetcher",
    name: "Lấy bình luận Facebook",
    description: "Thu thập bình luận theo bài viết phục vụ lưu dữ liệu và chuẩn bị báo cáo.",
    category: "FACEBOOK",
    config: { jobType: "FETCH_COMMENTS", platform: "FACEBOOK" }
  },
  {
    code: "tiktok-profile-checker",
    name: "Kiểm tra hồ sơ TikTok",
    description: "Kiểm tra trạng thái hồ sơ, thông tin công khai và dấu hiệu giới hạn của tài khoản TikTok.",
    category: "TIKTOK",
    config: { jobType: "FETCH_PROFILE", platform: "TIKTOK" }
  },
  {
    code: "tiktok-video-fetcher",
    name: "Lấy video TikTok",
    description: "Lấy video từ user hoặc hashtag TikTok.",
    category: "TIKTOK",
    config: { jobType: "FETCH_VIDEOS", platform: "TIKTOK" }
  },
  {
    code: "facebook-group-poster",
    name: "Đăng bài group Facebook",
    description: "Tự động đăng bài lên các hội nhóm Facebook.",
    category: "FACEBOOK",
    config: { jobType: "POST_GROUP", platform: "FACEBOOK" }
  },
  {
    code: "facebook-account-nurturer",
    name: "Nuôi tài khoản Facebook",
    description: "Mô phỏng hành động người dùng để tăng trust cho tài khoản Facebook.",
    category: "AUTOMATION",
    config: { jobType: "NURTURE_ACCOUNT", platform: "FACEBOOK" }
  },
  {
    code: "facebook-auto-liker",
    name: "Auto Like Facebook",
    description: "Tự động thích bài viết chỉ định.",
    category: "AUTOMATION",
    config: { jobType: "AUTO_LIKE", platform: "FACEBOOK" }
  },
  {
    code: "facebook-auto-commenter",
    name: "Auto Comment Facebook",
    description: "Tự động bình luận vào bài viết chỉ định.",
    category: "AUTOMATION",
    config: { jobType: "AUTO_COMMENT", platform: "FACEBOOK" }
  },
  {
    code: "account-health-monitor",
    name: "Theo dõi sức khỏe tài khoản",
    description: "Tổng hợp cảnh báo tài khoản chết, giới hạn hoặc chưa kiểm tra trong workspace.",
    category: "SYSTEM",
    config: { jobType: "ACCOUNT_HEALTH", platform: "FACEBOOK" }
  },
  {
    code: "facebook-group-moderation",
    name: "Duyệt group Facebook",
    description: "Kiểm duyệt bài viết và phân loại nội dung trong group Facebook theo từ khóa chặn.",
    category: "FACEBOOK",
    config: { jobType: "GROUP_MODERATION", platform: "FACEBOOK" }
  },
  {
    code: "tiktok-keyword-monitor",
    name: "Theo dõi từ khóa TikTok",
    description: "Theo dõi keyword và hashtag trên TikTok để tạo cảnh báo nhanh.",
    category: "TIKTOK",
    config: { jobType: "KEYWORD_MONITOR", platform: "TIKTOK" }
  },
  {
    code: "workflow-builder",
    name: "Workflow Builder",
    description: "Lập workflow nhiều bước để chạy chuỗi tool và cảnh báo theo thứ tự.",
    category: "AUTOMATION",
    config: { jobType: "WORKFLOW_BUILD", platform: "FACEBOOK" }
  },
  {
    code: "data-export",
    name: "Xuất dữ liệu",
    description: "Chuẩn bị dữ liệu snapshot để xuất báo cáo CSV hoặc JSON.",
    category: "DATA",
    config: { jobType: "EXPORT_DATA", platform: "DATA", formats: ["csv", "json"] }
  },
  {
    code: "ai-content-writer",
    name: "AI Content Writer",
    description: "Sử dụng AI để tạo nội dung bài viết và bình luận độc nhất, tránh bị quét trùng lặp.",
    category: "AUTOMATION",
    config: { jobType: "AI_CONTENT", platform: "FACEBOOK" }
  },
  {
    code: "facebook-marketplace-scanner",
    name: "Quét Marketplace FB",
    description: "Theo dõi giá và tìm kiếm sản phẩm theo từ khóa trên Marketplace.",
    category: "DATA",
    config: { jobType: "MARKETPLACE_SCAN", platform: "FACEBOOK" }
  },
  {
    code: "facebook-bulk-messaging",
    name: "Gửi tin nhắn hàng loạt",
    description: "Gửi tin nhắn tiếp cận khách hàng theo danh sách UID hoặc tin nhắn chờ.",
    category: "AUTOMATION",
    config: { jobType: "BULK_MSG", platform: "FACEBOOK" }
  },
  {
    code: "facebook-auto-joiner",
    name: "Tự động vào Group",
    description: "Tìm kiếm và tự động tham gia các nhóm theo từ khóa mục tiêu.",
    category: "AUTOMATION",
    config: { jobType: "AUTO_JOIN_GROUP", platform: "FACEBOOK" }
  },
  {
    code: "tiktok-auto-dm",
    name: "Auto DM TikTok",
    description: "Gửi tin nhắn trực tiếp cho người follow hoặc danh sách user TikTok.",
    category: "AUTOMATION",
    config: { jobType: "AUTO_DM", platform: "TIKTOK" }
  },
  {
    code: "password-changer",
    name: "Đổi mật khẩu hàng loạt",
    description: "Tự động đổi mật khẩu cho danh sách tài khoản để bảo mật.",
    category: "SYSTEM",
    config: { jobType: "CHANGE_PASSWORD", platform: "FACEBOOK" }
  },
  {
    code: "account-reg-tool",
    name: "Reg tài khoản tự động",
    description: "Hỗ trợ quy trình đăng ký tài khoản mới tự động.",
    category: "SYSTEM",
    config: { jobType: "REG_ACCOUNT", platform: "FACEBOOK" }
  },
  {
    code: "video-reup-tool",
    name: "Reup Video đa nền tảng",
    description: "Tự động tải video từ nguồn và đăng lên TikTok/YouTube Shorts.",
    category: "AUTOMATION",
    config: { jobType: "REUP_VIDEO", platform: "YOUTUBE" }
  },
  {
    code: "proxy-checker",
    name: "Kiểm tra Proxy",
    description: "Kiểm tra trạng thái sống/chết và tốc độ (latency) của Proxy tài khoản.",
    category: "SYSTEM",
    config: { jobType: "CHECK_PROXY", platform: "FACEBOOK" }
  },
  {
    code: "shopee-video-affiliate",
    name: "Shopee Video Affiliate (PRO)",
    description: "Hệ thống tự động chuyên sâu: Reup video, AI Upscale, Auto Captions và kẹp link Affiliate Shopee Video.",
    category: "AUTOMATION",
    config: { jobType: "SHOPEE_VIDEO_AFF", platform: "SHOPEE" }
  },
  {
    code: "shopee-trending",
    name: "Shopee Trending Discovery",
    description: "Tự động tìm kiếm các sản phẩm đang có xu hướng bán chạy và hoa hồng cao trên Shopee.",
    category: "DATA",
    config: { jobType: "SHOPEE_TRENDING", platform: "SHOPEE" }
  },
  {
    code: "shopee-link-converter",
    name: "Shopee Link Bulk Converter",
    description: "Chuyển đổi danh sách hàng ngàn link sản phẩm sang link Affiliate của bạn chỉ trong vài giây.",
    category: "SYSTEM",
    config: { jobType: "SHOPEE_LINK_CONVERT", platform: "SHOPEE" }
  },
  {
    code: "system-stress-test",
    name: "Stress Test (WebSocket)",
    description: "Chạy tác vụ giả lập kéo dài để kiểm tra log và trạng thái real-time qua WebSocket.",
    category: "SYSTEM",
    config: { jobType: "STRESS_TEST", platform: "SYSTEM" }
  }
];

const seedUsers = [
  {
    email: "admin@mmo.local",
    password: "12345678",
    role: "ADMIN" as const
  },
  {
    email: "client@mmo.local",
    password: "12345678",
    role: "USER" as const
  },
  {
    email: "operator@mmo.local",
    password: "12345678",
    role: "USER" as const
  }
];

const testKeys = {
  tool: {
    facebookPostFetcher: "TK-FB-POST-001",
    facebookCommentFetcher: "TK-FB-COMMENT-001",
    tiktokProfileChecker: "TK-TT-PROFILE-001",
    accountHealthMonitor: "TK-HEALTH-001",
    dataExport: "TK-EXPORT-001",
    proxyCheck: "TK-PROXY-001",
    groupModeration: "TK-GROUP-001",
    keywordMonitor: "TK-TT-KEYWORD-001",
    workflowBuilder: "TK-WORKFLOW-001",
    aiContentWriter: "TK-AI-CONTENT-001",
    shopeeVideoAffiliate: "TK-SHOPEE-AFF-001",
    shopeeLinkConverter: "TK-SHOPEE-LINK-001",
    reupVideo: "TK-REUP-001"
  },
  job: {
    facebookPosts: "JOB-FB-POST-001",
    facebookComments: "JOB-FB-COMMENT-001",
    proxyCheck: "JOB-PROXY-001",
    accountHealth: "JOB-HEALTH-001",
    groupModeration: "JOB-GROUP-001",
    keywordMonitor: "JOB-TT-KEYWORD-001",
    workflowBuild: "JOB-WORKFLOW-001",
    aiContentWriter: "JOB-AI-CONTENT-001",
    shopeeVideoAffiliate: "JOB-SHOPEE-AFF-001",
    shopeeLinkConvert: "JOB-SHOPEE-LINK-001",
    reupVideo: "JOB-REUP-001"
  }
} as const;

const seedWorkspaces = [
  {
    slug: "workspace-test-mmo",
    name: "Growth Lab",
    ownerEmail: "client@mmo.local",
    members: [
      { email: "operator@mmo.local", role: "USER" as const }
    ],
    planCode: "FREE" as const
  },
  {
    slug: "workspace-admin-mmo",
    name: "Admin Ops",
    ownerEmail: "admin@mmo.local",
    members: [
      { email: "client@mmo.local", role: "USER" as const }
    ],
    planCode: "PRO" as const
  },
  {
    slug: "workspace-bot-lab",
    name: "Automation Hub",
    ownerEmail: "operator@mmo.local",
    members: [
      { email: "client@mmo.local", role: "USER" as const }
    ],
    planCode: "STARTER" as const
  }
];

const seedAccounts = [
  {
    workspaceSlug: "workspace-test-mmo",
    label: "FB-GROWTH-01",
    platform: "FACEBOOK" as const,
    status: "ALIVE" as const,
    tag: "growth",
    groupName: "Growth",
    note: "Tài khoản Facebook chính cho workspace growth"
  },
  {
    workspaceSlug: "workspace-test-mmo",
    label: "TT-GROWTH-01",
    platform: "TIKTOK" as const,
    status: "PENDING" as const,
    tag: "content",
    groupName: "Content",
    note: "Tài khoản TikTok cho workflow nội dung"
  },
  {
    workspaceSlug: "workspace-test-mmo",
    label: "SHOPEE-AFF-01",
    platform: "SHOPEE" as const,
    status: "ALIVE" as const,
    tag: "affiliate",
    groupName: "Affiliate",
    note: "Tài khoản Shopee dùng cho luồng affiliate"
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    label: "SHOPEE-AFF-01",
    platform: "SHOPEE" as const,
    status: "ALIVE" as const,
    tag: "affiliate",
    groupName: "Affiliate",
    note: "Tài khoản Shopee dùng cho workspace admin affiliate"
  },
  {
    workspaceSlug: "workspace-bot-lab",
    label: "FB-OPS-01",
    platform: "FACEBOOK" as const,
    status: "LIMITED" as const,
    tag: "ops",
    groupName: "Ops",
    note: "Tài khoản Facebook dùng để theo dõi sức khỏe và hạn mức"
  },
  {
    workspaceSlug: "workspace-bot-lab",
    label: "YT-CONTENT-01",
    platform: "YOUTUBE" as const,
    status: "ALIVE" as const,
    tag: "video",
    groupName: "Video",
    note: "Tài khoản YouTube dùng cho reup shorts"
  }
];

const seedWorkspaceTools = [
  {
    workspaceSlug: "workspace-test-mmo",
    toolCode: "proxy-checker",
    enabled: true,
    settingsJson: JSON.stringify({
      proxy: "127.0.0.1:8080:seed:seed",
      targetUrl: "https://api.ipify.org?format=json",
      testKey: testKeys.tool.proxyCheck
    })
  },
  {
    workspaceSlug: "workspace-test-mmo",
    toolCode: "facebook-post-fetcher",
    enabled: true,
    settingsJson: JSON.stringify({
      pageId: "page-growth-01",
      limit: 20,
      testKey: testKeys.tool.facebookPostFetcher
    })
  },
  {
    workspaceSlug: "workspace-test-mmo",
    toolCode: "account-health-monitor",
    enabled: true,
    settingsJson: JSON.stringify({
      accountLabel: "FB-GROWTH-01",
      targetUrl: "https://www.facebook.com/",
      threshold: "normal",
      testKey: testKeys.tool.accountHealthMonitor
    })
  },
  {
    workspaceSlug: "workspace-test-mmo",
    toolCode: "facebook-group-moderation",
    enabled: true,
    settingsJson: JSON.stringify({
      groupId: "growth-lab",
      groupName: "Growth Lab",
      bannedKeywords: ["spam", "sale"],
      posts: [
        { id: "post-1", author: "user1", content: "Mau quang cao spam" },
        { id: "post-2", author: "user2", content: "Hoi ve kinh nghiem MMO" }
      ],
      testKey: testKeys.tool.groupModeration
    })
  },
  {
    workspaceSlug: "workspace-test-mmo",
    toolCode: "shopee-video-affiliate",
    enabled: true,
    settingsJson: JSON.stringify({
      sourceUrl: "https://www.tiktok.com/@seed/video/1",
      productUrl: "https://shopee.vn/product/seed-01",
      productTitle: "Shopee deal seed",
      affiliateId: "AFF-SEED-001",
      hook: "San pham dang duoc mua nhieu.",
      script: "Mo ta loi ich san pham, gia va CTA.",
      targetPlatform: "SHOPEE",
      testKey: testKeys.tool.shopeeVideoAffiliate
    })
  },
  {
    workspaceSlug: "workspace-test-mmo",
    toolCode: "shopee-link-converter",
    enabled: true,
    settingsJson: JSON.stringify({
      productUrls: [
        "https://shopee.vn/product/seed-01",
        "https://shopee.vn/product/seed-02"
      ],
      affiliateId: "AFF-SEED-001",
      subId: "client",
      testKey: testKeys.tool.shopeeLinkConverter
    })
  },
  {
    workspaceSlug: "workspace-test-mmo",
    toolCode: "video-reup-tool",
    enabled: true,
    settingsJson: JSON.stringify({
      sourceUrl: "https://www.youtube.com/shorts/seed01",
      targetPlatform: "YOUTUBE",
      title: "Reup video seed",
      description: "Video marketing cho YouTube Shorts",
      addWatermark: true,
      addCaptions: true,
      testKey: testKeys.tool.reupVideo
    })
  },
  {
    workspaceSlug: "workspace-test-mmo",
    toolCode: "ai-content-writer",
    enabled: true,
    settingsJson: JSON.stringify({
      topic: "Shopee review",
      tone: "Review",
      keywords: ["shopee", "affiliate", "review"],
      testKey: testKeys.tool.aiContentWriter
    })
  },
  {
    workspaceSlug: "workspace-bot-lab",
    toolCode: "tiktok-keyword-monitor",
    enabled: true,
    settingsJson: JSON.stringify({
      keywords: ["mmo", "affiliate"],
      hashtags: ["growth"],
      limit: 10,
      testKey: testKeys.tool.keywordMonitor
    })
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    toolCode: "workflow-builder",
    enabled: true,
    settingsJson: JSON.stringify({
      workflowName: "Growth workflow",
      dryRun: true,
      steps: [
        { code: "monitor", name: "Monitor keywords" },
        { code: "moderate", name: "Moderate posts" }
      ],
      testKey: testKeys.tool.workflowBuilder
    })
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    toolCode: "ai-content-writer",
    enabled: true,
    settingsJson: JSON.stringify({
      topic: "Product content",
      tone: "Review",
      keywords: ["content", "caption", "video"],
      testKey: testKeys.tool.aiContentWriter
    })
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    toolCode: "shopee-video-affiliate",
    enabled: true,
    settingsJson: JSON.stringify({
      sourceUrl: "https://www.tiktok.com/@seed/video/1",
      productUrl: "https://shopee.vn/product/seed-01",
      productTitle: "Shopee deal seed",
      affiliateId: "AFF-SEED-001",
      hook: "San pham dang duoc mua nhieu.",
      script: "Mo ta loi ich san pham, gia va CTA.",
      targetPlatform: "SHOPEE",
      testKey: testKeys.tool.shopeeVideoAffiliate
    })
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    toolCode: "shopee-link-converter",
    enabled: true,
    settingsJson: JSON.stringify({
      productUrls: [
        "https://shopee.vn/product/seed-01",
        "https://shopee.vn/product/seed-02"
      ],
      affiliateId: "AFF-SEED-001",
      subId: "admin",
      testKey: testKeys.tool.shopeeLinkConverter
    })
  },
  {
    workspaceSlug: "workspace-bot-lab",
    toolCode: "video-reup-tool",
    enabled: true,
    settingsJson: JSON.stringify({
      sourceUrl: "https://www.youtube.com/shorts/seed01",
      targetPlatform: "YOUTUBE",
      title: "Reup video seed",
      description: "Video marketing cho YouTube Shorts",
      addWatermark: true,
      addCaptions: true,
      testKey: testKeys.tool.reupVideo
    })
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    toolCode: "data-export",
    enabled: true,
    settingsJson: JSON.stringify({
      format: "json",
      testKey: testKeys.tool.dataExport
    })
  },
  {
    workspaceSlug: "workspace-bot-lab",
    toolCode: "tiktok-profile-checker",
    enabled: true,
    settingsJson: JSON.stringify({
      profileMode: "public",
      testKey: testKeys.tool.tiktokProfileChecker
    })
  }
];

const seedJobs = [
  {
    workspaceSlug: "workspace-test-mmo",
    accountLabel: "FB-GROWTH-01",
    platform: "FACEBOOK" as const,
    jobType: "FETCH_POSTS" as const,
    mode: "ONCE" as const,
    status: "FAILED" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.facebookPosts,
      source: "local-seed",
      pageId: "page-growth-01"
    }),
    scheduleCron: null,
    run: {
      status: "FAILED" as const,
      errorMessage: "Khong doc duoc mot so bai viet tu trang theo doi.",
      metricsJson: JSON.stringify({
        fetched: 12,
        failed: 2
      }),
      logs: [
        {
          level: "INFO",
          message: "Khoi dong job thu du lieu.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "ERROR",
          message: "Khong the doc mot so bai viet.",
          payloadJson: JSON.stringify({ step: "fetch", code: 502 })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-test-mmo",
    accountLabel: "FB-GROWTH-01",
    platform: "FACEBOOK" as const,
    jobType: "AI_CONTENT" as const,
    mode: "ONCE" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.aiContentWriter,
      topic: "Shopee review",
      tone: "Review",
      keywords: ["shopee", "affiliate", "review"]
    }),
    scheduleCron: null,
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        generated: 3,
        tokensUsed: 150
      }),
      logs: [
        {
          level: "INFO",
          message: "Khoi tao AI content writer.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "SUCCESS",
          message: "Da tao noi dung bai viet.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-bot-lab",
    accountLabel: "FB-OPS-01",
    platform: "FACEBOOK" as const,
    jobType: "FETCH_COMMENTS" as const,
    mode: "SCHEDULED" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.facebookComments,
      source: "local-seed",
      pageId: "page-ops-01"
    }),
    scheduleCron: "0 * * * *",
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        fetched: 48,
        comments: 132
      }),
      logs: [
        {
          level: "INFO",
          message: "Run da bat dau.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "INFO",
          message: "Run da hoan tat.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-test-mmo",
    accountLabel: "FB-GROWTH-01",
    platform: "FACEBOOK" as const,
    jobType: "CHECK_PROXY" as const,
    mode: "ONCE" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.proxyCheck,
      targetUrl: "https://api.ipify.org?format=json",
      proxy: "127.0.0.1:8080:seed:seed"
    }),
    scheduleCron: null,
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        checked: 1,
        live: 1,
        dead: 0
      }),
      logs: [
        {
          level: "INFO",
          message: "Bat dau kiem tra proxy.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "SUCCESS",
          message: "Proxy live va dung latency.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-test-mmo",
    accountLabel: "FB-GROWTH-01",
    platform: "FACEBOOK" as const,
    jobType: "ACCOUNT_HEALTH" as const,
    mode: "ONCE" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.accountHealth,
      accountLabel: "FB-GROWTH-01",
      targetUrl: "https://www.facebook.com/",
      threshold: "normal"
    }),
    scheduleCron: null,
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        score: 88,
        alerts: 1
      }),
      logs: [
        {
          level: "INFO",
          message: "Bat dau kiem tra suc khoe tai khoan.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "INFO",
          message: "Tai khoan on dinh, co 1 canh bao nhe.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-test-mmo",
    accountLabel: "FB-GROWTH-01",
    platform: "FACEBOOK" as const,
    jobType: "GROUP_MODERATION" as const,
    mode: "ONCE" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.groupModeration,
      groupId: "growth-lab",
      groupName: "Growth Lab",
      bannedKeywords: ["spam", "sale"],
      posts: [
        { id: "post-1", author: "user1", content: "Mau quang cao spam" },
        { id: "post-2", author: "user2", content: "Hoi ve kinh nghiem MMO" }
      ]
    }),
    scheduleCron: null,
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        reviewedCount: 2,
        approvedCount: 1,
        rejectedCount: 1
      }),
      logs: [
        {
          level: "INFO",
          message: "Bat dau duyet group.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "SUCCESS",
          message: "Da duyet xong 2 bai.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-bot-lab",
    accountLabel: "TT-GROWTH-01",
    platform: "TIKTOK" as const,
    jobType: "KEYWORD_MONITOR" as const,
    mode: "SCHEDULED" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.keywordMonitor,
      keywords: ["mmo", "affiliate"],
      hashtags: ["growth"],
      limit: 10
    }),
    scheduleCron: "*/30 * * * *",
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        alertsFound: 3
      }),
      logs: [
        {
          level: "INFO",
          message: "Bat dau theo doi tu khoa TikTok.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "SUCCESS",
          message: "Da tao 3 canh bao keyword.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    accountLabel: "FB-GROWTH-01",
    platform: "FACEBOOK" as const,
    jobType: "WORKFLOW_BUILD" as const,
    mode: "ONCE" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.workflowBuild,
      workflowName: "Growth workflow",
      dryRun: true,
      steps: [
        { code: "monitor", name: "Monitor keywords" },
        { code: "moderate", name: "Moderate posts" }
      ]
    }),
    scheduleCron: null,
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        totalSteps: 2,
        enabledSteps: 2
      }),
      logs: [
        {
          level: "INFO",
          message: "Xay workflow 2 buoc.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "SUCCESS",
          message: "Workflow builder da hoan tat.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    accountLabel: "SHOPEE-AFF-01",
    platform: "SHOPEE" as const,
    jobType: "SHOPEE_VIDEO_AFF" as const,
    mode: "ONCE" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.shopeeVideoAffiliate,
      sourceUrl: "https://www.tiktok.com/@seed/video/1",
      productUrl: "https://shopee.vn/product/seed-01",
      productTitle: "Shopee deal seed",
      affiliateId: "AFF-SEED-001",
      hook: "San pham dang duoc mua nhieu.",
      script: "Mo ta loi ich san pham, gia va CTA."
    }),
    scheduleCron: null,
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        videosBuilt: 1,
        affiliateLinksGenerated: 1
      }),
      logs: [
        {
          level: "INFO",
          message: "Bat dau pipeline Shopee Affiliate.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "SUCCESS",
          message: "Da tao video affiliate.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    accountLabel: "SHOPEE-AFF-01",
    platform: "SHOPEE" as const,
    jobType: "SHOPEE_LINK_CONVERT" as const,
    mode: "ONCE" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.shopeeLinkConvert,
      productUrls: [
        "https://shopee.vn/product/seed-01",
        "https://shopee.vn/product/seed-02"
      ],
      affiliateId: "AFF-SEED-001",
      subId: "admin"
    }),
    scheduleCron: null,
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        convertedCount: 2
      }),
      logs: [
        {
          level: "INFO",
          message: "Bat dau chuyen doi link Shopee.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "SUCCESS",
          message: "Da chuyen doi xong 2 link.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  },
  {
    workspaceSlug: "workspace-bot-lab",
    accountLabel: "YT-CONTENT-01",
    platform: "YOUTUBE" as const,
    jobType: "REUP_VIDEO" as const,
    mode: "ONCE" as const,
    status: "DONE" as const,
    optionsJson: JSON.stringify({
      testKey: testKeys.job.reupVideo,
      sourceUrl: "https://www.youtube.com/shorts/seed01",
      targetPlatform: "YOUTUBE",
      title: "Reup video seed",
      description: "Video marketing cho YouTube Shorts",
      addWatermark: true,
      addCaptions: true
    }),
    scheduleCron: null,
    run: {
      status: "DONE" as const,
      errorMessage: null,
      metricsJson: JSON.stringify({
        outputReady: 1
      }),
      logs: [
        {
          level: "INFO",
          message: "Bat dau pipeline reup video.",
          payloadJson: JSON.stringify({ step: "start" })
        },
        {
          level: "SUCCESS",
          message: "Da chuan bi video cho YouTube.",
          payloadJson: JSON.stringify({ step: "done" })
        }
      ]
    }
  }
];

const seedBillingUsages = [
  {
    workspaceSlug: "workspace-test-mmo",
    daysAgo: 0,
    fetchCount: 24,
    runningJobCountPeak: 2,
    accountCount: 2
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    daysAgo: 0,
    fetchCount: 86,
    runningJobCountPeak: 4,
    accountCount: 0
  },
  {
    workspaceSlug: "workspace-bot-lab",
    daysAgo: 0,
    fetchCount: 12,
    runningJobCountPeak: 1,
    accountCount: 1
  },
  {
    workspaceSlug: "workspace-test-mmo",
    daysAgo: 1,
    fetchCount: 40,
    runningJobCountPeak: 3,
    accountCount: 2
  }
];

const seedNotifications = [
  {
    workspaceSlug: "workspace-test-mmo",
    userEmail: "client@mmo.local",
    title: "Han muc fetch sap dat",
    content: "Workspace Growth Lab dang su dung gan het han muc lay du lieu hom nay.",
    type: "WARNING" as const,
    isRead: false
  },
  {
    workspaceSlug: "workspace-test-mmo",
    userEmail: "operator@mmo.local",
    title: "Job test da hoan tat",
    content: "Tac vu lay bai viet Facebook da chay xong va co log de kiem tra.",
    type: "SUCCESS" as const,
    isRead: true
  },
  {
    workspaceSlug: "workspace-admin-mmo",
    userEmail: "admin@mmo.local",
    title: "Trang thai DB on dinh",
    content: "Kiem tra ket noi MySQL va truy van dashboard da tra ve du lieu that.",
    type: "INFO" as const,
    isRead: false
  },
  {
    workspaceSlug: "workspace-bot-lab",
    userEmail: "operator@mmo.local",
    title: "Canh bao tai khoan",
    content: "Tai khoan FB-OPS-01 dang o trang thai LIMITED.",
    type: "WARNING" as const,
    isRead: false
  }
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        maxAccounts: plan.maxAccounts,
        maxRunningJobs: plan.maxRunningJobs,
        maxWorkspaces: plan.maxWorkspaces,
        maxDailyFetches: plan.maxDailyFetches,
        featuresJson: JSON.stringify(plan.features)
      },
      create: {
        code: plan.code,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        maxAccounts: plan.maxAccounts,
        maxRunningJobs: plan.maxRunningJobs,
        maxWorkspaces: plan.maxWorkspaces,
        maxDailyFetches: plan.maxDailyFetches,
        featuresJson: JSON.stringify(plan.features)
      }
    });
  }

  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { code: tool.code },
      update: {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        status: "ACTIVE",
        configJson: JSON.stringify(tool.config)
      },
      create: {
        code: tool.code,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        status: "ACTIVE",
        configJson: JSON.stringify(tool.config)
      }
    });
  }

  for (const item of seedUsers) {
    await prisma.user.upsert({
      where: { email: item.email },
      update: {
        passwordHash: hashPassword(item.password),
        role: item.role,
        status: "ACTIVE"
      },
      create: {
        email: item.email,
        passwordHash: hashPassword(item.password),
        role: item.role,
        status: "ACTIVE"
      }
    });
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: seedUsers.map((item) => item.email)
      }
    },
    select: { id: true, email: true }
  });

  const userMap = new Map(users.map((user) => [user.email, user.id]));

  const workspaces = [];
  for (const item of seedWorkspaces) {
    const ownerUserId = userMap.get(item.ownerEmail);
    if (!ownerUserId) {
      throw new Error(`Missing owner user: ${item.ownerEmail}`);
    }

    const workspace = await prisma.workspace.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        ownerUserId,
        status: "ACTIVE"
      },
      create: {
        slug: item.slug,
        name: item.name,
        ownerUserId,
        status: "ACTIVE"
      }
    });

    workspaces.push(workspace);
  }

  const workspaceMap = new Map(workspaces.map((workspace) => [workspace.slug, workspace.id]));

  for (const item of seedWorkspaces) {
    const workspaceId = workspaceMap.get(item.slug);
    if (!workspaceId) {
      throw new Error(`Missing workspace: ${item.slug}`);
    }

    const ownerUserId = userMap.get(item.ownerEmail);
    if (!ownerUserId) {
      throw new Error(`Missing owner user: ${item.ownerEmail}`);
    }

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: ownerUserId
        }
      },
      update: {
        role: "ADMIN"
      },
      create: {
        workspaceId,
        userId: ownerUserId,
        role: "ADMIN"
      }
    });

    for (const member of item.members) {
      const memberUserId = userMap.get(member.email);
      if (!memberUserId) {
        throw new Error(`Missing member user: ${member.email}`);
      }

      await prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: memberUserId
          }
        },
        update: {
          role: member.role
        },
        create: {
          workspaceId,
          userId: memberUserId,
          role: member.role
        }
      });
    }
  }

  await prisma.subscription.deleteMany({
    where: {
      workspaceId: {
        in: workspaces.map((workspace) => workspace.id)
      }
    }
  });

  for (const item of seedWorkspaces) {
    const workspaceId = workspaceMap.get(item.slug);
    const plan = await prisma.plan.findUnique({ where: { code: item.planCode } });
    if (!workspaceId || !plan) {
      continue;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.subscription.create({
      data: {
        workspaceId,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        renewAt: periodEnd
      }
    });
  }

  const accountMap = new Map<string, { id: string; workspaceId: string; label: string }>();
  for (const account of seedAccounts) {
    const workspaceId = workspaceMap.get(account.workspaceSlug);
    if (!workspaceId) {
      throw new Error(`Missing workspace for account: ${account.workspaceSlug}`);
    }

    const existing = await prisma.account.findFirst({
      where: {
        workspaceId,
        label: account.label
      }
    });

    const saved = existing
      ? await prisma.account.update({
          where: { id: existing.id },
          data: {
            platform: account.platform,
            status: account.status,
            tag: account.tag,
            note: account.note,
            groupName: account.groupName
          }
        })
      : await prisma.account.create({
          data: {
            workspaceId,
            label: account.label,
            platform: account.platform,
            status: account.status,
            tag: account.tag,
            note: account.note,
            groupName: account.groupName
          }
        });

    accountMap.set(account.label, {
      id: saved.id,
      workspaceId,
      label: saved.label
    });
  }

  for (const item of seedWorkspaceTools) {
    const workspaceId = workspaceMap.get(item.workspaceSlug);
    const tool = await prisma.tool.findUnique({
      where: { code: item.toolCode }
    });

    if (!workspaceId || !tool) {
      continue;
    }

    await prisma.workspaceTool.upsert({
      where: {
        workspaceId_toolId: {
          workspaceId,
          toolId: tool.id
        }
      },
      update: {
        enabled: item.enabled,
        settingsJson: item.settingsJson
      },
      create: {
        workspaceId,
        toolId: tool.id,
        enabled: item.enabled,
        settingsJson: item.settingsJson
      }
    });
  }

  const seedJobRecords = [];
  for (const item of seedJobs) {
    const workspaceId = workspaceMap.get(item.workspaceSlug);
    const account = accountMap.get(item.accountLabel);
    const userId = userMap.get(item.workspaceSlug === "workspace-admin-mmo" ? "admin@mmo.local" : "client@mmo.local") ?? null;

    if (!workspaceId || !account) {
      throw new Error(`Missing workspace/account for job seed: ${item.workspaceSlug}`);
    }

    const existing = await prisma.job.findFirst({
      where: {
        workspaceId,
        optionsJson: item.optionsJson
      }
    });

    const job = existing
      ? await prisma.job.update({
          where: { id: existing.id },
          data: {
            accountId: account.id,
            platform: item.platform,
            jobType: item.jobType,
            mode: item.mode,
            status: item.status,
            scheduleCron: item.scheduleCron,
            optionsJson: item.optionsJson,
            createdById: userId
          }
        })
      : await prisma.job.create({
          data: {
            workspaceId,
            accountId: account.id,
            platform: item.platform,
            jobType: item.jobType,
            mode: item.mode,
            status: item.status,
            scheduleCron: item.scheduleCron,
            optionsJson: item.optionsJson,
            createdById: userId
          }
        });

    seedJobRecords.push({ job, seed: item });
  }

  await prisma.jobLog.deleteMany({
    where: {
      workspaceId: {
        in: workspaces.map((workspace) => workspace.id)
      }
    }
  });
  await prisma.jobRun.deleteMany({
    where: {
      workspaceId: {
        in: workspaces.map((workspace) => workspace.id)
      }
    }
  });

  await prisma.billingUsage.deleteMany({
    where: {
      workspaceId: {
        in: workspaces.map((workspace) => workspace.id)
      }
    }
  });
  await prisma.notification.deleteMany({
    where: {
      workspaceId: {
        in: workspaces.map((workspace) => workspace.id)
      }
    }
  });

  for (const record of seedJobRecords) {
    const run = await prisma.jobRun.create({
      data: {
        jobId: record.job.id,
        workspaceId: record.job.workspaceId,
        status: record.seed.run.status,
        startedAt: new Date(),
        finishedAt: new Date(),
        errorMessage: record.seed.run.errorMessage,
        metricsJson: record.seed.run.metricsJson
      }
    });

    for (const log of record.seed.run.logs) {
      await prisma.jobLog.create({
        data: {
          jobRunId: run.id,
          workspaceId: record.job.workspaceId,
          level: log.level,
          message: log.message,
          payloadJson: log.payloadJson
        }
      });
    }
  }

  for (const item of seedBillingUsages) {
    const workspaceId = workspaceMap.get(item.workspaceSlug);
    if (!workspaceId) {
      throw new Error(`Missing workspace for billing usage seed: ${item.workspaceSlug}`);
    }

    const day = new Date();
    day.setDate(day.getDate() - item.daysAgo);
    day.setHours(0, 0, 0, 0);

    await prisma.billingUsage.create({
      data: {
        workspaceId,
        day,
        fetchCount: item.fetchCount,
        runningJobCountPeak: item.runningJobCountPeak,
        accountCount: item.accountCount
      }
    });
  }

  for (const item of seedNotifications) {
    const workspaceId = workspaceMap.get(item.workspaceSlug);
    if (!workspaceId) {
      throw new Error(`Missing workspace for notification seed: ${item.workspaceSlug}`);
    }

    const userId = item.userEmail ? userMap.get(item.userEmail) ?? null : null;

    await prisma.notification.create({
      data: {
        workspaceId,
        userId,
        title: item.title,
        content: item.content,
        type: item.type,
        isRead: item.isRead
      }
    });
  }

  await prisma.auditLog.deleteMany({
    where: {
      workspaceId: {
        in: workspaces.map((workspace) => workspace.id)
      },
      action: {
        startsWith: "seed."
      }
    }
  });

  for (const workspace of workspaces) {
    const owner = await prisma.user.findUnique({
      where: { id: workspace.ownerUserId },
      select: { id: true, email: true }
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: owner?.id ?? null,
        action: "seed.workspace.ready",
        entityType: "Workspace",
        entityId: workspace.id,
        metadataJson: JSON.stringify({
          slug: workspace.slug,
          name: workspace.name
        })
      }
    });
  }

  for (const record of seedJobRecords) {
    await prisma.auditLog.create({
      data: {
        workspaceId: record.job.workspaceId,
        userId: record.job.createdById,
        action: "seed.job.ready",
        entityType: "Job",
        entityId: record.job.id,
        metadataJson: JSON.stringify({
          optionsJson: record.seed.optionsJson,
          status: record.job.status
        })
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
