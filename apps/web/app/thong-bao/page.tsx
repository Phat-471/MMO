"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, syncSessionProfile } from "../../lib/api";
import Link from "next/link";

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const session = await syncSessionProfile();
      if (!session) {
        router.push("/dang-nhap");
        return;
      }

      try {
        const res = await apiRequest<NotificationItem[]>(`/notifications/${session.workspaceId}`);
        setItems(res.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [router]);

  const markAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "POST" });
      setItems(items.map(item => item.id === id ? { ...item, isRead: true } : item));
    } catch (err: any) {
      console.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-blue-400 hover:text-blue-300 mb-2 inline-block">
              ← Quay lại bảng điều khiển
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Thông báo hệ thống
            </h1>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all"
          >
            Làm mới
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">Đang tải thông báo...</div>
        ) : error ? (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            Lỗi: {error}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-gray-400">Bạn chưa có thông báo nào.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div 
                key={item.id}
                className={`p-5 rounded-xl border transition-all duration-300 ${
                  item.isRead 
                    ? "bg-white/5 border-white/10 opacity-70" 
                    : "bg-white/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                }`}
                onClick={() => !item.isRead && markAsRead(item.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      item.type === "ERROR" ? "bg-red-500" :
                      item.type === "WARNING" ? "bg-yellow-500" :
                      item.type === "SUCCESS" ? "bg-green-500" : "bg-blue-500"
                    }`} />
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <p className="text-gray-300 leading-relaxed pl-6">
                  {item.content}
                </p>
                {!item.isRead && (
                  <div className="mt-3 flex justify-end">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(item.id);
                      }}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Đánh dấu đã đọc
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
