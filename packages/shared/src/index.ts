export type Platform = "facebook" | "tiktok";
export type DataType = "posts" | "comments" | "profile";
export type JobMode = "once" | "scheduled" | "recurring";
export type JobStatus = "draft" | "queued" | "running" | "paused" | "done" | "failed";
export type AccountStatus = "alive" | "dead" | "limited" | "pending";
export type MemberRole = "admin" | "user" | "viewer" | "affiliate";

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export const thongDiep = {
  heThongSanSang: "Hệ thống đang sẵn sàng.",
  dangNhapThanhCong: "Đăng nhập thành công.",
  dangKyThanhCong: "Đăng ký thành công.",
  capNhatThanhCong: "Cập nhật thành công.",
  taoThanhCong: "Tạo mới thành công.",
  xoaThanhCong: "Xóa thành công.",
  khongDuQuyen: "Bạn không có quyền thực hiện thao tác này.",
  khongTimThayDuLieu: "Không tìm thấy dữ liệu.",
  duLieuKhongHopLe: "Dữ liệu không hợp lệ.",
  loiHeThong: "Đã xảy ra lỗi, vui lòng thử lại sau."
} as const;

export * from "./tool-contracts";
