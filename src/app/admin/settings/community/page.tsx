"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

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

  // Staff Management State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffMessage, setStaffMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Staff State
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"committee" | "community_admin">("committee");
  const [addStaffLoading, setAddStaffLoading] = useState(false);

  useEffect(() => {
    fetchCommunityData();
    fetchStaffData();
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

  const fetchStaffData = async () => {
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (res.ok && data.staff) {
        setStaffList(data.staff);
      }
    } catch (err) {
      console.error("Fetch staff failed", err);
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

  const startEditStaff = (staff: StaffMember) => {
    setEditingStaffId(staff.id);
    setEditName(staff.full_name);
    setEditPhone(staff.phone || "");
    setEditPassword("");
    setStaffMessage(null);
  };

  const handleSaveStaff = async (staffId: string) => {
    setStaffSaving(true);
    setStaffMessage(null);

    try {
      const body: any = { staffId };
      if (editName.trim()) body.fullName = editName.trim();
      if (editPhone.trim()) body.phone = editPhone.trim();
      if (editPassword.trim()) {
        if (editPassword.trim().length < 6) {
          throw new Error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        }
        body.newPassword = editPassword.trim();
      }

      const res = await fetch("/api/admin/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกข้อมูลกรรมการไม่สำเร็จ");

      setStaffMessage({ type: "success", text: "อัปเดตข้อมูลและรหัสผ่านกรรมการเรียบร้อยแล้ว!" });
      setEditingStaffId(null);
      setEditPassword("");
      fetchStaffData();
    } catch (err: any) {
      setStaffMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
    } finally {
      setStaffSaving(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setStaffMessage({ type: "error", text: "กรุณากรอกชื่อ-นามสกุล, อีเมล และรหัสผ่าน" });
      return;
    }
    if (newPassword.trim().length < 6) {
      setStaffMessage({ type: "error", text: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
      return;
    }

    setAddStaffLoading(true);
    setStaffMessage(null);

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newFullName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || null,
          password: newPassword.trim(),
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เพิ่มกรรมการไม่สำเร็จ");

      setStaffMessage({ type: "success", text: "เพิ่มกรรมการใหม่เข้าสู่ระบบเรียบร้อยแล้ว!" });
      setIsAddingStaff(false);
      setNewFullName("");
      setNewEmail("");
      setNewPhone("");
      setNewPassword("");
      setNewRole("committee");
      fetchStaffData();
    } catch (err: any) {
      setStaffMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการเพิ่มกรรมการ" });
    } finally {
      setAddStaffLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">กำลังโหลดข้อมูลการตั้งค่าชุมชน...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 font-display">
          ตั้งค่าข้อมูลชุมชน & LINE OA
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          กำหนดชื่อหมู่บ้าน ที่อยู่ และข้อมูลเชื่อมต่อ LINE Messaging API สำหรับแจ้งเตือนลูกบ้าน
        </p>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-base font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
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
            {saving ? "กำลังบันทึกข้อมูล..." : "💾 บันทึกการเปลี่ยนแปลงชุมชน & LINE"}
          </button>
        </div>
      </form>

      {/* Card 3: Staff Management & Password Reset */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
              <span>👥</span> บัญชีกรรมการ & การจัดการรหัสผ่าน
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              รายชื่อกรรมการในชุมชน สามารถเพิ่มกรรมการใหม่ แก้ไขข้อมูล หรือตั้งรหัสผ่านใหม่ได้
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
              {staffList.length} บัญชี
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAddingStaff(!isAddingStaff);
                setStaffMessage(null);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
            >
              {isAddingStaff ? "✕ ปิดฟอร์ม" : "+ เพิ่มกรรมการใหม่"}
            </button>
          </div>
        </div>

        {staffMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium border flex items-center justify-between ${
              staffMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span>{staffMessage.text}</span>
            <button
              onClick={() => setStaffMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Add New Staff Form */}
        {isAddingStaff && (
          <form onSubmit={handleCreateStaff} className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2.5">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <span>➕</span> กรอกข้อมูลกรรมการท่านใหม่
              </span>
              <button
                type="button"
                onClick={() => setIsAddingStaff(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="เช่น นายสมใจ มีชัย"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  อีเมล (สำหรับใช้ล็อกอิน) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ (สำหรับกู้รหัสผ่าน)
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="08xxxxxxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  รหัสผ่านเริ่มต้น <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="•••••••• (อย่างน้อย 6 ตัวอักษร)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  บทบาทหน้าที่
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="committee">กรรมการทั่วไป</option>
                  <option value="community_admin">ผู้ดูแลหลัก (Admin)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingStaff(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={addStaffLoading}
                className="px-5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {addStaffLoading ? "กำลังบันทึก..." : "💾 บันทึกและสร้างบัญชี"}
              </button>
            </div>
          </form>
        )}

        {/* Staff List */}
        <div className="divide-y divide-slate-100">
          {staffList.map((staff) => {
            const isEditing = editingStaffId === staff.id;

            return (
              <div key={staff.id} className="py-4 first:pt-0 last:pb-0">
                {!isEditing ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {staff.full_name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            staff.role === "admin" || staff.role === "community_admin"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {staff.role === "admin" || staff.role === "community_admin"
                            ? "ผู้ดูแลหลัก"
                            : "กรรมการ"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                        <span>📧 {staff.email}</span>
                        <span>📱 {staff.phone || "ยังไม่ระบุเบอร์"}</span>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => startEditStaff(staff)}
                        className="px-3.5 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        🔑 เปลี่ยนรหัสผ่าน / แก้ไข
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Edit Form */
                  <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">
                        แก้ไขข้อมูล: {staff.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingStaffId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          ชื่อ-นามสกุล
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          เบอร์โทรศัพท์
                        </label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="08xxxxxxxx"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        รหัสผ่านใหม่ (กรอกหากต้องการเปลี่ยน, อย่างน้อย 6 ตัวอักษร)
                      </label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="•••••••• (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน)"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingStaffId(null)}
                        disabled={staffSaving}
                        className="px-3 py-1.5 text-xs text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveStaff(staff.id)}
                        disabled={staffSaving}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-light rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        {staffSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
