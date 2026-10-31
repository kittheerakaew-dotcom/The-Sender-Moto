import { NextResponse } from "next/server";
// Next.js 16 Proxy สำหรับป้องกันเส้นทาง /admin และเพิ่ม Header ความปลอดภัย
export function proxy() {
  const response = NextResponse.next();

  // ป้องกันไม่ให้ Search Engine เก็บหน้า Admin และห้าม Browser เก็บ Cache ข้อมูลลูกค้า
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
