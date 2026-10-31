export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col items-center justify-center px-6 font-sans">
      <div className="w-11 h-11 rounded-full border-3 border-slate-800 border-t-blue-500 animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-400 tracking-wide">
        กำลังโหลดข้อมูล The Sender Moto กรุณารอสักครู่ครับ...
      </p>
    </div>
  );
}
