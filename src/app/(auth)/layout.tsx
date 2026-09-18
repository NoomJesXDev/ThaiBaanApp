import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary font-display mb-2">
          CommuneX
        </h1>
        <p className="text-sm text-slate-500 font-sans">
          ระบบบริหารจัดการสาธารณูปโภคและบัญชีชุมชนอัจฉริยะ
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-xl sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
