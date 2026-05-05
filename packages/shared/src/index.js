"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.thongDiep = void 0;
exports.thongDiep = {
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
};
__exportStar(require("./tool-contracts"), exports);
