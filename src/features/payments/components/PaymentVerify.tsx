"use client";

import React, { useState } from "react";

interface House {
  house_number: string;
  owner_name: string | null;
}

interface BillingPeriod {
  period_month: number;
  period_year: number;
}

interface Bill {
  id: string;
  total_amount: number;
  status: string;
  billing_periods: BillingPeriod;
}

interface Payment {
  id: string;
  bill_id: string;
  house_id: string;
  amount: number;
  slip_image_url: string | null;
  paid_at: string;
  note: string | null;
  houses: House;
  bills: Bill;
}

interface PaymentVerifyProps {
  initialPayments: Payment[];
  staffId: string;
}

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function PaymentVerify({
  initialPayments,
  staffId,
}: PaymentVerifyProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [activeSlip, setActiveSlip] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleVerify = async (payment: Payment, isApproved: boolean) => {
    setProcessingId(payment.id);
    try {
      if (isApproved) {
        // Approve via Custom API
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: payment.id,
            billId: payment.bill_id,
            isApproved: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการอนุมัติ");

        alert("ยืนยันยอดเงินสำเร็จ!");
      } else {
        // Reject
        const rejectNote = prompt("กรุณาระบุเหตุผลที่ปฏิเสธสลิปนี้ (จะส่งแจ้งเตือนไปที่ LINE ของลูกบ้าน):");
        if (rejectNote === null) {
          setProcessingId(null);
          return; // Cancelled
        }

        // Reject via Custom API
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: payment.id,
            billId: payment.bill_id,
            isApproved: false,
            note: rejectNote || "หลักฐานการชำระเงินไม่ถูกต้อง",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการปฏิเสธ");

        alert("ปฏิเสธการชำระเงินและแจ้งเตือนลูกบ้านแล้ว");
      }

      // Remove from list
      setPayments(payments.filter((p) => p.id !== payment.id));
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + (err.message || "ไม่สามารถทำรายการได้"));
    } finally {
      setProcessingId(null);
    }
  };

  const getSlipImageUrl = (path: string | null) => {
    if (!path) return "/placeholder-slip.png";
    return path;
  };

  return (
    <div className="space-y-6">
      {payments.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-xl border border-slate-100 text-slate-400">
          🎉 ไม่มีสลิปค้างตรวจสอบในขณะนี้
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {payments.map((payment) => {
            const bill = payment.bills;
            const house = payment.houses;
            const monthStr = bill
              ? `${MONTHS[bill.billing_periods.period_month - 1]} ${
                  bill.billing_periods.period_year + 543
                }`
              : "-";

            return (
              <div
                key={payment.id}
                className="bg-white shadow rounded-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row"
              >
                {/* Slip image preview */}
                <div
                  className="md:w-48 h-64 md:h-auto bg-slate-100 relative cursor-pointer overflow-hidden flex-shrink-0"
                  onClick={() => setActiveSlip(getSlipImageUrl(payment.slip_image_url))}
                >
                  <img
                    src={getSlipImageUrl(payment.slip_image_url)}
                    alt="สลิปโอนเงิน"
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                  <div className="absolute bottom-2 right-2 bg-slate-900/60 text-white text-[10px] px-2 py-1 rounded">
                    🔍 คลิกซูมสลิป
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase">รอบบิล {monthStr}</span>
                        <h3 className="text-lg font-bold text-slate-800 font-display">
                          บ้านเลขที่ {house?.house_number}
                        </h3>
                        <p className="text-sm text-slate-500">{house?.owner_name}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">ยอดที่ต้องจ่าย:</span>
                        <span className="font-semibold text-slate-800">
                          {bill?.total_amount?.toFixed(2)} บาท
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">ยอดที่โอนจริง:</span>
                        <span className="font-bold text-emerald-600">
                          {payment.amount?.toFixed(2)} บาท
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">เวลาที่โอน:</span>
                        <span className="text-slate-600">
                          {new Date(payment.paid_at).toLocaleString("th-TH")}
                        </span>
                      </div>
                    </div>

                    {payment.note && (
                      <div className="bg-slate-50 p-2 rounded text-xs text-slate-600 font-sans border border-slate-100">
                        <strong>บันทึกจากลูกบ้าน:</strong> {payment.note}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => handleVerify(payment, false)}
                      disabled={processingId === payment.id}
                      className="flex-1 py-2 px-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      ❌ ปฏิเสธ
                    </button>
                    <button
                      onClick={() => handleVerify(payment, true)}
                      disabled={processingId === payment.id}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {processingId === payment.id ? "กำลังโหลด..." : "✅ ยืนยันสลิป"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slip Modal Lightbox */}
      {activeSlip && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-[100] cursor-pointer"
          onClick={() => setActiveSlip(null)}
        >
          <div className="relative max-w-lg w-full max-h-[85vh] bg-white p-2 rounded-lg">
            <button
              onClick={() => setActiveSlip(null)}
              className="absolute -top-10 right-0 text-white font-bold text-xl hover:text-slate-200"
            >
              ปิด ×
            </button>
            <img
              src={activeSlip}
              alt="หลักฐานสลิปขยายใหญ่"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
