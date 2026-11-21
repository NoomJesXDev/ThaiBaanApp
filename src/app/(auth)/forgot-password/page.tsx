"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === "phone") {
      if (newPassword !== confirmPassword) {
        setError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
        return;
      }
      if (newPassword.length < 6) {
        setError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
      }
    }

    setLoading(true);

    try {
      const payload =
        mode === "email"
          ? { mode: "email", email }
          : { mode: "phone", email, phone, newPassword };

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการดำเนินการ");

      setSuccessMessage(
        data.message ||
          (mode === "email"
            ? "ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย"
            : "ตั้งรหัสผ่านใหม่สำเร็จแล้ว")
      );

      if (mode === "phone") {
        setTimeout(() => {
          window.location.href = "/login";
        }, 2500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดำเนินการ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold font-display text-slate-800">
          ลืมรหัสผ่าน / ตั้งรหัสผ่านใหม่
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {mode === "email"
            ? "กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล (ใช้งานได้ภายใน 15 นาที)"
            : "ยืนยันตัวตนด้วยอีเมลและเบอร์โทรศัพท์ที่บันทึกไว้ในระบบ"}
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            setMode("email");
            setError(null);
            setSuccessMessage(null);
          }}
          className={`py-2 rounded-lg transition-all cursor-pointer ${
            mode === "email"
              ? "bg-white text-primary shadow-sm font-semibold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          📧 รับลิงก์ทางอีเมล
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("phone");
            setError(null);
            setSuccessMessage(null);
          }}
          className={`py-2 rounded-lg transition-all cursor-pointer ${
            mode === "phone"
              ? "bg-white text-primary shadow-sm font-semibold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          📱 ยืนยันด้วยเบอร์โทร
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage ? (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl text-center space-y-3">
          <div className="text-3xl">{mode === "email" ? "✉️" : "✅"}</div>
          <p className="text-sm font-semibold text-emerald-800">{successMessage}</p>
          {mode === "email" ? (
            <p className="text-xs text-emerald-700">
              หากไม่พบอีเมลในกล่องจดหมาย กรุณาตรวจสอบในโฟลเดอร์อีเมลขยะ (Spam / Junk)
            </p>
          ) : (
            <p className="text-xs text-emerald-700">กำลังพากลับไปยังหน้าเข้าสู่ระบบ...</p>
          )}
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block text-xs font-semibold text-primary hover:underline"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              อีเมล (Email)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="committee@example.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-slate-800"
            />
          </div>

          {mode === "phone" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  เบอร์โทรศัพท์ที่ลงทะเบียนไว้
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  รหัสผ่านใหม่ (New Password)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ยืนยันรหัสผ่านใหม่ (Confirm Password)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-slate-800"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? "กำลังดำเนินการ..."
              : mode === "email"
              ? "ส่งลิงก์รีเซ็ตรหัสผ่านทางอีเมล"
              : "บันทึกรหัสผ่านใหม่"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-600 mt-4">
        จำรหัสผ่านได้แล้ว?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          กลับไปเข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
