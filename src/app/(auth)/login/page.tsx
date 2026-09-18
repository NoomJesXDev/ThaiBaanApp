"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRoute = searchParams.get("next") || "/admin/billing";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");

      window.location.href = nextRoute;
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  const handleLineLogin = () => {
    alert("ระบบล็อกอินด้วย LINE กำลังเตรียมการใช้งาน กรุณาใช้บัญชีอีเมลทดสอบ");
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-display text-slate-800">
          เข้าสู่ระบบ (สำหรับกรรมการ)
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleLogin}>
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
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            รหัสผ่าน (Password)
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            placeholder="••••••••"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? "กำลังโหลด..." : "เข้าสู่ระบบ"}
          </button>
        </div>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-slate-400">หรือเข้าด้วยช่องทางอื่น</span>
        </div>
      </div>

      <div>
        <button
          onClick={handleLineLogin}
          type="button"
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#06C755] hover:bg-[#05b34c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#06C755] transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 mr-2 fill-current" viewBox="0 0 24 24">
            <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.586.39.084.922.258 1.057.592.12.3.077.769.038 1.072l-.164 1.02c-.049.304-.24 1.19 1.037.65 1.277-.54 6.892-4.062 9.404-6.953 1.848-1.921 2.63-3.834 2.63-5.967zm-15.617 3.52c0 .414-.336.75-.75.75h-2.25v-5.25c0-.414-.336-.75-.75-.75s-.75.336-.75.75v6c0 .414.336.75.75.75h3c.414 0 .75-.336.75-.75s-.336-.75-.75-.75zm2.25.75c.414 0 .75-.336.75-.75v-6c0-.414-.336-.75-.75-.75s-.75.336-.75.75v6c0 .414.336.75.75.75zm5.795-6c-.347-.384-.817-.52-1.395-.52h-2.033v6h.75c.414 0 .75-.336.75-.75v-1.5h.533c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-.533v-1.5h1.283c.311 0 .524-.078.647-.214.12-.132.18-.344.18-.624 0-.294-.061-.508-.182-.642zm3.322 2.25h-1.5v-1.5h1.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-2.25c-.414 0-.75.336-.75.75v4.5c0 .414.336.75.75.75h2.25c.414 0 .75-.336.75-.75s-.336-.75-.75-.75z" />
          </svg>
          เข้าสู่ระบบด้วย LINE
        </button>
      </div>

      <div className="text-center text-sm text-slate-500 mt-4">
        ยังไม่มีบัญชีกรรมการ?{" "}
        <Link
          href="/register"
          className="text-primary hover:underline font-semibold"
        >
          ลงทะเบียนที่นี่
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
