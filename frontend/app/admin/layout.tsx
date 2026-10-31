"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // ใช้สำหรับเช็กว่าตอนนี้อยู่หน้าไหน เพื่อทำแถบสีไฮไลต์เมนู
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResettingSystem, setIsResettingSystem] = useState(false);

  useEffect(() => {
    axios.defaults.withCredentials = true;
    const savedKey = window.sessionStorage.getItem("sender_moto_admin_key");
    if (savedKey) {
      axios.defaults.headers.common["X-Admin-Key"] = savedKey;
    }

    const interceptorId = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) {
          setIsAuthRequired(true);
        }
        return Promise.reject(err);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, []);

  const handleUnlockAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = adminKeyInput.trim();
    if (!trimmed) {
      setAuthError("กรุณากรอกรหัสผ่านผู้ดูแลระบบ");
      return;
    }

    setIsLoggingIn(true);
    setAuthError("");
    try {
      const res = await axios.post(
        `${API_URL}/admin/login`,
        { Password: trimmed },
        { withCredentials: true }
      );
      if (res.data?.status === "Success") {
        const sessionToken = res.data.session_token || trimmed;
        window.sessionStorage.setItem("sender_moto_admin_key", sessionToken);
        axios.defaults.headers.common["X-Admin-Key"] = sessionToken;
        setAdminKeyInput("");
        setIsAuthRequired(false);
        window.location.reload();
      } else {
        setAuthError(res.data?.message || "รหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setAuthError(err.response.data.message);
      } else {
        setAuthError("รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง หรือลองผิดเกินกำหนด");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutAdmin = async () => {
    try {
      await axios.post(`${API_URL}/admin/logout`, {}, { withCredentials: true });
    } catch {
      // ล้างค่าฝั่งเบราว์เซอร์ต่อแม้เซิร์ฟเวอร์ไม่ตอบสนอง
    }
    window.sessionStorage.removeItem("sender_moto_admin_key");
    delete axios.defaults.headers.common["X-Admin-Key"];
    setIsAuthRequired(true);
  };

  const handleRefreshAll = () => {
    window.location.reload();
  };

  const handleResetDatabase = async () => {
    if (isResettingSystem) return;
    const confirmed = window.confirm(
      "⚠️ ยืนยันการล้างข้อมูลทั้งหมดในฐานข้อมูล (ลูกค้า, รถยนต์, คิวซ่อม, ใบงาน) และรีเซ็ตเลขลำดับ ID กลับไปเริ่มที่ #1 ใหม่ทั้งหมดใช่หรือไม่ครับ?"
    );
    if (!confirmed) return;

    setIsResettingSystem(true);
    try {
      const res = await axios.post(`${API_URL}/admin/system/reset-data`, {}, { withCredentials: true });
      if (res.data?.status === "Success") {
        alert(res.data.message || "ล้างข้อมูลและรีเซ็ตลำดับ ID เริ่มต้นที่ 1 เรียบร้อยแล้วครับ");
        window.location.reload();
      } else {
        alert(res.data?.message || "ไม่สามารถรีเซ็ตข้อมูลได้ครับ");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ครับ");
      }
    } finally {
      setIsResettingSystem(false);
    }
  };

  const menuItems = [
    { name: "จัดการลูกค้า (Customers)", path: "/admin" },
    { name: "คิวซ่อม (Appointments)", path: "/admin/appointments" },
    { name: "ใบงานซ่อม (Service Jobs)", path: "/admin/jobs" },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-dvh md:h-dvh bg-slate-100 font-sans md:overflow-hidden">
      
      {/* แถบด้านบนสำหรับหน้าจอมือถือ (Sticky Mobile Top Bar) */}
      <header className="md:hidden sticky top-0 bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-30 print:hidden">
        <div className="min-w-0">
          <span className="text-base sm:text-lg font-extrabold text-blue-400 whitespace-nowrap">
            THE SENDER <span className="text-white">MOTO</span>
          </span>
          <span className="text-[11px] text-slate-400 block">Admin Dashboard</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="min-h-10 px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap"
        >
          {isMobileMenuOpen ? "✕ ปิดเมนู" : "☰ เมนูจัดการ"}
        </button>
      </header>

      {/* ฉากหลังมืดเมื่อเปิดเมนูบนมือถือ */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-20 print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* แถบเมนูด้านซ้าย (Sidebar สำหรับคอมพิวเตอร์ / Drawer สำหรับมือถือ) */}
      <aside
        className={`${
          isMobileMenuOpen ? "fixed inset-x-0 top-[58px] flex max-h-[calc(100dvh-58px)]" : "hidden"
        } md:static md:flex w-full md:w-64 shrink-0 bg-slate-900 text-white flex-col shadow-2xl z-30 print:hidden`}
      >
        <div className="hidden md:block p-6 border-b border-slate-800">
          <h2 className="text-2xl font-extrabold text-blue-400">
            THE SENDER <span className="text-white">MOTO</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">Admin Dashboard</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl transition-all duration-200 ${
                pathname === item.path
                  ? "bg-blue-600 text-white font-bold shadow-md"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="block w-full text-center px-4 py-2 bg-blue-600/20 border border-blue-500/40 text-blue-300 rounded-lg hover:bg-blue-600 hover:text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            ↻ รีเฟรชข้อมูลทั้งระบบ
          </button>
          <button
            type="button"
            disabled={isResettingSystem}
            onClick={handleResetDatabase}
            className="block w-full text-center px-4 py-2 bg-rose-950/50 border border-rose-800/70 text-rose-300 rounded-lg hover:bg-rose-800 hover:text-white disabled:opacity-50 text-xs transition-colors cursor-pointer"
          >
            {isResettingSystem ? "กำลังรีเซ็ตระบบ..." : "🗑️ ล้างข้อมูล & เริ่ม ID #1 ใหม่"}
          </button>
          <button
            type="button"
            onClick={handleLogoutAdmin}
            className="block w-full text-center px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white text-sm transition-colors"
          >
            ออกจากระบบผู้ดูแล
          </button>
          <Link
            href="/"
            className="block w-full text-center px-4 py-2 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white text-sm transition-colors"
          >
            &larr; กลับสู่หน้าแบรนด์
          </Link>
        </div>
      </aside>

      {/* พื้นที่แสดงเนื้อหาหน้าเว็บต่างๆ (Children) */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* หน้าต่างยืนยันสิทธิ์เมื่อตั้งค่า ADMIN_PASSWORD_HASH / ADMIN_API_KEY ในระบบ */}
      {isAuthRequired && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 text-white p-4">
              <h3 className="text-lg font-bold text-blue-400">ยืนยันสิทธิ์ผู้ดูแลระบบ</h3>
              <p className="text-xs text-slate-300 mt-1">
                กรุณากรอกรหัสผ่านผู้ดูแลระบบเพื่อเข้าใช้งานระบบจัดการอู่ The Sender Moto ครับ
              </p>
            </div>
            <form onSubmit={handleUnlockAdmin} className="p-6 space-y-4">
              {authError && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{authError}</p>
              )}
              <div>
                <label htmlFor="admin-key-input" className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่านผู้ดูแลระบบ (Admin Password) *
                </label>
                <input
                  id="admin-key-input"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={adminKeyInput}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="กรอกรหัสผ่านผู้ดูแลระบบ"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-slate-600"
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
              >
                {isLoggingIn ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}
