"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("ไม่พบโทเค็นสำหรับรีเซ็ตรหัสผ่าน กรุณาเปิดลิงก์จากอีเมลใหม่อีกครั้ง");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (newPassword.length < 6) {
      setError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่สามารถตั้งรหัสผ่านใหม่ได้");

      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-display text-slate-800">
          กำหนดรหัสผ่านใหม่
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          กรุณากรอกรหัสผ่านใหม่ที่คุณต้องการใช้งาน
        </p>
      </div>

      {!token && !success && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-sm text-amber-800">
          ลิงก์ไม่สมบูรณ์ กรุณากดลิงก์จากอีเมลใหม่อีกครั้ง หรือ{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            ขอลิงก์รีเซ็ตใหม่
          </Link>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl text-center space-y-2">
          <div className="text-3xl">✅</div>
          <p className="text-sm font-semibold text-emerald-800">
            ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว!
          </p>
          <p className="text-xs text-emerald-700">
            กำลังพากลับไปยังหน้าเข้าสู่ระบบ...
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
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

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 bg-primary hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "กำลังบันทึก..." : "ยืนยันรหัสผ่านใหม่"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-600 mt-4">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-sm text-slate-400">กำลังโหลด...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
