"use client";

import React, { useState, useEffect } from "react";
import { useLiffContext } from "@/features/line/components/LiffProvider";

interface Community {
  name: string;
}

interface House {
  id: string;
  house_number: string;
  communities: Community;
}

interface BillingPeriod {
  period_month: number;
  period_year: number;
}

interface BillItem {
  utility_type: "water" | "garbage" | "funeral";
  amount: number;
}

interface Bill {
  id: string;
  total_amount: number;
  status: string;
  billing_periods: BillingPeriod;
  bill_items: BillItem[];
  payments: Array<{
    paid_at: string;
    verified_at: string | null;
  }>;
}

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function LiffHistoryPage() {
  const { profile } = useLiffContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [house, setHouse] = useState<House | null>(null);
  const [paidBills, setPaidBills] = useState<Bill[]>([]);

  useEffect(() => {
    if (!profile) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Get resident's house
        const profileRes = await fetch(`/api/liff/profile?lineUserId=${profile.userId}`);
        const profileData = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileData.error || "เกิดข้อผิดพลาดในการดึงข้อมูล");

        if (!profileData.registered) {
          return;
        }

        const residentHouse = profileData.data.houses;
        setHouse(residentHouse);

        // 2. Fetch paid bills for this house
        const historyRes = await fetch(`/api/liff/history?houseId=${residentHouse.id}`);
        const historyData = await historyRes.json();
        if (!historyRes.ok) throw new Error(historyData.error || "เกิดข้อผิดพลาดในการโหลดประวัติ");

        // Sort by period descending
        const sorted = (historyData.bills || []).sort(
          (a: any, b: any) =>
            b.billing_periods.period_year - a.billing_periods.period_year ||
            b.billing_periods.period_month - a.billing_periods.period_month
        );

        setPaidBills(sorted);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div>
        <span className="text-xs font-bold text-slate-400">หมู่บ้าน: {house?.communities?.name}</span>
        <h2 className="text-xl font-bold font-display text-slate-800">ประวัติการชำระเงิน</h2>
        <p className="text-xs text-slate-500">สำหรับบ้านเลขที่ {house?.house_number}</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {paidBills.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow text-slate-400">
          <span className="text-4xl block mb-2">📜</span>
          <p className="text-sm font-medium">ยังไม่มีประวัติการชำระเงินในระบบ</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paidBills.map((bill) => {
            const waterItem = bill.bill_items?.find((i) => i.utility_type === "water");
            const garbageItem = bill.bill_items?.find((i) => i.utility_type === "garbage");
            const funeralItem = bill.bill_items?.find((i) => i.utility_type === "funeral");
            
            const payment = bill.payments?.[0];

            const monthStr = `${MONTHS[bill.billing_periods.period_month - 1]} ${
              bill.billing_periods.period_year + 543
            }`;

            return (
              <div
                key={bill.id}
                className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 space-y-3"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="font-bold text-slate-800 font-display text-sm">{monthStr}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ชำระเงินเรียบร้อย
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  {waterItem && (
                    <div className="flex justify-between">
                      <span>💧 ค่าน้ำประปา</span>
                      <span className="font-mono">{Number(waterItem.amount).toFixed(2)} บาท</span>
                    </div>
                  )}
                  {garbageItem && (
                    <div className="flex justify-between">
                      <span>🗑️ ค่าเก็บขยะ</span>
                      <span className="font-mono">{Number(garbageItem.amount).toFixed(2)} บาท</span>
                    </div>
                  )}
                  {funeralItem && (
                    <div className="flex justify-between">
                      <span>🤝 เงินฌาปนกิจ</span>
                      <span className="font-mono">{Number(funeralItem.amount).toFixed(2)} บาท</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-50 pt-2 flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-700">ยอดชำระแล้ว:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {Number(bill.total_amount).toFixed(2)} บาท
                  </span>
                </div>

                {payment && (
                  <div className="text-[10px] text-slate-400 pt-1 flex justify-between border-t border-dashed border-slate-50">
                    <span>วันที่จ่าย: {new Date(payment.paid_at).toLocaleDateString("th-TH")}</span>
                    {payment.verified_at && (
                      <span>
                        ยืนยันเมื่อ: {new Date(payment.verified_at).toLocaleDateString("th-TH")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
