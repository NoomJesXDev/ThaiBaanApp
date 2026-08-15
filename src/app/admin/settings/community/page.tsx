"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CommunitySettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lineChannelId, setLineChannelId] = useState("");
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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      setMessage({ type: "success", text: "บันทึกข้อมูลชื่อหมู่บ้านและชุมชนเรียบร้อยแล้ว!" });
      // Refresh router so layout re-renders with new community name
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
          <p className="text-xs text-slate-400">กำลังโหลดข้อมูลชุมชน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-display">🏢 ตั้งค่าข้อมูลหมู่บ้าน/ชุมชน</h1>
        <p className="text-xs text-slate-500 mt-1">
          แก้ไขชื่อหมู่บ้าน, ที่อยู่ และข้อมูลพื้นฐานสำหรับแสดงผลในระบบและหัวบิลเรียกเก็บเงิน
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

      {/* Form Card */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
        <form onSubmit={handleSave} className="space-y-5">
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
              ชื่อนี้จะปรากฏที่มุมซ้ายบนของเมนู และแสดงในใบแจ้งหนี้ของลูกบ้านทุกคน
            </p>
          </div>

          {/* Field: Community Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ที่ตั้ง / ตำบล / อำเภอ / จังหวัด
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="เช่น หมู่ 4 ต.ดงคงสุข อ.เมือง จ.ขอนแก่น 40000"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            />
          </div>

          {/* Field: Optional LINE Official Channel ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              LINE Official Account ID (ถ้ามี)
            </label>
            <input
              type="text"
              value={lineChannelId}
              onChange={(e) => setLineChannelId(e.target.value)}
              placeholder="เช่น @thaibann_dong"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            />
          </div>

          {/* Action Button */}
          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? "กำลังบันทึก..." : "💾 บันทึกการเปลี่ยนแปลง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
