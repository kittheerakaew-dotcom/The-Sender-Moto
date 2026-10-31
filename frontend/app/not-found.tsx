import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-50 flex flex-col items-center justify-center px-6 text-center font-sans">
      <div className="text-sm font-bold tracking-widest text-blue-400 uppercase mb-3">
        THE SENDER MOTO
      </div>
      <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4">404</h1>
      <p className="text-lg text-slate-400 max-w-md mb-8">
        ไม่พบหน้าที่คุณต้องการครับ อาจมีการเปลี่ยนลิงก์หรือพิมพ์ที่อยู่เว็บไซต์ไม่ถูกต้อง
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-colors shadow-lg"
      >
        กลับสู่หน้าแรก The Sender Moto
      </Link>
    </div>
  );
}
