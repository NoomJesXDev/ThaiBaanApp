"use client";

import React from "react";
import Link from "next/navigation";
import { LiffProvider, useLiffContext } from "@/features/line/components/LiffProvider";

function LiffLayoutContent({ children }: { children: React.ReactNode }) {
  const { loading, error, profile } = useLiffContext();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 p-6 text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold text-slate-700 font-display">กำลังเชื่อมต่อ LINE...</h2>
        <p className="text-xs text-slate-400 mt-1">กรุณารอสักครู่ ระบบกำลังเปิดหน้าแอปพลิเคชัน</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 p-6 text-center">
        <span className="text-4xl mb-4">⚠️</span>
        <h2 className="text-lg font-bold text-red-600 font-display">เกิดข้อผิดพลาดในการเชื่อมต่อ</h2>
        <p className="text-sm text-slate-500 mt-2">{error}</p>
        <p className="text-xs text-slate-400 mt-4">กรุณาตรวจสอบว่าเข้าใช้งานผ่านแอปพลิเคชัน LINE</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      {/* Mobile top bar */}
      <header className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        {profile?.pictureUrl ? (
          <img
            src={profile.pictureUrl}
            alt={profile.displayName}
            className="w-8 h-8 rounded-full border border-white object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-sm">
            {profile?.displayName?.charAt(0) || "U"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-emerald-100 uppercase tracking-wider">ยินดีต้อนรับ</p>
          <h1 className="text-sm font-bold truncate">{profile?.displayName}</h1>
        </div>
      </header>

      {/* Main page content */}
      <main className="flex-1 p-4 overflow-y-auto">{children}</main>

      {/* Mobile Bottom Navigation Bar for Residents */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-50 shadow-lg">
        <a
          href="/liff/bills"
          className="flex flex-col items-center justify-center text-xs text-slate-600 w-1/3 h-full hover:bg-slate-50"
        >
          <span className="text-xl mb-0.5">💰</span>
          <span className="font-medium">ยอดค้างชำระ</span>
        </a>
        <a
          href="/liff/history"
          className="flex flex-col items-center justify-center text-xs text-slate-600 w-1/3 h-full hover:bg-slate-50"
        >
          <span className="text-xl mb-0.5">📜</span>
          <span className="font-medium">ประวัติการจ่าย</span>
        </a>
        <a
          href="/liff/register"
          className="flex flex-col items-center justify-center text-xs text-slate-600 w-1/3 h-full hover:bg-slate-50"
        >
          <span className="text-xl mb-0.5">🏠</span>
          <span className="font-medium">ข้อมูลบ้าน</span>
        </a>
      </nav>
    </div>
  );
}

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiffProvider>
      <LiffLayoutContent>{children}</LiffLayoutContent>
    </LiffProvider>
  );
}
