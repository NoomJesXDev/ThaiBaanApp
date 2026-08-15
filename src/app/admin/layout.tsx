import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth-server";
import { query } from "@/lib/db";
import { SidebarNav, MobileBottomNav } from "@/features/navigation/components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Get staff member and their community info using direct PostgreSQL query
  const staffResult = await query(
    `SELECT s.*, c.name as community_name 
     FROM staff s
     LEFT JOIN communities c ON s.community_id = c.id
     WHERE s.id = $1`,
    [user.id]
  );
  
  const staff = staffResult.rows[0];

  if (!staff) {
    // If not registered as staff, force register
    redirect("/register");
  }

  const communityName = staff.community_name || "ระบบไทบ้าน";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-primary border-r border-primary-light text-white">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary-light/10 border-b border-primary-light">
            <span className="text-xl font-bold font-display tracking-wider text-white">
              {communityName}
            </span>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="flex-shrink-0 flex border-t border-primary-light p-4 bg-primary-light/10 justify-between items-center">
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-primary-light">ผู้เข้าใช้งาน</span>
              <span className="text-sm font-medium truncate">{staff.full_name}</span>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-xs bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded-lg cursor-pointer"
              >
                ออกระบบ
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between h-18 bg-gradient-to-r from-primary to-primary-light text-white px-6 shadow-sm">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-white/70 uppercase tracking-widest font-bold">ชุมชน</span>
            <span className="font-bold text-base truncate font-display">{communityName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-white/60">ผู้ใช้</span>
              <span className="text-xs font-semibold truncate max-w-[120px]">{staff.full_name}</span>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white py-1.5 px-3 rounded-lg cursor-pointer transition-all active:scale-95"
              >
                ออกระบบ
              </button>
            </form>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between h-16 bg-white border-b border-slate-200 px-8">
          <h2 className="text-xl font-bold text-slate-800 font-display">ระบบจัดการสาธารณูปโภคชุมชน</h2>
          <span className="text-slate-500 text-sm">บทบาท: {staff.role === 'admin' ? 'ผู้ดูแลระบบ' : 'กรรมการ'}</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
