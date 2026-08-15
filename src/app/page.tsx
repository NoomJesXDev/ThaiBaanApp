import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-16 text-center max-w-4xl mx-auto space-y-12">
        
        {/* Brand */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-2xl text-4xl mb-2 animate-bounce">
            💧
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-800 font-display">
            ไทยบ้านอาสา
          </h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto">
            ระบบจัดการและจัดเก็บค่าสาธารณูปโภค ค่าน้ำประปา ค่าเก็บขยะ และเงินสงเคราะห์ฌาปนกิจ ในชุมชนยุคใหม่
          </p>
        </div>

        {/* Portals grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Admin Card */}
          <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100 flex flex-col justify-between items-center text-center space-y-4 hover:shadow-lg transition-shadow">
            <div className="space-y-2">
              <span className="text-4xl">🧑‍💼</span>
              <h3 className="text-xl font-bold text-slate-800 font-display">ระบบสำหรับกรรมการ</h3>
              <p className="text-xs text-slate-400">
                จดมิเตอร์น้ำ, คำนวณยอดเงินค่าน้ำ, ตั้งค่าราคา, ตรวจสอบสลิปลูกบ้าน และออกรายงาน
              </p>
            </div>
            <Link
              href="/login"
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-light text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              เข้าสู่ระบบกรรมการ
            </Link>
          </div>

          {/* Resident Card */}
          <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100 flex flex-col justify-between items-center text-center space-y-4 hover:shadow-lg transition-shadow">
            <div className="space-y-2">
              <span className="text-4xl">📱</span>
              <h3 className="text-xl font-bold text-slate-800 font-display">ระบบสำหรับลูกบ้าน</h3>
              <p className="text-xs text-slate-400">
                ตรวจสอบค่าน้ำประปา, รับการแจ้งเตือนผ่าน LINE, แนบสลิปโอนเงิน และดูประวัติย้อนหลัง
              </p>
            </div>
            <Link
              href="/liff/bills"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              ตรวจสอบยอด (LINE LIFF)
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-xs text-slate-400 pt-12">
          &copy; {new Date().getFullYear()} ไทยบ้านอาสา. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
