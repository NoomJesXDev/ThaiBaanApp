"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLiffContext } from "@/features/line/components/LiffProvider";

interface Community {
  id: string;
  name: string;
}

interface House {
  id: string;
  house_number: string;
  community_id: string;
  communities: Community;
}

interface BillingPeriod {
  period_month: number;
  period_year: number;
  funeral_events?: Array<{ name: string; amount: number; type?: string }>;
}

interface BillItem {
  id: string;
  utility_type: string;
  name?: string;
  is_metered?: boolean;
  amount: number;
  previous_reading: number | null;
  current_reading: number | null;
  units_used: number | null;
}

interface Bill {
  id: string;
  billing_period_id: string;
  house_id: string;
  status: "unpaid" | "pending_verify" | "paid" | "overdue";
  total_amount: number;
  arrears_amount?: number;
  notified_at: string | null;
  billing_periods: BillingPeriod;
  bill_items: BillItem[];
}

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const getEventTypeName = (type?: string) => {
  switch (type) {
    case "funeral": return "ฌาปนกิจ";
    case "maintenance": return "ค่าซ่อมประปา";
    case "common": return "ค่าส่วนกลาง";
    case "other": return "พิเศษอื่นๆ";
    default: return "ฌาปนกิจ";
  }
};

function LiffBillsContent() {
  const { profile } = useLiffContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const billIdParam = searchParams.get("billId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [house, setHouse] = useState<House | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);

  const fetchHouseAndBills = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get resident's house
      const profileRes = await fetch(`/api/liff/profile?lineUserId=${profile.userId}`);
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error || "เกิดข้อผิดพลาดในการดึงข้อมูล");

      if (!profileData.registered) {
        router.push("/liff/register");
        return;
      }

      const residentHouse = profileData.data.houses;
      setHouse(residentHouse);

      // 2. Fetch bills for this house
      let url = `/api/liff/bills?houseId=${residentHouse.id}`;
      if (billIdParam) {
        url += `&billId=${billIdParam}`;
      }

      const billsRes = await fetch(url);
      const billsData = await billsRes.json();
      if (!billsRes.ok) throw new Error(billsData.error || "เกิดข้อผิดพลาดในการโหลดค่าน้ำ");

      // Sort by period descending
      const sortedBills = (billsData.bills || []).sort(
        (a: any, b: any) =>
          b.billing_periods.period_year - a.billing_periods.period_year ||
          b.billing_periods.period_month - a.billing_periods.period_month
      );

      setBills(sortedBills);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการโหลดค่าน้ำ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseAndBills();
  }, [profile, billIdParam]);

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
        <h2 className="text-xl font-bold font-display text-slate-800">
          ค่าน้ำ & ค่าบริการค้างชำระ
        </h2>
        <p className="text-xs text-slate-500">สำหรับบ้านเลขที่ {house?.house_number}</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {bills.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow">
          <span className="text-4xl block mb-2">🎉</span>
          <h3 className="font-bold text-slate-700 font-display">ไม่มียอดค้างชำระ</h3>
          <p className="text-xs text-slate-400 mt-1">บ้านเลขที่ของคุณไม่มีบิลค้างจ่ายในขณะนี้</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bills.map((bill) => {
            const monthStr = `${MONTHS[bill.billing_periods.period_month - 1]} ${
              bill.billing_periods.period_year + 543
            }`;

            return (
              <div
                key={bill.id}
                className="bg-white rounded-xl shadow border border-slate-100 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-800 font-display text-sm">{monthStr}</span>
                  {bill.status === "unpaid" ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      ยังไม่จ่าย
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
                      รอตรวจสอบยอด
                    </span>
                  )}
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-4">
                  {bill.bill_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {item.is_metered ? "💧" : "📄"} {item.name || item.utility_type}
                        </p>
                        {item.is_metered && item.current_reading !== null && (
                          <p className="text-[10px] text-slate-400">
                            เลขมิเตอร์: {item.previous_reading} ➔ {item.current_reading}{" "}
                            ({item.units_used} หน่วย)
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-slate-700">
                        {Number(item.amount).toFixed(2)} บาท
                      </span>
                    </div>
                  ))}

                  {bill.billing_periods.funeral_events && bill.billing_periods.funeral_events.length > 0 && (
                    <div className="bg-slate-50/70 p-2.5 rounded-lg text-[10px] text-slate-500 space-y-1 border border-slate-100">
                      <p className="font-bold text-slate-600">รายละเอียดค่าบริการพิเศษ/สงเคราะห์:</p>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {bill.billing_periods.funeral_events.map((event: any, i: number) => {
                          const typeLabel = getEventTypeName(event.type);
                          const details = event.name ? `: ${event.name}` : "";
                          return (
                            <li key={i}>
                              [{typeLabel}]{details} ({Number(event.amount).toFixed(2)} บาท)
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {Number(bill.arrears_amount) > 0 && (
                    <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                        <span>⚠️</span>
                        <span>ยอดยกมาจากรอบก่อนหน้า (ค้างชำระ):</span>
                      </div>
                      <span className="font-bold font-mono text-amber-700">
                        +{Number(bill.arrears_amount).toFixed(2)} บาท
                      </span>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                    <span className="font-bold text-slate-800 font-display">ยอดรวมที่ต้องชำระ</span>
                    <span className="text-xl font-bold text-emerald-600 font-mono">
                      {Number(bill.total_amount).toFixed(2)} บาท
                    </span>
                  </div>
                </div>

                {/* Payment button */}
                {bill.status === "unpaid" && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                    <button
                      onClick={() => router.push(`/liff/pay?billId=${bill.id}`)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg text-center cursor-pointer transition-colors shadow-sm"
                    >
                      💳 ชำระเงิน / แนบสลิป
                    </button>
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

export default function LiffBillsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LiffBillsContent />
    </Suspense>
  );
}
