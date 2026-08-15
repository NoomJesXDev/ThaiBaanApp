"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLiffContext } from "@/features/line/components/LiffProvider";

interface Community {
  name: string;
}

interface House {
  house_number: string;
  community_id: string;
  communities: Community;
}

interface BillingPeriod {
  period_month: number;
  period_year: number;
}

interface Bill {
  id: string;
  total_amount: number;
  status: string;
  house_id: string;
  billing_periods: BillingPeriod;
  houses: House;
}

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

function LiffPayContent() {
  const { profile } = useLiffContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const billId = searchParams.get("billId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);

  // Upload States
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!profile || !billId) return;

    const fetchBill = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load resident's house
        const profileRes = await fetch(`/api/liff/profile?lineUserId=${profile.userId}`);
        const profileData = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileData.error || "เกิดข้อผิดพลาดในการดึงข้อมูล");

        if (!profileData.registered) {
          router.push("/liff/register");
          return;
        }

        const residentHouse = profileData.data.houses;

        // Fetch specific bill
        const billRes = await fetch(`/api/liff/bills?houseId=${residentHouse.id}&billId=${billId}`);
        const billData = await billRes.json();
        if (!billRes.ok) throw new Error(billData.error || "เกิดข้อผิดพลาดในการโหลดบิล");

        const targetBill = billData.bills?.[0];
        if (!targetBill) {
          throw new Error("ไม่พบบิลที่คุณต้องการชำระเงิน");
        }

        if (targetBill.status !== "unpaid") {
          router.push("/liff/bills");
          return;
        }

        // Map format matching
        targetBill.houses = residentHouse;
        setBill(targetBill);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดบิล");
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [profile, billId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพหลักฐานสลิปเท่านั้น");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError(null);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !bill) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Upload file to custom upload API
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "อัปโหลดสลิปไม่สำเร็จ");

      const uploadedUrl = uploadData.url;

      // 2. Create Payment record and update bill
      const payRes = await fetch("/api/liff/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: bill.id,
          houseId: bill.house_id,
          amount: bill.total_amount,
          slipImageUrl: uploadedUrl,
          note: note,
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || "เกิดข้อผิดพลาดในการส่งข้อมูลการชำระเงิน");

      setSuccess(true);
      setTimeout(() => {
        router.push("/liff/bills");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการแนบสลิป");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="bg-red-50 p-4 rounded text-sm text-red-700 text-center max-w-md mx-auto">
        ไม่พบบิลที่คุณต้องการชำระเงิน
      </div>
    );
  }

  const monthStr = `${MONTHS[bill.billing_periods ? bill.billing_periods.period_month - 1 : 0]} ${
    bill.billing_periods ? bill.billing_periods.period_year + 543 : ""
  }`;

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div>
        <h2 className="text-xl font-bold font-display text-slate-800">แจ้งชำระเงิน</h2>
        <p className="text-xs text-slate-500">สำหรับรอบบิลเดือน {monthStr}</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-xs text-green-700">
          แนบสลิปหลักฐานการชำระเงินเรียบร้อยแล้ว! กำลังโหลดหน้าบิลค่าบริการ...
        </div>
      )}

      {!success && (
        <div className="space-y-6">
          {/* Bill summary card */}
          <div className="bg-white rounded-xl shadow border border-slate-100 p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800 font-display">บ้านเลขที่ {bill.houses?.house_number}</h4>
                <p className="text-[10px] text-slate-400">ชุมชน {bill.houses?.communities?.name}</p>
              </div>
              <span className="text-2xl font-bold text-emerald-600 font-mono">
                {Number(bill.total_amount).toFixed(2)} บาท
              </span>
            </div>

            {/* Promptpay detail mockup */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 text-center">
              <span className="text-xs font-semibold text-slate-400">บัญชีรับเงินชุมชน</span>
              <p className="font-bold text-slate-800 text-sm">ธนาคารกรุงไทย (ออมทรัพย์)</p>
              <p className="text-lg font-mono font-bold text-slate-900 tracking-wider">123-4-56789-0</p>
              <p className="text-xs text-slate-500">ชื่อบัญชี: คณะกรรมการน้ำประปาประจำชุมชน</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmitPayment} className="space-y-4 bg-white rounded-xl border border-slate-100 p-6 shadow">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                รูปสลิปหลักฐานโอนเงิน <span className="text-red-500">*</span>
              </label>

              {previewUrl ? (
                <div className="relative w-full h-64 border border-slate-200 rounded-lg overflow-hidden mb-3 bg-slate-50">
                  <img src={previewUrl} alt="Slip preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-1 px-2 rounded cursor-pointer"
                  >
                    ลบรูป
                  </button>
                </div>
              ) : (
                <div className="w-full h-40 border-2 border-dashed border-slate-200 rounded-lg flex flex-col justify-center items-center cursor-pointer hover:border-emerald-500 transition-colors p-4 relative bg-slate-50">
                  <span className="text-3xl mb-1">📸</span>
                  <span className="text-xs font-medium text-slate-500 text-center">
                    แตะที่นี่เพื่อถ่ายภาพสลิป หรือเลือกรูปภาพจากมือถือ
                  </span>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                หมายเหตุถึงกรรมการ (ไม่บังคับ)
              </label>
              <textarea
                rows={2}
                placeholder="เช่น โอนต่างธนาคาร, แจ้งรายละเอียดเพิ่มเติม..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/liff/bills")}
                className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
              >
                {uploading ? "กำลังส่ง..." : "ส่งสลิปชำระเงิน"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function LiffPayPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LiffPayContent />
    </Suspense>
  );
}
