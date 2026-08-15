"use client";

import React, { useState, useEffect } from "react";

interface CategoryStat {
  utilityType: string;
  name: string;
  totalAmount: number;
  itemCount: number;
}

interface MonthlyTrend {
  month: number;
  paidAmount: number;
  unpaidAmount: number;
  billsCount: number;
}

interface Defaulter {
  houseId: string;
  houseNumber: string;
  ownerName: string;
  meterId: string;
  unpaidMonths: number;
  totalArrears: number;
}

interface DashboardData {
  stats: {
    totalCollected: number;
    totalOutstanding: number;
    totalBilled: number;
    paidCount: number;
    unpaidCount: number;
    totalBills: number;
    collectionRate: number;
  };
  categoryBreakdown: CategoryStat[];
  monthlyTrends: MonthlyTrend[];
  defaulters: Defaulter[];
}

const MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">กำลังประมวลผลสถิติการเงินชุมชน...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-xs text-red-700">
        {error || "ไม่สามารถโหลดข้อมูลสถิติได้"}
      </div>
    );
  }

  const { stats, categoryBreakdown, monthlyTrends, defaulters } = data;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-display">แดชบอร์ดสรุปการเงินชุมชน</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ภาพรวมรายรับ รายจ่าย ค่าบริการสาธารณูปโภค และรายงานหนี้ค้างชำระสะสม
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          🔄 รีเฟรชข้อมูล
        </button>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Collected */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>รายรับจัดเก็บแล้ว</span>
            <span className="text-emerald-500 text-base">💰</span>
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono text-emerald-600">
            ฿{stats.totalCollected.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400">จากทั้งหมด {stats.paidCount} บิลที่ชำระแล้ว</p>
        </div>

        {/* Card 2: Total Outstanding / Arrears */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>ยอดค้างชำระรวม</span>
            <span className="text-amber-500 text-base">⏳</span>
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono text-amber-600">
            ฿{stats.totalOutstanding.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400">{stats.unpaidCount} บิลที่ยังไม่ชำระ</p>
        </div>

        {/* Card 3: Collection Rate */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>อัตราจัดเก็บสำเร็จ</span>
            <span className="text-blue-500 text-base">📈</span>
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono text-blue-600">
            {stats.collectionRate}%
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.collectionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Card 4: Total Expected Billed */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>ยอดตั้งหนี้ทั้งหมด</span>
            <span className="text-slate-500 text-base">📋</span>
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono text-slate-800">
            ฿{stats.totalBilled.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400">จากทั้งหมด {stats.totalBills} บิลที่สร้าง</p>
        </div>
      </div>

      {/* Middle Grid: Category Breakdown & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Income Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 font-display flex items-center gap-2">
              <span>📊</span> รายรับแยกตามประเภทค่าบริการ (ที่ชำระแล้ว)
            </h3>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              ยังไม่มีข้อมูลการชำระเงินแยกตามหมวดหมู่
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => {
                const percentage = stats.totalCollected > 0
                  ? Math.round((cat.totalAmount / stats.totalCollected) * 100)
                  : 0;

                return (
                  <div key={cat.utilityType} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">{cat.name}</span>
                      <span className="font-bold font-mono text-slate-800">
                        ฿{cat.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] text-slate-400 font-normal">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly Collection Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 font-display flex items-center gap-2">
              <span>📅</span> สรุปรายรับรายเดือน ประจำปีนี้
            </h3>
          </div>

          {monthlyTrends.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              ยังไม่มีข้อมูลการสร้างรอบบิลในปีนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <th className="px-3 py-2">เดือน</th>
                    <th className="px-3 py-2 text-right">จัดเก็บได้</th>
                    <th className="px-3 py-2 text-right">ค้างชำระ</th>
                    <th className="px-3 py-2 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyTrends.map((trend) => (
                    <tr key={trend.month} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-bold text-slate-700">
                        {MONTHS[trend.month - 1]}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">
                        ฿{trend.paidAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-amber-600">
                        ฿{trend.unpaidAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {trend.unpaidAmount === 0 && trend.paidAmount > 0 ? (
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                            ครบ 100%
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {trend.billsCount} หลัง
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Defaulters / Arrears Tracking Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-800 font-display flex items-center gap-2">
              <span>⚠️</span> รายงานติดตามลูกบ้านที่มียอดค้างชำระสะสม ({defaulters.length} หลัง)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              รายชื่อบ้านที่ยังไม่ได้ชำระเงิน เรียงตามยอดค้างชำระสะสมจากมากไปน้อย
            </p>
          </div>
        </div>

        {defaulters.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-100 rounded-xl space-y-2">
            <span className="text-3xl block">🎉</span>
            <p className="font-bold text-sm text-slate-700">ไม่มีลูกบ้านค้างชำระในระบบ</p>
            <p className="text-xs text-slate-400">ทุกหลังคาเรือนชำระค่าบริการครบถ้วนสมบูรณ์</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                  <th className="px-4 py-3">บ้านเลขที่</th>
                  <th className="px-4 py-3">ชื่อเจ้าของบ้าน</th>
                  <th className="px-4 py-3">เลขมิเตอร์น้ำ</th>
                  <th className="px-4 py-3 text-center">จำนวนรอบที่ค้าง</th>
                  <th className="px-4 py-3 text-right">ยอดค้างชำระสะสม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defaulters.map((def) => (
                  <tr key={def.houseId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-bold text-slate-800">{def.houseNumber}</td>
                    <td className="px-4 py-3.5 text-slate-700">{def.ownerName}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono">{def.meterId || "-"}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {def.unpaidMonths} รอบบิล
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-rose-600 font-mono text-sm">
                      ฿{def.totalArrears.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
