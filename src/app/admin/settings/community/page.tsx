"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CommunitySettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lineChannelId, setLineChannelId] = useState("");
  const [lineLiffId, setLineLiffId] = useState("");
  const [lineChannelSecret, setLineChannelSecret] = useState("");
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/community");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");

      if (data.community) {
        setName(data.community.name || "");
        setAddress(data.community.address || "");
        setLineChannelId(data.community.line_channel_id || "");
        setLineLiffId(data.community.line_liff_id || "");
        setLineChannelSecret(data.community.line_channel_secret || "");
        setLineChannelAccessToken(data.community.line_channel_access_token || "");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: "error", text: "กรุณาระบุชื่อหมู่บ้าน/ชุมชน" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/community", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          lineChannelId,
          lineLiffId,
          lineChannelSecret,
          lineChannelAccessToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      setMessage({ type: "success", text: "บันทึกข้อมูลชื่อหมู่บ้านและการตั้งค่า LINE เรียบร้อยแล้ว!" });
      router.refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">กำลังโหลดข้อมูลชุมชนและการตั้งค่า...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-display">🏢 ตั้งค่าข้อมูลหมู่บ้าน & เชื่อมต่อ LINE</h1>
        <p className="text-xs text-slate-500 mt-1">
          จัดการชื่อหมู่บ้าน, ที่อยู่ และเชื่อมต่อกุญแจ API จาก LINE Developers เพื่อเปิดระบบ LIFF และการส่งแจ้งเตือนบิล
        </p>
      </div>

      {/* Notification Message */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <span>{message.type === "success" ? "✓" : "⚠️"}</span>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Community Profile */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <h2 className="text-base font-bold text-slate-800 font-display flex items-center gap-2 border-b border-slate-100 pb-3">
            <span>🏘️</span> ข้อมูลทั่วไปของชุมชน
          </h2>

          {/* Field: Community Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ชื่อหมู่บ้าน / ชุมชน <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น บ้านดงคงสุข, บ้านหนองหว้าสุขใจ"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            />
            <p className="text-[11px] text-slate-400">
              ชื่อนี้จะแสดงที่มุมซ้ายบนของเมนู และแสดงในใบแจ้งหนี้ของลูกบ้านทุกคน
            </p>
          </div>

          {/* Field: Community Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ที่ตั้ง / ตำบล / อำเภอ / จังหวัด
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="เช่น หมู่ 4 ต.ดงคงสุข อ.เมือง จ.ขอนแก่น 40000"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Card 2: LINE Developers Integration */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
              <span className="text-emerald-500">🟢</span> การตั้งค่าเชื่อมต่อ LINE Developers
            </h2>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {lineLiffId ? "เชื่อมต่อแล้ว" : "ยังไม่ได้เชื่อมต่อ"}
            </span>
          </div>

          {/* Field: LIFF ID */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700">
                LIFF ID (สำหรับเปิดแอปใน LINE)
              </label>
              <span className="text-[10px] text-slate-400">จาก LINE Login ➔ แท็บ LIFF</span>
            </div>
            <input
              type="text"
              value={lineLiffId}
              onChange={(e) => setLineLiffId(e.target.value)}
              placeholder="เช่น 2001234567-AbCdEfGh"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-slate-400">
              นำ LIFF ID ที่ได้จาก LINE Developers Console มาวางที่นี่ได้โดยตรง
            </p>
          </div>

          {/* Field: Channel Access Token */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700">
                LINE Messaging Channel Access Token (สำหรับส่งแจ้งเตือนบิล)
              </label>
              <span className="text-[10px] text-slate-400">จาก Messaging API ➔ Token</span>
            </div>
            <textarea
              rows={3}
              value={lineChannelAccessToken}
              onChange={(e) => setLineChannelAccessToken(e.target.value)}
              placeholder="วาง Channel Access Token แบบ Long-lived ยาว ๆ ที่ได้จาก LINE Developers"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Field: Channel Secret */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Channel Secret
              </label>
              <input
                type="text"
                value={lineChannelSecret}
                onChange={(e) => setLineChannelSecret(e.target.value)}
                placeholder="เช่น a1b2c3d4e5f6..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* Field: LINE OA ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                LINE Official Account ID (ถ้ามี)
              </label>
              <input
                type="text"
                value={lineChannelId}
                onChange={(e) => setLineChannelId(e.target.value)}
                placeholder="เช่น @thaibann_dong"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary-light text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? "กำลังบันทึกข้อมูล..." : "💾 บันทึกการเปลี่ยนแปลงทั้งหมด"}
          </button>
        </div>
      </form>
    </div>
  );
}
