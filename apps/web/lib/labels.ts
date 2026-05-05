const platformLabels: Record<string, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  shopee: "Shopee",
  youtube: "YouTube",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  SHOPEE: "Shopee",
  YOUTUBE: "YouTube",
  system: "Hệ thống",
  SYSTEM: "Hệ thống"
};

const jobTypeLabels: Record<string, string> = {
  fetch_posts: "Bài viết",
  fetch_comments: "Bình luận",
  fetch_profile: "Hồ sơ",
  check_proxy: "Kiểm tra Proxy",
  account_health: "Sức khỏe tài khoản",
  group_moderation: "Duyệt group",
  keyword_monitor: "Theo dõi từ khóa",
  workflow_build: "Workflow",
  FETCH_POSTS: "Bài viết",
  FETCH_COMMENTS: "Bình luận",
  FETCH_PROFILE: "Hồ sơ",
  CHECK_PROXY: "Kiểm tra Proxy",
  ACCOUNT_HEALTH: "Sức khỏe tài khoản",
  GROUP_MODERATION: "Duyệt group",
  KEYWORD_MONITOR: "Theo dõi từ khóa",
  WORKFLOW_BUILD: "Workflow",
  FETCH_VIDEOS: "Video",
  POST_GROUP: "Đăng Group",
  NURTURE_ACCOUNT: "Nuôi Account",
  AUTO_LIKE: "Auto Like",
  AUTO_COMMENT: "Auto Comment",
  REUP_VIDEO: "Reup Video",
  SHOPEE_VIDEO_AFF: "Shopee Video Affiliate",
  SHOPEE_LINK_CONVERT: "Shopee Link Convert",
  fetch_videos: "Video",
  post_group: "Đăng Group",
  nurture_account: "Nuôi Account",
  auto_like: "Auto Like",
  auto_comment: "Auto Comment",
  AI_CONTENT: "Viết nội dung AI",
  MARKETPLACE_SCAN: "Quét Marketplace",
  BULK_MSG: "Gửi tin nhắn hàng loạt",
  AUTO_JOIN_GROUP: "Tự động vào Group",
  AUTO_DM: "Auto DM TikTok",
  CHANGE_PASSWORD: "Đổi mật khẩu",
  REG_ACCOUNT: "Reg tài khoản",
  CLEANUP: "Dọn dẹp dữ liệu",
  STRESS_TEST: "Stress Test (WebSocket)"
};

const jobModeLabels: Record<string, string> = {
  once: "Một lần",
  scheduled: "Theo lịch",
  recurring: "Lặp lại",
  ONCE: "Một lần",
  SCHEDULED: "Theo lịch",
  RECURRING: "Lặp lại"
};

const jobStatusLabels: Record<string, string> = {
  draft: "Nháp",
  queued: "Đang chờ",
  running: "Đang chạy",
  paused: "Tạm dừng",
  done: "Hoàn tất",
  failed: "Thất bại",
  DRAFT: "Nháp",
  QUEUED: "Đang chờ",
  RUNNING: "Đang chạy",
  PAUSED: "Tạm dừng",
  DONE: "Hoàn tất",
  FAILED: "Thất bại"
};

const accountStatusLabels: Record<string, string> = {
  alive: "Sống",
  dead: "Chết",
  limited: "Giới hạn",
  pending: "Chưa kiểm tra",
  ALIVE: "Sống",
  DEAD: "Chết",
  LIMITED: "Giới hạn",
  PENDING: "Chưa kiểm tra"
};

export function formatPlatform(value: string) {
  return platformLabels[value] ?? value;
}

export function formatJobType(value: string) {
  return jobTypeLabels[value] ?? value;
}

export function formatJobMode(value: string) {
  return jobModeLabels[value] ?? value;
}

export function formatJobStatus(value: string) {
  return jobStatusLabels[value] ?? value;
}

export function formatAccountStatus(value: string) {
  return accountStatusLabels[value] ?? value;
}
