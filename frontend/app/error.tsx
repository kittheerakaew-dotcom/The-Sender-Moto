"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-50 flex flex-col items-center justify-center px-6 text-center font-sans">
      <div className="text-xs font-bold tracking-widest text-blue-400 uppercase mb-3">
        THE SENDER MOTO
      </div>
      <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-3">
        ขออภัยครับ เกิดข้อผิดพลาดในการแสดงผลหน้านี้
      </h1>
      <p className="text-sm md:text-base text-slate-400 max-w-md mb-8">
        ระบบขัดข้องชั่วคราว กรุณากดลองใหม่อีกครั้ง หรือติดต่อทีมงานที่เบอร์ 080-899-6645 ครับ
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-sm transition-colors"
        >
          ลองโหลดหน้านี้ใหม่อีกครั้ง
        </button>
        <Link
          href="/"
          className="px-6 py-3 border border-slate-700 hover:border-blue-500 text-slate-200 font-semibold rounded-full text-sm transition-colors"
        >
          กลับสู่หน้าแรก
        </Link>
      </div>
    </div>
  );
}
