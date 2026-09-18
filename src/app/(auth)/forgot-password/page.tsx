"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่");

      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2500);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-display text-slate-800">
          ตั้งรหัสผ่านใหม่
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          ยืนยันตัวตนด้วยอีเมลและเบอร์โทรศัพท์ที่บันทึกไว้ในระบบ
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-sm text-emerald-800 font-medium">
          ✅ เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว! กำลังนำท่านไปยังหน้าเข้าสู่ระบบ...
        </div>
      )}

      {!success && (
        <form className="space-y-4" onSubmit={handleResetPassword}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              อีเมล (Email)
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              เบอร์โทรศัพท์ที่ลงทะเบียนไว้
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="08xxxxxxxx"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              รหัสผ่านใหม่ (New Password)
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="•••••••• (อย่างน้อย 6 ตัวอักษร)"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              ยืนยันรหัสผ่านใหม่ (Confirm Password)
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? "กำลังบันทึกข้อมูล..." : "บันทึกรหัสผ่านใหม่"}
            </button>
          </div>
        </form>
      )}

      <div className="text-center text-sm text-slate-500 mt-4">
        จำรหัสผ่านได้แล้ว?{" "}
        <Link
          href="/login"
          className="text-primary hover:underline font-semibold"
        >
          กลับไปเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
